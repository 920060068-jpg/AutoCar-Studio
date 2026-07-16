import { existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { asRecord, type YamlValue } from "../../scripts/lib/yaml.ts";
import { generateContactSheet } from "./contact_sheet.ts";
import { downloadAllCandidates } from "./download_candidate.ts";
import {
  buildCandidateAssets,
  buildManifest,
  registerCandidateAssets,
} from "./manifest_builder.ts";
import { classifyAllRights } from "./rights_classifier.ts";
import { matchAllSemantics } from "./semantic_matcher.ts";
import { buildAcquisitionContext, discoverSources } from "./source_discovery.ts";
import { inspectFile, inspectPath } from "./technical_inspector.ts";
import {
  absolutePath,
  loadYamlRecord,
  relativePath,
  writeTextExclusive,
  writeYamlExclusive,
  yamlRecord,
  type AcquisitionContext,
  type CandidateAssetRecord,
  type DownloadResult,
  type RightsDecision,
  type SemanticMatch,
  type SourceCandidate,
  type TechnicalInspection,
} from "./types.ts";

interface CliOptions {
  positional: string[];
  output?: string;
}

interface RunState {
  context: AcquisitionContext;
  sources: SourceCandidate[];
  rights: RightsDecision[];
  downloads: DownloadResult[];
  inspections: TechnicalInspection[];
  semantics: SemanticMatch[];
  candidates: CandidateAssetRecord[];
}

interface OutputNames {
  sourceInventory: string;
  candidateInventory: string;
  contactSheet: string;
  manifest: string;
  gaps: string;
  copyrightReport: string;
  technicalReport: string;
  downloadReport: string;
}

function outputNames(context: AcquisitionContext): OutputNames {
  const root = loadYamlRecord(context.assetRequestPath);
  const packageRecord = yamlRecord(root.asset_request_package ?? root.request, "asset_request_package");
  const configured = yamlRecord(packageRecord.output_files, "asset_request_package.output_files");
  const name = (key: string, fallback: string): string => typeof configured[key] === "string" && configured[key]
    ? configured[key] as string
    : fallback;
  return {
    sourceInventory: name("source_inventory", "source_inventory.yaml"),
    candidateInventory: name("candidate_inventory", "candidate_asset_inventory.yaml"),
    contactSheet: name("contact_sheet", "asset_candidate_contact_sheet.jpg"),
    manifest: name("manifest", "candidate_asset_manifest.yaml"),
    gaps: name("gaps", "unresolved_asset_gaps.yaml"),
    copyrightReport: name("copyright_report", "copyright_review_checklist.md"),
    technicalReport: name("technical_report", "technical_inspection_report.md"),
    downloadReport: name("download_report", "download_report.md"),
  };
}

function parseArgs(args: string[]): CliOptions {
  const positional: string[] = [];
  let output: string | undefined;
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--output") {
      output = args[index + 1];
      if (!output) throw new Error("--output 缺少路径");
      index += 1;
    } else if (args[index].startsWith("--")) {
      throw new Error(`不支持的参数：${args[index]}`);
    } else {
      positional.push(args[index]);
    }
  }
  return { positional, output };
}

function nextOutputDir(context: AcquisitionContext, outputExplicit: boolean): AcquisitionContext {
  if (outputExplicit || !existsSync(absolutePath(context.outputDir))) return context;
  const base = context.outputDir.replace(/_r\d+$/, "");
  for (let revision = 2; revision <= 999; revision += 1) {
    const candidate = `${base}_r${revision}`;
    if (!existsSync(absolutePath(candidate))) return { ...context, outputDir: candidate };
  }
  throw new Error("无法分配新的 media acquisition revision 目录");
}

function ensureBrandDirectories(context: AcquisitionContext): void {
  for (const directory of ["exterior", "interior", "driving", "factory", "launch", "logo", "data", "source_records", "previews", "proxies"]) {
    mkdirSync(absolutePath(join("assets", "brands", context.brandKey, directory)), { recursive: true });
  }
}

function inventoryPayload(context: AcquisitionContext, sources: SourceCandidate[], rights: RightsDecision[]): Record<string, unknown> {
  const rightsMap = new Map(rights.map((item) => [item.sourceId, item]));
  return {
    schema_version: 1,
    source_inventory: {
      job_id: context.jobId,
      generated_at: new Date().toISOString(),
      asset_request_path: context.assetRequestPath,
      asset_request_revision: context.requestRevision,
      approved: context.approved,
      acquisition_allowed_this_revision: context.acquisitionAllowed,
      brand: context.brandKey,
      vehicle: context.vehicle,
      search_task_count: context.tasks.length,
      source_count: sources.length,
      tasks: context.tasks,
      sources: sources.map((source) => ({
        ...source,
        rights: rightsMap.get(source.sourceId),
      })),
    },
  };
}

function sourceRecordsPayload(
  context: AcquisitionContext,
  sources: SourceCandidate[],
  rights: RightsDecision[],
  candidates: CandidateAssetRecord[] = [],
): Record<string, unknown> {
  const rightsMap = new Map(rights.map((item) => [item.sourceId, item]));
  return {
    schema_version: 1,
    source_records: sources.map((source) => {
      const decision = rightsMap.get(source.sourceId);
      return {
        source_id: source.sourceId,
        source_title: source.sourceTitle,
        source_url: source.sourceUrl,
        source_domain: source.sourceDomain,
        publisher: source.publisher,
        published_at: source.publishedAt,
        accessed_at: source.accessedAt,
        usage_terms_url: source.usageTermsUrl,
        license_status: decision?.licenseStatus ?? "unverified",
        permitted_use: decision?.permittedUse ?? [],
        restrictions: decision?.restrictions ?? ["未完成版权分类"],
        related_asset_ids: candidates.filter((item) => item.sourceId === source.sourceId).map((item) => item.assetId),
        related_request_ids: source.requestIds,
        related_shot_ids: source.shotIds,
        download_url: source.downloadUrl,
        discovery_status: source.discoveryStatus,
        notes: [...source.evidence, ...source.errors],
      };
    }),
  };
}

function mdCell(value: unknown): string {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function downloadReport(context: AcquisitionContext, downloads: DownloadResult[]): string {
  const counts = Object.fromEntries([...new Set(downloads.map((item) => item.status))].map((status) => [status, downloads.filter((item) => item.status === status).length]));
  const lines = [
    "# Media Acquisition Download Report",
    "",
    `- 项目：\`${context.jobId}\``,
    `- Asset Request：\`${context.assetRequestPath}\``,
    `- 生成时间：${new Date().toISOString()}`,
    `- 状态统计：\`${JSON.stringify(counts)}\``,
    "- 安全约束：未设置 Cookie、Referer 或伪装请求头；未抓取播放器流；401/403 不绕过。",
    "",
    "| source_id | shots | status | local_path | sha256 | HTTP | reason |",
    "|---|---|---|---|---|---:|---|",
    ...downloads.map((item) => `| ${mdCell(item.sourceId)} | ${mdCell(item.shotIds.join(", "))} | ${item.status} | ${mdCell(item.localPath)} | ${mdCell(item.sha256)} | ${mdCell(item.httpStatus)} | ${mdCell(item.reason)} |`),
    "",
  ];
  return lines.join("\n");
}

function technicalReport(context: AcquisitionContext, inspections: TechnicalInspection[]): string {
  const lines = [
    "# Technical Inspection Report",
    "",
    `- 项目：\`${context.jobId}\``,
    `- 检测文件数：${inspections.length}`,
    `- 技术通过：${inspections.filter((item) => item.technicalStatus === "passed").length}`,
    `- 自动检查无法确认并阻断：${inspections.filter((item) => item.technicalStatus === "blocked").length}`,
    `- 失败：${inspections.filter((item) => item.technicalStatus === "failed").length}`,
    "",
    "| local_path | type | resolution | fps | duration | codec | audio | sha256 | watermark | crop 9:16 | status | reasons |",
    "|---|---|---|---:|---:|---|---|---|---|---|---|---|",
    ...inspections.map((item) => `| ${mdCell(item.localPath)} | ${item.mediaType} | ${mdCell(item.resolution)} | ${mdCell(item.fps)} | ${mdCell(item.duration)} | ${mdCell(item.codec)} | ${mdCell(item.audioCodec)} | ${item.sha256} | ${item.watermarkStatus} | ${item.crop916Viability} | ${item.technicalStatus} | ${mdCell(item.reasons.join("；"))} |`),
    "",
    inspections.length === 0 ? "> 没有合法下载的本地候选文件，因此没有可执行的像素、ffprobe 或解码检测。" : "",
    "",
  ];
  return lines.join("\n");
}

function copyrightReport(context: AcquisitionContext, sources: SourceCandidate[], rights: RightsDecision[], candidates: CandidateAssetRecord[]): string {
  const sourceMap = new Map(sources.map((item) => [item.sourceId, item]));
  const distribution = Object.fromEntries(["owned_by_user", "licensed_commercial", "official_press_asset", "editorial_use", "unverified", "prohibited"]
    .map((status) => [status, rights.filter((item) => item.licenseStatus === status).length]));
  const lines = [
    "# Copyright Review Checklist",
    "",
    `- 项目：\`${context.jobId}\``,
    `- 来源版权状态分布：\`${JSON.stringify(distribution)}\``,
    "- 规则：官网展示不等于 unrestricted commercial use；最终发布必须人工版权审核。",
    "",
    "| check | source_id | publisher | source_url | usage_terms_url | license_status | permitted_use | restrictions | local_assets |",
    "|---|---|---|---|---|---|---|---|---|",
    ...rights.map((item) => {
      const source = sourceMap.get(item.sourceId);
      const assets = candidates.filter((candidate) => candidate.sourceId === item.sourceId).map((candidate) => candidate.assetId);
      return `| [ ] | ${item.sourceId} | ${mdCell(source?.publisher)} | ${mdCell(source?.sourceUrl)} | ${mdCell(source?.usageTermsUrl)} | ${item.licenseStatus} | ${mdCell(item.permittedUse.join("；"))} | ${mdCell(item.restrictions.join("；"))} | ${mdCell(assets.join(", "))} |`;
    }),
    "",
    "人工必须确认：用途、平台、地域、有效期、署名、肖像权、商标语境，以及画面是否含第三方水印。",
    "",
  ];
  return lines.join("\n");
}

function candidateInventory(
  context: AcquisitionContext,
  downloads: DownloadResult[],
  inspections: TechnicalInspection[],
  semantics: SemanticMatch[],
  candidates: CandidateAssetRecord[],
): Record<string, unknown> {
  return {
    schema_version: 1,
    candidate_asset_inventory: {
      job_id: context.jobId,
      generated_at: new Date().toISOString(),
      asset_request_path: context.assetRequestPath,
      local_file_count: candidates.length,
      candidates,
      download_results: downloads,
      technical_inspections: inspections,
      semantic_matches: semantics,
    },
  };
}

function runStatePath(context: AcquisitionContext): string {
  return join(context.outputDir, "run_state.json");
}

function writeRunState(state: RunState): void {
  writeTextExclusive(runStatePath(state.context), `${JSON.stringify(state, null, 2)}\n`);
}

function writeSourceOutputs(context: AcquisitionContext, sources: SourceCandidate[], rights: RightsDecision[]): void {
  writeYamlExclusive(join(context.outputDir, outputNames(context).sourceInventory), inventoryPayload(context, sources, rights));
}

async function runDiscover(assetRequestPath: string, output?: string): Promise<void> {
  let context = buildAcquisitionContext(assetRequestPath, output);
  context = nextOutputDir(context, output !== undefined);
  ensureBrandDirectories(context);
  const sources = await discoverSources(context);
  const rights = classifyAllRights(sources);
  writeSourceOutputs(context, sources, rights);
  const sourceRecordName = `${context.jobId}_${basename(context.outputDir)}_sources.yaml`;
  writeYamlExclusive(join("assets", "brands", context.brandKey, "source_records", sourceRecordName), sourceRecordsPayload(context, sources, rights));
  console.log(JSON.stringify({ command: "discover", output_dir: context.outputDir, task_count: context.tasks.length, source_count: sources.length }, null, 2));
}

async function runAcquire(assetRequestPath: string, output?: string): Promise<void> {
  let context = buildAcquisitionContext(assetRequestPath, output);
  context = nextOutputDir(context, output !== undefined);
  ensureBrandDirectories(context);
  const sources = await discoverSources(context);
  const rights = classifyAllRights(sources);
  const downloads = await downloadAllCandidates(context, sources, rights);
  const localPaths = [...new Set(downloads.filter((item) => item.localPath && ["downloaded", "reused_duplicate"].includes(item.status)).map((item) => item.localPath as string))];
  const inspections = localPaths.map(inspectFile);
  const semantics = matchAllSemantics(context, sources, downloads, inspections);
  const candidates = buildCandidateAssets(context, sources, rights, downloads, inspections, semantics);
  const registered = registerCandidateAssets(candidates);
  const manifestResult = buildManifest(context, candidates);
  const names = outputNames(context);

  writeSourceOutputs(context, sources, rights);
  writeYamlExclusive(join(context.outputDir, names.candidateInventory), candidateInventory(context, downloads, inspections, semantics, candidates));
  writeTextExclusive(join(context.outputDir, names.downloadReport), downloadReport(context, downloads));
  writeTextExclusive(join(context.outputDir, names.technicalReport), technicalReport(context, inspections));
  writeTextExclusive(join(context.outputDir, names.copyrightReport), copyrightReport(context, sources, rights, candidates));
  writeYamlExclusive(join(context.outputDir, names.manifest), manifestResult.manifest);
  writeYamlExclusive(join(context.outputDir, names.gaps), manifestResult.gaps);
  generateContactSheet(context, candidates, inspections, join(context.outputDir, names.contactSheet));
  writeRunState({ context, sources, rights, downloads, inspections, semantics, candidates });

  const sourceRecordName = `${context.jobId}_${basename(context.outputDir)}_sources.yaml`;
  writeYamlExclusive(join("assets", "brands", context.brandKey, "source_records", sourceRecordName), sourceRecordsPayload(context, sources, rights, candidates));
  console.log(JSON.stringify({
    command: "acquire",
    output_dir: context.outputDir,
    search_tasks: context.tasks.length,
    sources: sources.length,
    legal_downloads: downloads.filter((item) => item.status === "downloaded").length,
    technical_passed: inspections.filter((item) => item.technicalStatus === "passed").length,
    database_records_added: registered,
    manifest_status: manifestResult.status,
  }, null, 2));
}

function runInspect(inputPath: string, output?: string): void {
  const inspections = inspectPath(inputPath);
  if (!output) {
    console.log(JSON.stringify(inspections, null, 2));
    return;
  }
  const fakeContext = {
    jobId: "standalone_inspection",
  } as AcquisitionContext;
  writeYamlExclusive(join(output, "technical_inspection.yaml"), { schema_version: 1, technical_inspections: inspections });
  writeTextExclusive(join(output, "technical_inspection_report.md"), technicalReport(fakeContext, inspections));
  console.log(JSON.stringify({ command: "inspect", output_dir: output, files: inspections.length }, null, 2));
}

function storyboardJobId(path: string): string {
  const root = loadYamlRecord(path);
  const storyboard = yamlRecord(root.storyboard, `${path}.storyboard`);
  const jobId = storyboard.job_id;
  if (typeof jobId !== "string" || !jobId) throw new Error("Storyboard 缺少 job_id");
  return jobId;
}

function findLatestRunDir(jobId: string): string {
  const parent = absolutePath(join("output", jobId, "asset_acquisition"));
  if (!existsSync(parent)) throw new Error(`没有 asset acquisition 运行目录：${relativePath(parent)}`);
  const candidates = readdirSync(parent, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^media_acquisition_v1_r\d+$/.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => Number(a.match(/_r(\d+)$/)?.[1]) - Number(b.match(/_r(\d+)$/)?.[1]));
  const latest = candidates.at(-1);
  if (!latest) throw new Error("没有可重建 Manifest 的 Media Acquisition V1 run_state");
  return join("output", jobId, "asset_acquisition", latest);
}

function nextManifestPath(outputDir: string): string {
  const base = join(outputDir, "candidate_asset_manifest.yaml");
  if (!existsSync(absolutePath(base))) return base;
  for (let revision = 2; revision <= 999; revision += 1) {
    const candidate = join(outputDir, `candidate_asset_manifest_r${revision}.yaml`);
    if (!existsSync(absolutePath(candidate))) return candidate;
  }
  throw new Error("无法分配新的 Manifest revision");
}

function runManifest(storyboardPath: string, output?: string): void {
  const jobId = storyboardJobId(storyboardPath);
  const outputDir = output ?? findLatestRunDir(jobId);
  const stateFile = absolutePath(join(outputDir, "run_state.json"));
  if (!existsSync(stateFile)) throw new Error(`缺少 run_state.json：${relativePath(stateFile)}`);
  const state = JSON.parse(readFileSync(stateFile, "utf8")) as RunState;
  const manifest = buildManifest({ ...state.context, storyboardPath }, state.candidates, storyboardPath);
  const path = nextManifestPath(outputDir);
  writeYamlExclusive(path, manifest.manifest);
  console.log(JSON.stringify({ command: "manifest", output: path, status: manifest.status }, null, 2));
}

async function main(): Promise<void> {
  const command = process.argv[2];
  const options = parseArgs(process.argv.slice(3));
  const input = options.positional[0];
  if (!command || !input) {
    throw new Error("用法：media:<discover|acquire|inspect|manifest> -- <input> [--output <path>]");
  }
  if (command === "discover") await runDiscover(input, options.output);
  else if (command === "acquire") await runAcquire(input, options.output);
  else if (command === "inspect") runInspect(input, options.output);
  else if (command === "manifest") runManifest(input, options.output);
  else throw new Error(`未知命令：${command}`);
}

main().catch((error) => {
  console.error(`MEDIA_ACQUISITION_FAILED: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
