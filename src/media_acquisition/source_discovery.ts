import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { asRecord, type YamlValue } from "../../scripts/lib/yaml.ts";
import {
  absolutePath,
  loadMediaSourcesConfig,
  loadYamlRecord,
  relativePath,
  stableId,
  type AcquisitionContext,
  type BrandSourceConfig,
  type DiscoveryStatus,
  type MediaSourcesConfig,
  type MediaType,
  type ShotSearchTask,
  type SourceCandidate,
  type SourceType,
  yamlArray,
  yamlRecord,
} from "./types.ts";

const DIRECT_MEDIA_EXTENSIONS: Record<string, MediaType> = {
  jpg: "image",
  jpeg: "image",
  png: "image",
  webp: "image",
  tif: "image",
  tiff: "image",
  mp4: "video",
  mov: "video",
  m4v: "video",
  webm: "video",
  pdf: "data",
  csv: "data",
  json: "data",
  yaml: "data",
  yml: "data",
};

function scalarString(value: YamlValue | undefined, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function scalarNumberOrString(value: YamlValue | undefined): number | string | null {
  return typeof value === "number" || typeof value === "string" ? value : null;
}

function normalizeMediaType(value: string): MediaType {
  const lowered = value.toLowerCase();
  if (lowered.includes("video")) return "video";
  if (lowered.includes("image") || lowered.includes("photo") || lowered.includes("still")) return "image";
  if (lowered.includes("logo")) return "logo";
  if (lowered.includes("data") || lowered.includes("programmatic")) return "data";
  return "unknown";
}

function tokenize(...values: string[]): string[] {
  return [...new Set(values.flatMap((value) => value
    .replace(/[，。；：、（）()\/]/g, " ")
    .split(/\s+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2)))]
    .slice(0, 24);
}

function inferBrandKey(owner: string, vehicle: string, config: MediaSourcesConfig): string {
  const haystack = `${owner} ${vehicle}`.toLowerCase();
  for (const [key, brand] of Object.entries(config.brands)) {
    if (haystack.includes(key.toLowerCase())) return key;
    if (brand.aliases.some((alias) => haystack.includes(alias.toLowerCase()))) return key;
  }
  return Object.keys(config.brands)[0] ?? "unknown";
}

interface ApprovalEvidence {
  approved: boolean;
  recordPath: string | null;
  storyboardPath: string | null;
  scriptPath: string | null;
  factCheckPath: string | null;
}

function fileSha256(path: string): string {
  return createHash("sha256").update(readFileSync(absolutePath(path))).digest("hex");
}

function findApproval(jobId: string, assetRequestPath: string): ApprovalEvidence {
  const reviewDir = absolutePath(join("output", jobId, "review"));
  if (!existsSync(reviewDir)) return { approved: false, recordPath: null, storyboardPath: null, scriptPath: null, factCheckPath: null };
  const candidates = readdirSync(reviewDir)
    .filter((name) => /^human_approval_decision.*\.ya?ml$/i.test(name))
    .sort()
    .reverse()
    .map((name) => join(reviewDir, name));
  for (const candidate of candidates) {
    try {
      const root = loadYamlRecord(relativePath(candidate));
      const approval = yamlRecord(root.human_approval, "human_approval");
      const decisions = yamlRecord(approval.decisions, "human_approval.decisions");
      const inputs = yamlRecord(approval.approved_inputs, "human_approval.approved_inputs");
      const assetInput = yamlRecord(inputs.asset_request, "approved_inputs.asset_request");
      const approvedPath = scalarString(assetInput.path);
      const approvedSha = scalarString(assetInput.sha256);
      if (approvedPath !== assetRequestPath || !existsSync(absolutePath(approvedPath))) continue;
      if (!approvedSha || fileSha256(approvedPath) !== approvedSha) continue;
      const decisionApproved = Object.entries(decisions).some(([key, value]) => key.startsWith("asset_request") && value === "approved");
      const upstreamApproved = ["fact_check", "script", "storyboard", "storyboard_previews"].every((key) => decisions[key] === "approved");
      if (!decisionApproved || !upstreamApproved || scalarString(approval.status) !== "approved_for_asset_acquisition") continue;
      const storyboard = yamlRecord(inputs.storyboard, "approved_inputs.storyboard");
      const script = yamlRecord(inputs.script, "approved_inputs.script");
      const factCheck = yamlRecord(inputs.fact_check, "approved_inputs.fact_check");
      for (const [label, input] of [["storyboard", storyboard], ["script", script], ["fact_check", factCheck]] as const) {
        const path = scalarString(input.path);
        const sha = scalarString(input.sha256);
        if (!path || !sha || !existsSync(absolutePath(path)) || fileSha256(path) !== sha) {
          throw new Error(`批准记录中的 ${label} 路径或 SHA-256 无效`);
        }
      }
      return {
        approved: true,
        recordPath: relativePath(candidate),
        storyboardPath: scalarString(storyboard.path) || null,
        scriptPath: scalarString(script.path) || null,
        factCheckPath: scalarString(factCheck.path) || null,
      };
    } catch {
      continue;
    }
  }
  return { approved: false, recordPath: null, storyboardPath: null, scriptPath: null, factCheckPath: null };
}

function inferVehicle(assetRequest: Record<string, YamlValue>): string {
  const explicit = scalarString(assetRequest.vehicle);
  if (explicit) return explicit;
  const serialized = JSON.stringify(assetRequest);
  if (/skynomad/i.test(serialized) || /澎程/.test(serialized)) return "Xiaomi SkyNomad / 小米澎程";
  return "unknown";
}

function requestToTask(raw: YamlValue, brand: string, vehicle: string): ShotSearchTask | null {
  const request = asRecord(raw, "asset_request_package.requests[]");
  const status = scalarString(request.status);
  if (status.includes("not_in_acquisition_scope")) return null;
  const source = yamlRecord(request.source, "request.source");
  const technical = yamlRecord(request.technical_requirements, "request.technical_requirements");
  const requiredMediaType = normalizeMediaType(scalarString(technical.media_type, scalarString(request.asset_type)));
  if (requiredMediaType === "data") return null;
  const requestId = scalarString(request.request_id);
  const shotIds = yamlArray(request.shot_ids, "request.shot_ids").filter((item): item is string => typeof item === "string");
  const purpose = scalarString(request.purpose) || scalarString(request.required_visual_intent);
  const requiredContent = scalarString(request.required_content)
    || scalarString(request.preferred_static_image)
    || scalarString(request.required_visual_intent);
  const candidateUrl = scalarString(source.candidate_url);
  const topLevelVerifiedData = yamlArray(request.verified_data_ids, "request.verified_data_ids")
    .filter((item): item is string => typeof item === "string");
  const sourceVerifiedData = yamlArray(source.verified_data_ids, "source.verified_data_ids")
    .filter((item): item is string => typeof item === "string");
  return {
    requestId,
    shotId: shotIds[0] ?? "unknown_shot",
    durationSeconds: typeof request.duration_seconds === "number" ? request.duration_seconds : 0,
    brand,
    vehicle,
    requiredScene: requiredContent || purpose,
    requiredMediaType,
    keywords: tokenize(brand, vehicle, purpose, requiredContent),
    purpose,
    requiredContent,
    verifiedDataReferences: [...new Set([...topLevelVerifiedData, ...sourceVerifiedData])],
    allowedSourceTiers: ["A", "B"],
    candidateUrls: candidateUrl ? [candidateUrl] : [],
  };
}

export function buildAcquisitionContext(assetRequestPath: string, outputDir?: string): AcquisitionContext {
  const config = loadMediaSourcesConfig();
  const root = loadYamlRecord(assetRequestPath);
  const packageRecord = yamlRecord(root.asset_request_package ?? root.request, `${assetRequestPath}.asset_request_package`);
  const jobId = scalarString(packageRecord.job_id);
  if (!jobId) throw new Error("Asset Request 缺少 job_id");
  const requests = yamlArray(packageRecord.requests, "asset_request_package.requests");
  const firstSource = requests.length > 0 ? yamlRecord(asRecord(requests[0], "requests[0]").source, "requests[0].source") : {};
  const owner = scalarString(firstSource.owner);
  const vehicle = inferVehicle(packageRecord);
  const brandKey = inferBrandKey(owner, vehicle, config);
  const brand = config.brands[brandKey]?.canonicalName ?? (owner || brandKey);
  const tasks = requests.map((item) => requestToTask(item, brand, vehicle)).filter((item): item is ShotSearchTask => item !== null);
  const scope = yamlRecord(packageRecord.scope_lock, "asset_request_package.scope_lock");
  const allowedIds = new Set(yamlArray(scope.allowed_real_media_request_ids, "scope_lock.allowed_real_media_request_ids")
    .filter((item): item is string => typeof item === "string"));
  const scopedTasks = allowedIds.size > 0 ? tasks.filter((task) => allowedIds.has(task.requestId)) : tasks;
  if (allowedIds.size > 0 && scopedTasks.length !== allowedIds.size) {
    throw new Error(`Asset Request scope_lock 声明 ${allowedIds.size} 项，但解析到 ${scopedTasks.length} 项真实媒体请求`);
  }
  const approval = findApproval(jobId, assetRequestPath);
  const storyboardPath = approval.storyboardPath ?? (scalarString(packageRecord.storyboard_path) || null);
  let storyboardRevision: number | string | null = null;
  if (storyboardPath && existsSync(absolutePath(storyboardPath))) {
    const storyboard = loadYamlRecord(storyboardPath);
    storyboardRevision = scalarNumberOrString(storyboard.revision)
      ?? scalarNumberOrString(yamlRecord(storyboard.storyboard, "storyboard").revision);
  }
  const approved = approval.approved;
  const factCheckPath = approval.factCheckPath
    ?? (existsSync(absolutePath(join("output", jobId, "intermediate", "fact_check.yaml")))
      ? join("output", jobId, "intermediate", "fact_check.yaml")
      : null);
  const verifiedDataPath = existsSync(absolutePath("database/verified_data.json")) ? "database/verified_data.json" : null;
  let boundTasks = scopedTasks;
  if (storyboardPath && factCheckPath && verifiedDataPath) {
    const storyboard = loadYamlRecord(storyboardPath);
    const storyboardRoot = yamlRecord(storyboard.storyboard, "storyboard");
    const shots = yamlArray(storyboardRoot.shots, "storyboard.shots").map((item) => asRecord(item, "storyboard.shots[]"));
    const factCheck = loadYamlRecord(factCheckPath);
    const factRoot = yamlRecord(factCheck.fact_check, "fact_check");
    const claims = yamlArray(factRoot.claims, "fact_check.claims").map((item) => asRecord(item, "fact_check.claims[]"));
    const factSources = yamlArray(factRoot.source_records, "fact_check.source_records").map((item) => asRecord(item, "fact_check.source_records[]"));
    const dataDb = JSON.parse(readFileSync(absolutePath(verifiedDataPath), "utf8")) as { records?: Array<{ data_id?: string; verification_status?: string }> };
    const verifiedIds = new Set((dataDb.records ?? [])
      .filter((item) => item.verification_status?.startsWith("verified"))
      .map((item) => item.data_id)
      .filter((item): item is string => typeof item === "string"));
    const sourceUrls = new Map(factSources.map((source) => [scalarString(source.source_id), scalarString(source.url)]));
    const claimData = new Map(claims.map((claim) => [scalarString(claim.claim_id), {
      dataIds: yamlArray(claim.data_ids, "claim.data_ids").filter((item): item is string => typeof item === "string"),
      sourceIds: yamlArray(claim.source_ids, "claim.source_ids").filter((item): item is string => typeof item === "string"),
    }]));
    boundTasks = scopedTasks.map((task) => {
      const shot = shots.find((item) => scalarString(item.shot_id) === task.shotId);
      const claimIds = shot ? yamlArray(shot.source_claim_ids, "shot.source_claim_ids").filter((item): item is string => typeof item === "string") : [];
      const dataIds = [...new Set([...task.verifiedDataReferences, ...claimIds.flatMap((claimId) => claimData.get(claimId)?.dataIds ?? [])])];
      const missing = dataIds.filter((dataId) => !verifiedIds.has(dataId));
      if (missing.length > 0) throw new Error(`${task.shotId} 引用的 verified data 不存在或未核验：${missing.join(", ")}`);
      const verifiedSourceUrls = claimIds
        .flatMap((claimId) => claimData.get(claimId)?.sourceIds ?? [])
        .map((sourceId) => sourceUrls.get(sourceId) ?? "")
        .filter(Boolean);
      return { ...task, verifiedDataReferences: dataIds, candidateUrls: [...new Set([...task.candidateUrls, ...verifiedSourceUrls])] };
    });
  }
  const safetyPolicy = yamlRecord(packageRecord.safety_policy, "asset_request_package.safety_policy");
  if (safetyPolicy.skip_restricted_source_urls === true) {
    const brandConfig = config.brands[brandKey];
    boundTasks = boundTasks.map((task) => ({
      ...task,
      candidateUrls: task.candidateUrls.filter((candidateUrl) => {
        const parsed = safeUrl(candidateUrl);
        if (!parsed) return false;
        if (brandConfig?.sourceOnlyDomains.some((domain) => domainMatches(parsed.hostname, domain))) return false;
        const normalized = parsed.toString().toLowerCase();
        return !config.policy.prohibitedSourcePatterns.some((pattern) => normalized.includes(pattern));
      }),
    }));
  }
  if (scalarString(packageRecord.acquisition_mode) === "editorial_official_static_images_only"
    && boundTasks.some((task) => task.requiredMediaType !== "image")) {
    throw new Error("Editorial Images 模式仅允许生成 image 搜索任务");
  }
  const requestedOutput = outputDir ?? join("output", jobId, "asset_acquisition", "media_acquisition_v1_r1");
  return {
    root: absolutePath("."),
    assetRequestPath,
    outputDir: requestedOutput,
    jobId,
    brandKey,
    brand,
    vehicle,
    storyboardPath,
    scriptPath: approval.scriptPath ?? (scalarString(packageRecord.script_path) || null),
    factCheckPath,
    verifiedDataPath,
    approvalRecordPath: approval.recordPath,
    requestRevision: scalarNumberOrString(packageRecord.revision),
    storyboardRevision,
    acquisitionAllowed: packageRecord.acquisition_allowed_this_revision === true,
    approved,
    tasks: boundTasks,
  };
}

function safeUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function domainMatches(hostname: string, allowed: string): boolean {
  const host = hostname.toLowerCase();
  const suffix = allowed.toLowerCase();
  return host === suffix || host.endsWith(`.${suffix}`);
}

function inferMediaTypeFromUrl(url: URL): MediaType {
  const extension = extname(url.pathname).slice(1).toLowerCase();
  return DIRECT_MEDIA_EXTENSIONS[extension] ?? "unknown";
}

function inferSourceType(url: URL, brand: BrandSourceConfig): SourceType {
  const host = url.hostname.toLowerCase();
  const path = url.pathname.toLowerCase();
  if (brand.sourceOnlyDomains.some((domain) => domainMatches(host, domain))) return "official_social_source_only";
  if (host === "ir.mi.com" || path.includes("investor") || path.includes("ir/")) return "official_investor_relations";
  if (host.includes("hkexnews")) return "stock_exchange_filing";
  if (host.includes("cision")) return "licensed_pr_platform";
  if (/media.?kit|press.?kit|newsroom|news/.test(path)) return "official_media_library";
  if (/event|launch|live/.test(path)) return "official_launch";
  return "brand_official_site";
}

function sourceTier(type: SourceType, config: MediaSourcesConfig): "A" | "B" | null {
  if (config.sourceTiers.A?.includes(type)) return "A";
  if (config.sourceTiers.B?.includes(type)) return "B";
  if (type === "official_social_source_only") return "A";
  return null;
}

function isAllowedSource(url: URL, brand: BrandSourceConfig, config: MediaSourcesConfig): boolean {
  if (!config.policy.allowedProtocols.includes(url.protocol)) return false;
  const full = url.toString().toLowerCase();
  if (config.policy.prohibitedSourcePatterns.some((pattern) => full.includes(pattern))) return false;
  return [...brand.allowedDomains, ...brand.sourceOnlyDomains].some((domain) => domainMatches(url.hostname, domain));
}

function usageTermsUrl(url: URL, brand: BrandSourceConfig): string | null {
  const match = Object.entries(brand.usageTermsUrls).find(([domain]) => domainMatches(url.hostname, domain));
  return match?.[1] ?? null;
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .trim();
}

function attrValue(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return decodeHtml(match?.[1] ?? match?.[2] ?? match?.[3] ?? "") || null;
}

function metaContent(html: string, keys: string[]): string | null {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const key = (attrValue(tag, "property") ?? attrValue(tag, "name") ?? attrValue(tag, "itemprop") ?? "").toLowerCase();
    if (keys.includes(key)) return attrValue(tag, "content");
  }
  return null;
}

function pageTitle(html: string): string | null {
  const meta = metaContent(html, ["og:title", "twitter:title"]);
  if (meta) return meta;
  const title = decodeHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<[^>]+>/g, " ") ?? "");
  return title || null;
}

function publisher(html: string, host: string): string | null {
  return metaContent(html, ["og:site_name", "author", "publisher"])
    ?? (host.includes("xiaomi") || host.includes("mi.com") ? "Xiaomi" : null);
}

function publishedAt(html: string): string | null {
  const meta = metaContent(html, ["article:published_time", "datepublished", "publishdate", "date"]);
  if (meta) return meta;
  const time = decodeHtml(html.match(/<time\b[^>]*datetime\s*=\s*["']([^"']+)["']/i)?.[1] ?? "");
  if (time) return time;
  const jsonLd = decodeHtml(html.match(/["']datePublished["']\s*:\s*["']([^"']+)["']/i)?.[1] ?? "");
  return jsonLd || null;
}

function isSignedUrl(url: URL, config: MediaSourcesConfig): boolean {
  const keys = [...url.searchParams.keys()].map((key) => key.toLowerCase());
  return keys.some((key) => config.policy.signedQueryKeys.includes(key));
}

function explicitDownloadFromHtml(html: string, baseUrl: URL, requiredType: MediaType, config: MediaSourcesConfig): { url: string; evidence: string } | null {
  const anchors = html.match(/<a\b[^>]*>[\s\S]*?<\/a>/gi) ?? [];
  for (const anchor of anchors) {
    const openTag = anchor.match(/^<a\b[^>]*>/i)?.[0] ?? "";
    const href = attrValue(openTag, "href");
    if (!href) continue;
    let target: URL;
    try {
      target = new URL(href, baseUrl);
    } catch {
      continue;
    }
    const extension = extname(target.pathname).slice(1).toLowerCase();
    if (config.policy.forbiddenMediaExtensions.includes(extension) || isSignedUrl(target, config)) continue;
    const type = inferMediaTypeFromUrl(target);
    if (type !== requiredType && !(requiredType === "logo" && type === "image")) continue;
    const text = decodeHtml(anchor.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
    const hasDownloadAttribute = /\sdownload(?:\s|=|>)/i.test(openTag);
    const hasExplicitText = /(download|original|high[ -]?resolution|media asset|press asset|下载|原图|高清|媒体资料)/i.test(text);
    if (!hasDownloadAttribute && !hasExplicitText) continue;
    return { url: target.toString(), evidence: `页面明确下载入口：${text || basename(target.pathname)}` };
  }
  return null;
}

interface FetchResult {
  finalUrl: URL;
  response: Response;
  redirects: string[];
}

async function fetchWithSafeRedirects(initial: URL, config: MediaSourcesConfig, brand: BrandSourceConfig): Promise<FetchResult> {
  let current = initial;
  const redirects: string[] = [];
  for (let count = 0; count <= config.policy.maxRedirects; count += 1) {
    const response = await fetch(current, {
      redirect: "manual",
      signal: AbortSignal.timeout(config.policy.requestTimeoutMs),
    });
    if (![301, 302, 303, 307, 308].includes(response.status)) return { finalUrl: current, response, redirects };
    const location = response.headers.get("location");
    if (!location) return { finalUrl: current, response, redirects };
    const next = new URL(location, current);
    if (!isAllowedSource(next, brand, config) || isSignedUrl(next, config)) {
      throw new Error(`重定向到不允许或临时签名 URL：${next.toString()}`);
    }
    redirects.push(next.toString());
    current = next;
  }
  throw new Error("重定向次数超过上限");
}

const robotsCache = new Map<string, string | null>();

async function robotsAllows(url: URL, config: MediaSourcesConfig): Promise<boolean> {
  const origin = url.origin;
  let robots = robotsCache.get(origin);
  if (robots === undefined) {
    try {
      const response = await fetch(new URL("/robots.txt", origin), {
        redirect: "error",
        signal: AbortSignal.timeout(config.policy.requestTimeoutMs),
      });
      robots = response.ok ? await response.text() : null;
    } catch {
      robots = null;
    }
    robotsCache.set(origin, robots);
  }
  if (!robots) return true;
  let applies = false;
  const disallows: string[] = [];
  for (const rawLine of robots.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*/, "").trim();
    if (!line) continue;
    const [rawKey, ...rest] = line.split(":");
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(":").trim();
    if (key === "user-agent") applies = value === "*";
    if (applies && key === "disallow" && value) disallows.push(value);
  }
  return !disallows.some((path) => url.pathname.startsWith(path));
}

function baseCandidate(task: ShotSearchTask, url: URL, sourceType: SourceType, tier: "A" | "B" | null): SourceCandidate {
  const accessedAt = new Date().toISOString();
  return {
    sourceId: stableId("src", url.toString()),
    requestIds: [task.requestId],
    shotIds: [task.shotId],
    sourceUrl: url.toString(),
    sourceTitle: null,
    publisher: null,
    publishedAt: null,
    accessedAt,
    sourceDomain: url.hostname,
    sourceType,
    sourceTier: tier,
    downloadUrl: null,
    mediaRelationship: "source_page_without_download_relation",
    usageTermsUrl: null,
    discoveryStatus: "fetch_error",
    httpStatus: null,
    explicitDownloadEntry: false,
    inferredMediaType: inferMediaTypeFromUrl(url),
    evidence: [],
    errors: [],
  };
}

async function discoverUrl(task: ShotSearchTask, rawUrl: string, config: MediaSourcesConfig, brand: BrandSourceConfig): Promise<SourceCandidate> {
  const url = safeUrl(rawUrl);
  if (!url) {
    return {
      ...baseCandidate(task, new URL("https://invalid.local/"), "unknown", null),
      sourceUrl: rawUrl,
      sourceDomain: "invalid",
      discoveryStatus: "unsupported_source",
      errors: ["URL 无法解析"],
    };
  }
  const sourceType = inferSourceType(url, brand);
  const tier = sourceTier(sourceType, config);
  const result = baseCandidate(task, url, sourceType, tier);
  result.usageTermsUrl = usageTermsUrl(url, brand);
  if (!isAllowedSource(url, brand, config)) {
    result.discoveryStatus = "unsupported_source";
    result.errors.push("域名或协议不在允许来源清单");
    return result;
  }
  if (!(await robotsAllows(url, config))) {
    result.discoveryStatus = "robots_disallowed";
    result.errors.push("robots.txt 明确禁止访问该路径");
    return result;
  }
  try {
    const fetched = await fetchWithSafeRedirects(url, config, brand);
    result.httpStatus = fetched.response.status;
    result.evidence.push(...fetched.redirects.map((redirect) => `安全重定向：${redirect}`));
    if (fetched.response.status === 401 || fetched.response.status === 403) {
      result.discoveryStatus = "blocked_access";
      result.errors.push(`HTTP ${fetched.response.status}，禁止绕过`);
      return result;
    }
    if (!fetched.response.ok) {
      result.discoveryStatus = "fetch_error";
      result.errors.push(`HTTP ${fetched.response.status}`);
      return result;
    }
    const contentType = (fetched.response.headers.get("content-type") ?? "").toLowerCase();
    const directMediaType = inferMediaTypeFromUrl(fetched.finalUrl);
    if (directMediaType !== "unknown" && !contentType.includes("text/html")) {
      result.sourceUrl = fetched.finalUrl.toString();
      result.sourceDomain = fetched.finalUrl.hostname;
      result.sourceTitle = basename(fetched.finalUrl.pathname);
      result.publisher = brand.canonicalName;
      result.inferredMediaType = directMediaType;
      result.discoveryStatus = "direct_file_verified";
      result.evidence.push("实际 URL 返回静态媒体文件");
      if (directMediaType === task.requiredMediaType && !isSignedUrl(fetched.finalUrl, config)) {
        result.downloadUrl = fetched.finalUrl.toString();
        result.explicitDownloadEntry = true;
        result.mediaRelationship = "source_is_static_public_original_file";
      }
      return result;
    }
    const html = await fetched.response.text();
    result.sourceUrl = fetched.finalUrl.toString();
    result.sourceDomain = fetched.finalUrl.hostname;
    result.sourceTitle = pageTitle(html);
    result.publisher = publisher(html, fetched.finalUrl.hostname);
    result.publishedAt = publishedAt(html);
    const loweredText = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").toLowerCase();
    if (config.policy.loginMarkers.some((marker) => loweredText.includes(marker)) && /captcha|验证码|登录|sign in/i.test(loweredText.slice(0, 4000))) {
      result.discoveryStatus = "login_or_captcha";
      result.errors.push("页面要求登录或验证码，禁止继续");
      return result;
    }
    const explicit = explicitDownloadFromHtml(html, fetched.finalUrl, task.requiredMediaType, config);
    if (explicit && isAllowedSource(new URL(explicit.url), brand, config)) {
      result.downloadUrl = explicit.url;
      result.explicitDownloadEntry = true;
      result.mediaRelationship = "source_page_explicitly_links_download_file";
      result.discoveryStatus = "actual_page_verified";
      result.inferredMediaType = inferMediaTypeFromUrl(new URL(explicit.url));
      result.evidence.push(explicit.evidence);
    } else {
      result.discoveryStatus = "no_legal_download_entry";
      result.mediaRelationship = "actual_page_verified_no_explicit_download_entry";
      result.evidence.push("已访问实际来源页，但未发现符合当前媒体类型的明确下载入口");
    }
    return result;
  } catch (error) {
    result.discoveryStatus = "fetch_error";
    result.errors.push(error instanceof Error ? error.message : String(error));
    return result;
  }
}

function mergeCandidate(target: SourceCandidate, incoming: SourceCandidate): void {
  target.requestIds = [...new Set([...target.requestIds, ...incoming.requestIds])];
  target.shotIds = [...new Set([...target.shotIds, ...incoming.shotIds])];
  target.evidence = [...new Set([...target.evidence, ...incoming.evidence])];
  target.errors = [...new Set([...target.errors, ...incoming.errors])];
}

function normalizedEvidenceUrl(value: string): string {
  try {
    const url = new URL(value);
    url.hash = "";
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    url.pathname = url.pathname.replace(/\/$/, "") || "/";
    return url.toString();
  } catch {
    return value;
  }
}

function enrichFromApprovedFactCheck(context: AcquisitionContext, candidates: SourceCandidate[]): void {
  if (!context.factCheckPath || !existsSync(absolutePath(context.factCheckPath))) return;
  const root = loadYamlRecord(context.factCheckPath);
  const factCheck = yamlRecord(root.fact_check, "fact_check");
  const records = yamlArray(factCheck.source_records, "fact_check.source_records").map((item) => asRecord(item, "fact_check.source_records[]"));
  const byUrl = new Map(records.map((record) => [normalizedEvidenceUrl(scalarString(record.url)), record]));
  for (const candidate of candidates) {
    const record = byUrl.get(normalizedEvidenceUrl(candidate.sourceUrl));
    if (!record) continue;
    candidate.sourceTitle = candidate.sourceTitle ?? (scalarString(record.title) || null);
    candidate.publisher = candidate.publisher ?? (scalarString(record.publisher) || null);
    candidate.publishedAt = candidate.publishedAt ?? (scalarString(record.published_at) || null);
    candidate.evidence.push(`已批准 Fact Check 来源记录：${scalarString(record.source_id)}`);
  }
}

export async function discoverSources(context: AcquisitionContext): Promise<SourceCandidate[]> {
  if (!context.acquisitionAllowed) throw new Error("Asset Request 禁止本 revision 采集");
  if (!context.approved) throw new Error("未找到与 Asset Request 对应的自动门禁批准或显式人工覆盖记录");
  const config = loadMediaSourcesConfig();
  const brand = config.brands[context.brandKey];
  if (!brand) throw new Error(`config/media_sources.yaml 缺少品牌配置：${context.brandKey}`);
  const byUrl = new Map<string, SourceCandidate>();
  let visited = 0;
  for (const task of context.tasks) {
    const urls = [...new Set([...task.candidateUrls, ...brand.seedUrls])];
    for (const url of urls) {
      if (visited >= config.policy.maxPagesPerRun) break;
      const key = safeUrl(url)?.toString() ?? url;
      const existing = byUrl.get(key);
      if (existing) {
        mergeCandidate(existing, baseCandidate(task, safeUrl(url) ?? new URL("https://invalid.local/"), existing.sourceType, existing.sourceTier));
        continue;
      }
      const candidate = await discoverUrl(task, url, config, brand);
      byUrl.set(key, candidate);
      visited += 1;
    }
  }
  const results = [...byUrl.values()].sort((a, b) => a.sourceUrl.localeCompare(b.sourceUrl));
  enrichFromApprovedFactCheck(context, results);
  return results;
}
