import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import {
  absolutePath,
  loadYamlRecord,
  relativePath,
  stableId,
  yamlArray,
  yamlRecord,
  type AcquisitionContext,
  type CandidateAssetRecord,
  type DownloadResult,
  type RightsDecision,
  type SemanticMatch,
  type SourceCandidate,
  type TechnicalInspection,
} from "./types.ts";

const MANIFEST_LICENSES = new Set(["owned_by_user", "licensed_commercial", "official_press_asset", "editorial_use"]);

function isManifestEligible(candidate: CandidateAssetRecord): boolean {
  return MANIFEST_LICENSES.has(candidate.licenseStatus)
    && !["blocked", "quarantined", "rejected"].includes(candidate.status);
}

interface TimelineShot {
  shotId: string;
  durationSeconds: number;
}

function loadStoryboardTimeline(storyboardPath: string | null): { totalSeconds: number; shots: TimelineShot[] } {
  if (!storyboardPath || !existsSync(absolutePath(storyboardPath))) return { totalSeconds: 0, shots: [] };
  const document = loadYamlRecord(storyboardPath);
  const storyboard = yamlRecord(document.storyboard, "storyboard");
  const shots = yamlArray(storyboard.shots, "storyboard.shots").map((item) => {
    const shot = yamlRecord(item, "storyboard.shots[]");
    return {
      shotId: typeof shot.shot_id === "string" ? shot.shot_id : "unknown_shot",
      durationSeconds: typeof shot.duration === "number" ? shot.duration : 0,
    };
  });
  const declaredTotal = typeof storyboard.total_duration_seconds === "number" ? storyboard.total_duration_seconds : 0;
  return {
    totalSeconds: declaredTotal || shots.reduce((sum, shot) => sum + shot.durationSeconds, 0),
    shots,
  };
}

function sceneFromPath(path: string): string {
  const match = path.match(/assets\/brands\/[^/]+\/([^/]+)\//);
  return match?.[1] ?? "unknown";
}

function candidateStatus(
  rights: RightsDecision,
  technical: TechnicalInspection,
  semantic: SemanticMatch,
): CandidateAssetRecord["status"] {
  if (rights.licenseStatus === "prohibited") return "blocked";
  if (rights.licenseStatus === "unverified") return "quarantined";
  if (technical.technicalStatus === "failed" || semantic.status === "rejected") return "rejected";
  if (technical.technicalStatus === "blocked" || semantic.status === "blocked" || rights.automaticApprovalBlocked) {
    return "blocked";
  }
  return "candidate";
}

export function buildCandidateAssets(
  context: AcquisitionContext,
  sources: SourceCandidate[],
  rights: RightsDecision[],
  downloads: DownloadResult[],
  inspections: TechnicalInspection[],
  semantics: SemanticMatch[],
): CandidateAssetRecord[] {
  const sourceMap = new Map(sources.map((item) => [item.sourceId, item]));
  const rightsMap = new Map(rights.map((item) => [item.sourceId, item]));
  const inspectionMap = new Map(inspections.map((item) => [item.localPath, item]));
  const candidates: CandidateAssetRecord[] = [];
  for (const download of downloads) {
    if (!download.localPath || !download.sha256 || !["downloaded", "reused_duplicate"].includes(download.status)) continue;
    const source = sourceMap.get(download.sourceId);
    const decision = rightsMap.get(download.sourceId);
    const inspection = inspectionMap.get(download.localPath);
    if (!source || !decision || !inspection) continue;
    const semantic = semantics
      .filter((item) => item.localPath === download.localPath && download.requestIds.includes(item.requestId))
      .sort((a, b) => b.score - a.score)[0];
    if (!semantic) continue;
    candidates.push({
      assetId: stableId(`${context.brandKey}_${sceneFromPath(download.localPath)}`, download.sha256),
      brand: context.brandKey,
      vehicle: context.vehicle,
      shotIds: [...new Set(download.shotIds)],
      localPath: download.localPath,
      sourceId: source.sourceId,
      sourceUrl: source.sourceUrl,
      sourceTitle: source.sourceTitle,
      publisher: source.publisher,
      sourceType: source.sourceType,
      publishedAt: source.publishedAt,
      accessedAt: source.accessedAt,
      usageTermsUrl: source.usageTermsUrl,
      licenseStatus: decision.licenseStatus,
      permittedUse: decision.permittedUse,
      restrictions: decision.restrictions,
      sha256: inspection.sha256,
      mediaType: inspection.mediaType,
      resolution: inspection.resolution,
      fps: inspection.fps,
      duration: inspection.duration,
      codec: inspection.codec,
      watermarkStatus: inspection.watermarkStatus,
      qualityGrade: inspection.qualityGrade,
      semanticScore: semantic.score,
      usedCount: 0,
      lastUsed: null,
      status: candidateStatus(decision, inspection, semantic),
    });
  }
  return candidates;
}

export interface ManifestResult {
  manifest: Record<string, unknown>;
  gaps: Record<string, unknown>;
  status: "ready_for_automatic_review" | "blocked";
}

export function buildManifest(
  context: AcquisitionContext,
  candidates: CandidateAssetRecord[],
  storyboardPath = context.storyboardPath,
): ManifestResult {
  const matches = context.tasks.map((task) => {
    const matching = candidates.filter((candidate) => candidate.shotIds.includes(task.shotId));
    const eligible = matching.filter(isManifestEligible);
    return {
      shot_id: task.shotId,
      request_id: task.requestId,
      duration_seconds: task.durationSeconds,
      required_media_type: task.requiredMediaType,
      required_scene: task.requiredScene,
      verified_data_ids: task.verifiedDataReferences,
      candidate_asset_ids: eligible.map((item) => item.assetId),
      blocked_or_quarantined_asset_ids: matching.filter((item) => !eligible.includes(item)).map((item) => item.assetId),
      match_status: eligible.length > 0 ? "candidate_requires_automatic_review" : "missing_official_image",
      editorial_fallback_required: eligible.length === 0,
      fallback_order: ["official_high_resolution_still", "verified_data_animation", "original_programmatic_visual", "original_editorial_diagram"],
      programmatic_fallback_counts_as_real_media: false,
    };
  });
  const unresolved = matches.filter((item) => item.match_status === "missing_official_image");
  const storyboardExists = storyboardPath ? existsSync(absolutePath(storyboardPath)) : false;
  const timeline = loadStoryboardTimeline(storyboardPath);
  const matchByShot = new Map(matches.map((item) => [item.shot_id, item]));
  let currentProgrammaticRun = 0;
  let longestProgrammaticRun = 0;
  for (const shot of timeline.shots) {
    const match = matchByShot.get(shot.shotId);
    const hasOfficialImage = match?.candidate_asset_ids.length ? true : false;
    if (hasOfficialImage) {
      currentProgrammaticRun = 0;
    } else {
      currentProgrammaticRun += shot.durationSeconds;
      longestProgrammaticRun = Math.max(longestProgrammaticRun, currentProgrammaticRun);
    }
  }
  const officialImageSeconds = matches
    .filter((item) => item.candidate_asset_ids.length > 0)
    .reduce((sum, item) => sum + item.duration_seconds, 0);
  const officialImagePercent = timeline.totalSeconds > 0 ? Number((officialImageSeconds / timeline.totalSeconds * 100).toFixed(2)) : 0;
  const programmaticSeconds = Math.max(0, timeline.totalSeconds - officialImageSeconds);
  const programmaticRunGatePassed = longestProgrammaticRun <= 5;
  const status: ManifestResult["status"] = unresolved.length === 0 && storyboardExists && programmaticRunGatePassed
    ? "ready_for_automatic_review"
    : "blocked";
  const blockedReasons: string[] = [];
  if (!storyboardExists) blockedReasons.push("approved storyboard path missing");
  if (unresolved.length > 0) blockedReasons.push(`${unresolved.length} 个官方静态图请求没有可进入 Manifest 的候选素材`);
  if (!programmaticRunGatePassed) blockedReasons.push(`最长连续程序化画面 ${longestProgrammaticRun} 秒，超过 5 秒门禁`);
  const manifest = {
    schema_version: 1,
    candidate_asset_manifest: {
      job_id: context.jobId,
      generated_at: new Date().toISOString(),
      asset_request_path: context.assetRequestPath,
      asset_request_revision: context.requestRevision,
      storyboard_path: storyboardPath,
      storyboard_revision: context.storyboardRevision,
      brand: context.brandKey,
      vehicle: context.vehicle,
      status,
      render_allowed: false,
      automatic_rights_review_required: true,
      scope: {
        real_media_request_count: context.tasks.length,
        static_image_requests_added: context.tasks.filter((task) => task.requiredMediaType === "image").length,
        logo_requests_added: 0,
        storyboard_modified: false,
        programmatic_fallback_counts_as_real_media: false,
      },
      statistics: {
        local_candidate_files: candidates.length,
        manifest_eligible_candidates: candidates.filter(isManifestEligible).length,
        blocked_or_quarantined_candidates: candidates.filter((item) => ["blocked", "quarantined", "rejected"].includes(item.status)).length,
        matched_shots: matches.length - unresolved.length,
        missing_shots: unresolved.length,
        official_image_screen_seconds: officialImageSeconds,
        official_image_screen_percent: officialImagePercent,
        programmatic_screen_seconds: programmaticSeconds,
        programmatic_fallback_shot_count: unresolved.length,
        longest_consecutive_programmatic_seconds: longestProgrammaticRun,
        maximum_allowed_consecutive_programmatic_seconds: 5,
        programmatic_continuity_gate_passed: programmaticRunGatePassed,
      },
      blocked_reasons: blockedReasons,
      shot_matches: matches,
      asset_candidates: candidates.filter((item) => MANIFEST_LICENSES.has(item.licenseStatus) && !["blocked", "quarantined", "rejected"].includes(item.status)),
      verified_data_bindings: context.tasks.flatMap((task) => task.verifiedDataReferences.map((dataId) => ({ shot_id: task.shotId, data_id: dataId }))),
      automatic_review_checks: [
        "版权用途、地域、平台、期限和署名要求",
        "水印、车型识别、主体保护区与 9:16 实际裁切",
        "画面是否准确支持旁白且不造成事实误导",
      ],
    },
  };
  const gaps = {
    schema_version: 1,
    unresolved_asset_gaps: {
      job_id: context.jobId,
      generated_at: new Date().toISOString(),
      status: unresolved.length > 0 ? "blocked" : "none",
      missing_official_image_count: unresolved.length,
      programmatic_fallback_shot_count: unresolved.length,
      gaps: unresolved.map((item) => ({
        shot_id: item.shot_id,
        request_id: item.request_id,
        required_media_type: item.required_media_type,
        required_scene: item.required_scene,
        verified_data_ids: item.verified_data_ids,
        flags: ["missing_official_image", "missing_real_asset", "editorial_fallback_required"],
        fallback_order: item.fallback_order,
        prohibited_actions: ["抓取网页展示图", "抓取受限视频流", "绕过登录/验证码/403/DRM", "为凑数量修改 Storyboard", "把程序化回退计入真实素材比例"],
      })),
    },
  };
  return { manifest, gaps, status };
}

interface DatabaseJson {
  records?: unknown[];
  [key: string]: unknown;
}

function loadDatabase(path: string): DatabaseJson {
  return JSON.parse(readFileSync(absolutePath(path), "utf8")) as DatabaseJson;
}

function writeDatabase(path: string, database: DatabaseJson): void {
  writeFileSync(absolutePath(path), `${JSON.stringify(database, null, 2)}\n`, "utf8");
}

export function registerCandidateAssets(candidates: CandidateAssetRecord[]): { addedAssets: number; addedCache: number } {
  if (candidates.length === 0) return { addedAssets: 0, addedCache: 0 };
  const assetsPath = "database/assets.json";
  const cachePath = "database/asset_cache.json";
  const assets = loadDatabase(assetsPath);
  const cache = loadDatabase(cachePath);
  const assetRecords = Array.isArray(assets.records) ? assets.records as Record<string, unknown>[] : [];
  const cacheRecords = Array.isArray(cache.records) ? cache.records as Record<string, unknown>[] : [];
  const now = new Date().toISOString();
  let addedAssets = 0;
  let addedCache = 0;
  for (const candidate of candidates) {
    if (!existsSync(absolutePath(candidate.localPath))) throw new Error(`禁止登记不存在的本地素材：${candidate.localPath}`);
    const existingBySha = assetRecords.find((record) => record.sha256 === candidate.sha256);
    if (!existingBySha) {
      const scene = sceneFromPath(candidate.localPath);
      assetRecords.push({
        asset_id: candidate.assetId,
        revision: 1,
        filename: basename(candidate.localPath),
        local_path: candidate.localPath,
        type: candidate.mediaType,
        media_type: candidate.mediaType,
        category: "brands",
        brand: candidate.brand,
        vehicle: candidate.vehicle,
        scene,
        resolution: candidate.resolution ?? "",
        duration: candidate.duration,
        fps: candidate.fps,
        codec: candidate.codec ?? "",
        file_size: Number(readFileSync(absolutePath(candidate.localPath)).byteLength),
        sha256: candidate.sha256,
        quality_grade: candidate.qualityGrade,
        license_status: candidate.licenseStatus,
        license_source: candidate.usageTermsUrl ?? candidate.sourceUrl,
        shot_ids: candidate.shotIds,
        camera: { shot_size: "", angle: "", focal_length_mm: 0, movement: "" },
        tags: [candidate.brand, scene, candidate.mediaType, candidate.status],
        source: {
          source_type: candidate.sourceType,
          owner: candidate.publisher ?? "",
          url: candidate.sourceUrl,
          provider: "media_acquisition_agent_v1",
          collected_at: candidate.accessedAt,
          sha256: candidate.sha256,
        },
        license: {
          status: candidate.licenseStatus,
          type: candidate.licenseStatus,
          permitted_use: candidate.permittedUse,
          restrictions: candidate.restrictions,
          commercial_use: candidate.licenseStatus === "licensed_commercial" || candidate.licenseStatus === "owned_by_user",
          platforms: [],
          territories: [],
          proof_path: "",
          expires_at: "",
        },
        quality: {
          grade: candidate.qualityGrade ?? "",
          watermark_status: candidate.watermarkStatus,
          semantic_match_status: candidate.status === "candidate" ? "passed" : "pending",
          quality_score: candidate.semanticScore,
        },
        used_count: 0,
        last_used: "",
        lifecycle_status: candidate.status === "quarantined" ? "quarantined" : candidate.status === "rejected" ? "rejected" : "registered",
        registered_at: now,
        updated_at: now,
        supersedes: "",
      });
      addedAssets += 1;
    }
    const existingCache = cacheRecords.find((record) => record.sha256 === candidate.sha256);
    if (!existingCache) {
      const normalizedUrl = new URL(candidate.sourceUrl);
      normalizedUrl.hash = "";
      normalizedUrl.hostname = normalizedUrl.hostname.toLowerCase();
      cacheRecords.push({
        cache_id: stableId("cache", candidate.sha256),
        asset_id: existingBySha?.asset_id ?? candidate.assetId,
        sha256: candidate.sha256,
        source_url: candidate.sourceUrl,
        normalized_source_url: normalizedUrl.toString(),
        local_path: candidate.localPath,
        file_size_bytes: readFileSync(absolutePath(candidate.localPath)).byteLength,
        first_seen_at: now,
        last_verified_at: now,
        status: candidate.status === "quarantined" ? "quarantined" : "active",
      });
      addedCache += 1;
    }
  }
  if (addedAssets > 0) {
    assets.records = assetRecords;
    writeDatabase(assetsPath, assets);
  }
  if (addedCache > 0) {
    cache.records = cacheRecords;
    writeDatabase(cachePath, cache);
  }
  return { addedAssets, addedCache };
}
