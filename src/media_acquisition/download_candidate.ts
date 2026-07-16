import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import {
  absolutePath,
  loadMediaSourcesConfig,
  relativePath,
  writeBufferExclusive,
  type AcquisitionContext,
  type DownloadResult,
  type MediaType,
  type RightsDecision,
  type ShotSearchTask,
  type SourceCandidate,
} from "./types.ts";

type JsonRecord = Record<string, unknown>;

function domainMatches(hostname: string, allowed: string): boolean {
  const host = hostname.toLowerCase();
  const suffix = allowed.toLowerCase();
  return host === suffix || host.endsWith(`.${suffix}`);
}

function isSigned(url: URL, signedKeys: string[]): boolean {
  return [...url.searchParams.keys()].some((key) => signedKeys.includes(key.toLowerCase()));
}

function mediaTypeFromExtension(extension: string): MediaType {
  const value = extension.replace(/^\./, "").toLowerCase();
  if (["jpg", "jpeg", "png", "webp", "tif", "tiff"].includes(value)) return "image";
  if (["mp4", "mov", "m4v", "webm"].includes(value)) return "video";
  if (["pdf", "csv", "json", "yaml", "yml"].includes(value)) return "data";
  return "unknown";
}

function mediaTypeFromContentType(contentType: string): MediaType {
  if (contentType.startsWith("image/")) return "image";
  if (contentType.startsWith("video/")) return "video";
  if (/application\/(?:pdf|json)|text\/csv/.test(contentType)) return "data";
  return "unknown";
}

function extensionFromContent(contentType: string, url: URL, buffer: Uint8Array): string | null {
  const requested = extname(url.pathname).slice(1).toLowerCase();
  if (["jpg", "jpeg", "png", "webp", "tif", "tiff", "mp4", "mov", "m4v", "webm", "pdf", "csv", "json", "yaml", "yml"].includes(requested)) {
    return requested === "jpeg" ? "jpg" : requested;
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return "jpg";
  if (buffer.length >= 8 && Buffer.from(buffer.slice(0, 8)).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (Buffer.from(buffer.slice(0, 4)).toString("ascii") === "RIFF" && Buffer.from(buffer.slice(8, 12)).toString("ascii") === "WEBP") return "webp";
  if (Buffer.from(buffer.slice(4, 8)).toString("ascii") === "ftyp") return contentType.includes("quicktime") ? "mov" : "mp4";
  if (Buffer.from(buffer.slice(0, 4)).toString("hex") === "1a45dfa3") return "webm";
  if (Buffer.from(buffer.slice(0, 4)).toString("ascii") === "%PDF") return "pdf";
  return null;
}

function matchesMagic(extension: string, buffer: Uint8Array): boolean {
  if (extension === "jpg") return buffer[0] === 0xff && buffer[1] === 0xd8;
  if (extension === "png") return Buffer.from(buffer.slice(0, 8)).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (extension === "webp") return Buffer.from(buffer.slice(0, 4)).toString("ascii") === "RIFF" && Buffer.from(buffer.slice(8, 12)).toString("ascii") === "WEBP";
  if (["mp4", "mov", "m4v"].includes(extension)) return Buffer.from(buffer.slice(4, 8)).toString("ascii") === "ftyp";
  if (extension === "webm") return Buffer.from(buffer.slice(0, 4)).toString("hex") === "1a45dfa3";
  if (extension === "pdf") return Buffer.from(buffer.slice(0, 4)).toString("ascii") === "%PDF";
  if (["csv", "json", "yaml", "yml", "tif", "tiff"].includes(extension)) return true;
  return false;
}

function normalizeUrl(value: string): string {
  const url = new URL(value);
  url.hash = "";
  url.hostname = url.hostname.toLowerCase();
  return url.toString();
}

function loadCache(): JsonRecord[] {
  const path = absolutePath("database/asset_cache.json");
  if (!existsSync(path)) return [];
  const parsed = JSON.parse(readFileSync(path, "utf8")) as JsonRecord;
  return Array.isArray(parsed.records) ? parsed.records.filter((item): item is JsonRecord => typeof item === "object" && item !== null) : [];
}

function cacheByUrl(url: string): JsonRecord | null {
  const normalized = normalizeUrl(url);
  return loadCache().find((record) => record.normalized_source_url === normalized && typeof record.local_path === "string" && existsSync(absolutePath(record.local_path))) ?? null;
}

function cacheBySha(sha256: string): JsonRecord | null {
  return loadCache().find((record) => record.sha256 === sha256 && typeof record.local_path === "string" && existsSync(absolutePath(record.local_path))) ?? null;
}

function taskFor(source: SourceCandidate, tasks: ShotSearchTask[]): ShotSearchTask | null {
  return tasks.find((task) => source.requestIds.includes(task.requestId)) ?? null;
}

function sceneFor(task: ShotSearchTask): string {
  const text = `${task.purpose} ${task.requiredContent}`.toLowerCase();
  if (/内饰|座舱|方向盘|中控|地板|滑轨|seat|interior|cabin/.test(text)) return "interior";
  if (/工厂|制造|装配|工程|验证|factory|manufactur|assembly/.test(text)) return "factory";
  if (/发布会|亮相|launch|event/.test(text)) return "launch";
  if (/行驶|驾驶|动态|跟车|道路|driving|road|motion/.test(text)) return "driving";
  if (/logo|标识/.test(text)) return "logo";
  return "exterior";
}

function vehicleSlug(vehicle: string): string {
  if (/skynomad|澎程/i.test(vehicle)) return "skynomad";
  const normalized = vehicle.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  return normalized || "vehicle";
}

function nextFilePath(context: AcquisitionContext, task: ShotSearchTask, extension: string): string {
  const scene = sceneFor(task);
  const directory = absolutePath(join("assets", "brands", context.brandKey, scene));
  for (let index = 1; index <= 999; index += 1) {
    const filename = `${context.brandKey}_${vehicleSlug(context.vehicle)}_${scene}_${String(index).padStart(3, "0")}.${extension}`;
    const path = join(directory, filename);
    if (!existsSync(path)) return path;
  }
  throw new Error(`无法为 ${scene} 分配不覆盖现有文件的编号`);
}

async function safeFetchFile(initial: URL, context: AcquisitionContext): Promise<{ response: Response; finalUrl: URL }> {
  const config = loadMediaSourcesConfig();
  const brand = config.brands[context.brandKey];
  let current = initial;
  for (let count = 0; count <= config.policy.maxRedirects; count += 1) {
    const response = await fetch(current, { redirect: "manual", signal: AbortSignal.timeout(config.policy.requestTimeoutMs) });
    if (![301, 302, 303, 307, 308].includes(response.status)) return { response, finalUrl: current };
    const location = response.headers.get("location");
    if (!location) return { response, finalUrl: current };
    const next = new URL(location, current);
    if (!config.policy.allowedProtocols.includes(next.protocol)
      || !brand.allowedDomains.some((domain) => domainMatches(next.hostname, domain))
      || isSigned(next, config.policy.signedQueryKeys)) {
      throw new Error(`下载重定向到不允许或临时签名 URL：${next.toString()}`);
    }
    current = next;
  }
  throw new Error("下载重定向次数超过上限");
}

function baseResult(source: SourceCandidate, task: ShotSearchTask | null): DownloadResult {
  return {
    sourceId: source.sourceId,
    requestIds: source.requestIds,
    shotIds: source.shotIds,
    downloadUrl: source.downloadUrl,
    status: "skipped",
    localPath: null,
    fileName: null,
    mediaType: task?.requiredMediaType ?? "unknown",
    bytes: null,
    sha256: null,
    httpStatus: null,
    reason: "",
    accessedAt: new Date().toISOString(),
  };
}

export async function downloadCandidate(
  context: AcquisitionContext,
  source: SourceCandidate,
  rights: RightsDecision,
): Promise<DownloadResult> {
  const config = loadMediaSourcesConfig();
  const brand = config.brands[context.brandKey];
  const task = taskFor(source, context.tasks);
  const result = baseResult(source, task);
  if (!task) {
    result.reason = "来源没有对应的 Asset Request 搜索任务";
    return result;
  }
  if (rights.licenseStatus === "prohibited") {
    result.status = "blocked";
    result.reason = "版权或访问规则明确禁止";
    return result;
  }
  if (!source.downloadUrl || !source.explicitDownloadEntry) {
    result.reason = "实际来源页没有明确合法下载入口";
    return result;
  }
  if (rights.licenseStatus === "unverified" && !config.policy.downloadUnverifiedCandidates) {
    result.status = "blocked";
    result.reason = "配置禁止下载授权未核实候选";
    return result;
  }
  const url = new URL(source.downloadUrl);
  const extension = extname(url.pathname).slice(1).toLowerCase();
  if (!config.policy.allowedProtocols.includes(url.protocol)
    || !brand.allowedDomains.some((domain) => domainMatches(url.hostname, domain))
    || isSigned(url, config.policy.signedQueryKeys)
    || config.policy.forbiddenMediaExtensions.includes(extension)) {
    result.status = "blocked";
    result.reason = "下载 URL 不符合允许域名、协议或无签名/非流媒体限制";
    return result;
  }
  const cachedUrl = cacheByUrl(source.downloadUrl) ?? cacheByUrl(source.sourceUrl);
  if (cachedUrl) {
    result.status = "reused_duplicate";
    result.localPath = String(cachedUrl.local_path);
    result.fileName = basename(result.localPath);
    result.bytes = typeof cachedUrl.file_size_bytes === "number" ? cachedUrl.file_size_bytes : null;
    result.sha256 = typeof cachedUrl.sha256 === "string" ? cachedUrl.sha256 : null;
    result.reason = "规范化来源 URL 已存在，复用缓存，不重复下载";
    return result;
  }
  try {
    const fetched = await safeFetchFile(url, context);
    result.httpStatus = fetched.response.status;
    if (fetched.response.status === 401 || fetched.response.status === 403) {
      result.status = "blocked";
      result.reason = `HTTP ${fetched.response.status}，禁止绕过`;
      return result;
    }
    if (!fetched.response.ok) {
      result.status = "failed";
      result.reason = `HTTP ${fetched.response.status}`;
      return result;
    }
    const contentLength = Number(fetched.response.headers.get("content-length") ?? "0");
    if (Number.isFinite(contentLength) && contentLength > config.policy.maxDownloadBytes) {
      result.status = "blocked";
      result.reason = `文件超过 ${config.policy.maxDownloadBytes} 字节安全上限`;
      return result;
    }
    const contentType = (fetched.response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    const buffer = new Uint8Array(await fetched.response.arrayBuffer());
    if (buffer.byteLength > config.policy.maxDownloadBytes) {
      result.status = "blocked";
      result.reason = `实际文件超过 ${config.policy.maxDownloadBytes} 字节安全上限`;
      return result;
    }
    const realExtension = extensionFromContent(contentType, fetched.finalUrl, buffer);
    if (!realExtension || !matchesMagic(realExtension, buffer)) {
      result.status = "failed";
      result.reason = "文件扩展名、Content-Type 或魔数不一致";
      return result;
    }
    const actualType = mediaTypeFromExtension(realExtension) === "unknown" ? mediaTypeFromContentType(contentType) : mediaTypeFromExtension(realExtension);
    if (actualType !== task.requiredMediaType && !(task.requiredMediaType === "logo" && actualType === "image")) {
      result.status = "blocked";
      result.reason = `文件类型 ${actualType} 与 Asset Request 要求 ${task.requiredMediaType} 不一致`;
      return result;
    }
    const sha256 = createHash("sha256").update(buffer).digest("hex");
    const cachedSha = cacheBySha(sha256);
    if (cachedSha) {
      result.status = "reused_duplicate";
      result.localPath = String(cachedSha.local_path);
      result.fileName = basename(result.localPath);
      result.bytes = buffer.byteLength;
      result.sha256 = sha256;
      result.mediaType = actualType;
      result.reason = "SHA-256 已存在，复用缓存，不创建副本";
      return result;
    }
    const outputPath = nextFilePath(context, task, realExtension);
    writeBufferExclusive(outputPath, buffer);
    result.status = "downloaded";
    result.localPath = relativePath(outputPath);
    result.fileName = basename(outputPath);
    result.bytes = buffer.byteLength;
    result.sha256 = sha256;
    result.mediaType = actualType;
    result.reason = rights.licenseStatus === "unverified"
      ? "下载入口合法，但授权用途未确认；文件必须 quarantined"
      : "下载入口、文件类型和完整性检查通过";
    return result;
  } catch (error) {
    result.status = "failed";
    result.reason = error instanceof Error ? error.message : String(error);
    return result;
  }
}

export async function downloadAllCandidates(
  context: AcquisitionContext,
  sources: SourceCandidate[],
  rights: RightsDecision[],
): Promise<DownloadResult[]> {
  const rightsMap = new Map(rights.map((item) => [item.sourceId, item]));
  const results: DownloadResult[] = [];
  for (const source of sources) {
    const decision = rightsMap.get(source.sourceId);
    if (!decision) throw new Error(`来源缺少版权分类：${source.sourceId}`);
    results.push(await downloadCandidate(context, source, decision));
  }
  return results;
}
