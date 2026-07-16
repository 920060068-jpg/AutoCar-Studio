import {createHash} from "node:crypto";
import {existsSync, mkdirSync, readFileSync, statSync, writeFileSync} from "node:fs";
import {dirname, relative, resolve} from "node:path";

import {asArray, asRecord, type YamlValue} from "./lib/yaml.ts";
import {loadYamlRecord, stringValue} from "./lib/common.ts";

type JsonRecord = Record<string, unknown>;
type Candidate = {
  record: JsonRecord;
  score: number;
  semanticScore: number;
};

const root = process.cwd();
const args = process.argv.slice(2);
let storyboardPath = "";
let databasePath = "database/assets.json";
let cachePath = "database/asset_cache.json";
let verifiedDataPath = "database/verified_data.json";
let outputPath = "";
let allowBlocked = false;
let brandFilter = "";

for (let index = 0; index < args.length; index += 1) {
  const value = args[index];
  if (value === "--database") {
    databasePath = args[index + 1] ?? "";
    index += 1;
  } else if (value === "--cache") {
    cachePath = args[index + 1] ?? "";
    index += 1;
  } else if (value === "--verified-data") {
    verifiedDataPath = args[index + 1] ?? "";
    index += 1;
  } else if (value === "--output") {
    outputPath = args[index + 1] ?? "";
    index += 1;
  } else if (value === "--brand") {
    brandFilter = (args[index + 1] ?? "").toLowerCase();
    index += 1;
  } else if (value === "--allow-blocked") {
    allowBlocked = true;
  } else if (!value.startsWith("--") && !storyboardPath) {
    storyboardPath = value;
  }
}

if (!storyboardPath) {
  console.error("Usage: generate_asset_manifest.ts <storyboard.yaml> [--database <assets.json>] [--cache <asset_cache.json>] [--verified-data <verified_data.json>] [--output <asset_manifest.yaml>] [--brand <brand>] [--allow-blocked]");
  process.exit(1);
}

if (!outputPath) {
  outputPath = resolve(dirname(resolve(root, storyboardPath)), "asset_manifest.generated.yaml");
}

const absoluteOutput = resolve(root, outputPath);
if (existsSync(absoluteOutput)) {
  console.error(`Refusing to overwrite existing output: ${relative(root, absoluteOutput)}`);
  process.exit(1);
}

const readJson = (path: string): JsonRecord => {
  const absolutePath = resolve(root, path);
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) throw new Error(`JSON file not found: ${path}`);
  return JSON.parse(readFileSync(absolutePath, "utf8")) as JsonRecord;
};

const recordsOf = (document: JsonRecord): JsonRecord[] => {
  return Array.isArray(document.records)
    ? document.records.filter((value): value is JsonRecord => typeof value === "object" && value !== null)
    : [];
};

const objectOf = (value: unknown): JsonRecord => {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as JsonRecord : {};
};

const stringsOf = (value: unknown): string[] => {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
};

const sha256 = (absolutePath: string): string => {
  return createHash("sha256").update(readFileSync(absolutePath)).digest("hex");
};

const toRelativePath = (value: string): string => {
  const absolute = resolve(root, value);
  return relative(root, absolute) || ".";
};

const searchableText = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number") return String(value).toLowerCase();
  if (Array.isArray(value)) return value.map(searchableText).join(" ");
  if (typeof value === "object") return Object.values(value as JsonRecord).map(searchableText).join(" ");
  return "";
};

const yamlScalar = (value: unknown): string => {
  if (value === null || value === undefined) return "null";
  if (typeof value === "boolean" || typeof value === "number") return String(value);
  return JSON.stringify(String(value));
};

const toYaml = (value: unknown, indent = 0): string => {
  const padding = " ".repeat(indent);
  if (Array.isArray(value)) {
    if (value.length === 0) return `${padding}[]`;
    return value.map((item) => {
      if (item === null || typeof item !== "object") return `${padding}- ${yamlScalar(item)}`;
      return `${padding}-\n${toYaml(item, indent + 2)}`;
    }).join("\n");
  }
  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value as JsonRecord).filter(([, item]) => item !== undefined);
    if (entries.length === 0) return `${padding}{}`;
    return entries.map(([key, item]) => {
      if (item !== null && typeof item === "object") {
        if (Array.isArray(item) && item.length === 0) return `${padding}${key}: []`;
        if (!Array.isArray(item) && Object.keys(item as JsonRecord).length === 0) return `${padding}${key}: {}`;
        return `${padding}${key}:\n${toYaml(item, indent + 2)}`;
      }
      return `${padding}${key}: ${yamlScalar(item)}`;
    }).join("\n");
  }
  return `${padding}${yamlScalar(value)}`;
};

const database = readJson(databasePath);
const cache = readJson(cachePath);
const verifiedData = readJson(verifiedDataPath);
const config = loadYamlRecord("CONFIG.yaml");
const storyboardDocument = loadYamlRecord(storyboardPath);
const storyboard = asRecord(storyboardDocument.storyboard, "storyboard");
const shots = asArray(storyboard.shots, "storyboard.shots");
const approval = asRecord(storyboard.approval, "storyboard.approval");
const platform = stringValue(asRecord(config.video, "CONFIG.video").platform) || "douyin";
const forbiddenProviders = asArray(asRecord(config.forbidden, "CONFIG.forbidden").providers, "CONFIG.forbidden.providers")
  .map((value) => String(value).toLowerCase());
const issues: string[] = [];
const verifiedDataById = new Map<string, JsonRecord>();
const verifiedDataIssues = new Map<string, string[]>();

for (const record of recordsOf(verifiedData)) {
  const dataId = String(record.data_id ?? "");
  const recordIssues: string[] = [];
  if (!dataId) {
    issues.push("verified data record is missing data_id");
    continue;
  }
  if (verifiedDataById.has(dataId)) recordIssues.push("duplicate data_id");
  for (const field of ["metric", "unit", "source_title", "source_url", "source_type", "published_at", "accessed_at", "notes"]) {
    if (!String(record[field] ?? "")) recordIssues.push(`missing ${field}`);
  }
  if (record.value === undefined || record.value === null || record.value === "") recordIssues.push("missing value");
  if (record.verification_status !== "verified_official") recordIssues.push("verification_status is not verified_official");
  if (record.reviewer_required !== true) recordIssues.push("reviewer_required must be true");
  if (/search|snippet|screenshot/i.test(String(record.source_type ?? ""))) recordIssues.push("search summaries and screenshots are not verified data sources");
  try {
    const sourceUrl = new URL(String(record.source_url ?? ""));
    if (sourceUrl.protocol !== "https:") recordIssues.push("source_url must use HTTPS");
  } catch {
    recordIssues.push("source_url is invalid");
  }
  verifiedDataById.set(dataId, record);
  if (recordIssues.length > 0) verifiedDataIssues.set(dataId, recordIssues);
}

const verifiedDataSha256 = sha256(resolve(root, verifiedDataPath));

if (!/^approved/.test(stringValue(approval.status))) {
  issues.push(`storyboard approval is not approved: ${stringValue(approval.status) || "missing"}`);
}

const latestRecords = new Map<string, JsonRecord>();
for (const record of recordsOf(database)) {
  const assetId = String(record.asset_id ?? "");
  const revision = Number(record.revision ?? 0);
  if (!assetId) continue;
  const existing = latestRecords.get(assetId);
  if (!existing || revision >= Number(existing.revision ?? 0)) latestRecords.set(assetId, record);
}

const cacheOwners = new Map<string, string>();
for (const record of recordsOf(cache)) {
  const hash = String(record.sha256 ?? "").toLowerCase();
  const assetId = String(record.asset_id ?? "");
  if (/^[a-f0-9]{64}$/.test(hash) && assetId) {
    const existing = cacheOwners.get(hash);
    if (existing && existing !== assetId) issues.push(`cache sha256 ${hash} maps to multiple asset_ids`);
    cacheOwners.set(hash, assetId);
  }
}

const eligibilityIssues = new Map<string, string[]>();
const eligibleRecords: JsonRecord[] = [];
for (const record of latestRecords.values()) {
  const assetId = String(record.asset_id ?? "");
  if (brandFilter && String(record.brand ?? "").toLowerCase() !== brandFilter) continue;
  const source = objectOf(record.source);
  const license = objectOf(record.license);
  const quality = objectOf(record.quality);
  const localPath = String(record.local_path ?? source.local_path ?? "");
  const absolutePath = resolve(root, localPath);
  const hash = String(source.sha256 ?? "").toLowerCase();
  const provider = String(source.provider ?? "local").toLowerCase();
  const licenseStatus = String(license.status ?? "");
  const officialPressAsset = licenseStatus === "official_press_asset";
  const grade = String(quality.grade ?? "").toUpperCase();
  const recordIssues: string[] = [];

  if (record.lifecycle_status !== "active") recordIssues.push("lifecycle_status is not active");
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) recordIssues.push("local file is missing");
  if (!/^[a-f0-9]{64}$/.test(hash)) recordIssues.push("sha256 is invalid");
  else if (existsSync(absolutePath) && sha256(absolutePath) !== hash) recordIssues.push("sha256 mismatch");
  if (forbiddenProviders.includes(provider)) recordIssues.push(`forbidden provider: ${provider}`);
  if (!["cleared", "project_owned", "official_press_asset"].includes(licenseStatus)) recordIssues.push("license is not render-manifest eligible");
  if (officialPressAsset) {
    const proofPath = String(license.proof_path ?? "");
    if (source.source_type !== "official_media_kit") recordIssues.push("official_press_asset requires source_type official_media_kit");
    if (!String(source.owner ?? "") || !String(source.url ?? "")) recordIssues.push("official_press_asset requires official owner and URL");
    if (!proofPath || !existsSync(resolve(root, proofPath))) recordIssues.push("official_press_asset proof is missing");
    if (license.commercial_use !== false) recordIssues.push("official_press_asset commercial_use must be false");
    if (license.editorial_use_only !== true) recordIssues.push("official_press_asset editorial_use_only must be true");
    if (!String(license.usage_restrictions ?? "")) recordIssues.push("official_press_asset usage restrictions are missing");
  }
  const platforms = stringsOf(license.platforms);
  if (platforms.length > 0 && !platforms.includes(platform)) recordIssues.push(`license excludes platform ${platform}`);
  if (!["A", "B", "C", "D"].includes(grade)) recordIssues.push("quality.grade must be A, B, C or D");
  if (quality.low_resolution !== false) recordIssues.push("low_resolution is not false");
  if (!["none", "authorized"].includes(String(quality.watermark_status ?? ""))) recordIssues.push("watermark is not cleared");
  if (quality.semantic_match_status !== "approved") recordIssues.push("semantic match is not approved");
  if (["image", "video"].includes(String(record.type ?? ""))) {
    const previewFrame = String(record.preview_frame ?? "");
    if (!previewFrame || !existsSync(resolve(root, previewFrame))) recordIssues.push("preview_frame is missing");
    if (Number(quality.width ?? 0) <= 0 || Number(quality.height ?? 0) <= 0) recordIssues.push("media dimensions are missing");
  }
  const cacheOwner = cacheOwners.get(hash);
  if (cacheOwner && cacheOwner !== assetId) recordIssues.push(`cache assigns sha256 to ${cacheOwner}`);

  if (recordIssues.length === 0) eligibleRecords.push(record);
  else eligibilityIssues.set(assetId, recordIssues);
}

const gradeWeight: Record<string, number> = {A: 40, B: 30, C: 20, D: 10};
const usedAssetIds = new Set<string>();
const manifestAssets: JsonRecord[] = [];
const verifiedDataBindings: JsonRecord[] = [];
const selectedForMix: Array<{duration: number; grade: string}> = [];
const gaps: JsonRecord[] = [];
const excludedGraphics: JsonRecord[] = [];
let excludedGraphicsSeconds = 0;

shots.forEach((shotValue, shotIndex) => {
  const shot = asRecord(shotValue, `storyboard.shots[${shotIndex}]`);
  const shotId = stringValue(shot.shot_id) || `shot_${shotIndex + 1}`;
  const asset = asRecord(shot.asset, `${shotId}.asset`);
  const required = asset.required === true;
  const requestIds = asArray(asset.request_ids, `${shotId}.asset.request_ids`).map(String);
  const explicitDataIds = Array.isArray(shot.verified_data_ids)
    ? shot.verified_data_ids.map(String)
    : [];
  const programmaticVerifiedData = stringValue(shot.primary_visual_source) === "programmatic_verified_data";
  const requestedDataIds = [...new Set([
    ...requestIds.filter((requestId) => requestId.startsWith("data_")),
    ...explicitDataIds,
  ])];
  const nonDataRequestIds = programmaticVerifiedData
    ? []
    : requestIds.filter((requestId) => !requestId.startsWith("data_"));
  const reuseAllowed = asset.reuse_allowed === true && Boolean(stringValue(asset.reuse_reason));
  const duration = typeof shot.duration === "number" ? shot.duration : 0;

  if (requestedDataIds.length > 0) {
    const bindingIssues: string[] = [];
    const records: JsonRecord[] = [];
    for (const dataId of requestedDataIds) {
      const record = verifiedDataById.get(dataId);
      if (!record) {
        bindingIssues.push(`${dataId}: record is missing`);
        continue;
      }
      const recordIssues = verifiedDataIssues.get(dataId) ?? [];
      if (recordIssues.length > 0) bindingIssues.push(`${dataId}: ${recordIssues.join(", ")}`);
      records.push(record);
    }
    if (bindingIssues.length > 0) {
      if (required) gaps.push({shot_id: shotId, request_ids: requestIds, reason: `verified data failed: ${bindingIssues.join("; ")}`});
      return;
    }
    verifiedDataBindings.push({
      shot_id: shotId,
      data_ids: requestedDataIds,
      database_path: verifiedDataPath,
      database_sha256: verifiedDataSha256,
      records,
      source_linked: true,
      webpage_screenshot_used: false,
      reviewer_required: true,
      automatic_review_status: "pending",
      status: "verified_official",
    });
    if (nonDataRequestIds.length === 0) {
      excludedGraphicsSeconds += duration;
      excludedGraphics.push({
        shot_id: shotId,
        duration_seconds: duration,
        reason: "verified source-linked data animation; no external media asset",
      });
      return;
    }
  }

  const shotSearch = searchableText({
    visual: shot.visual,
    camera: shot.camera,
    movement: shot.movement,
    brand: asset.brand,
    vehicle: asset.vehicle,
    scene: asset.scene,
    tags: asset.tags,
  });
  const shotTokens = new Set(shotSearch.split(/[^\p{L}\p{N}_-]+/u).filter((token) => token.length >= 2));
  const candidates: Candidate[] = [];

  for (const record of eligibleRecords) {
    const assetId = String(record.asset_id ?? "");
    if (usedAssetIds.has(assetId) && !reuseAllowed) continue;
    const recordSearch = searchableText({
      asset_id: assetId,
      brand: record.brand,
      vehicle: record.vehicle,
      scene: record.scene,
      camera: record.camera,
      tags: record.tags,
    });
    const recordTokens = new Set(recordSearch.split(/[^\p{L}\p{N}_-]+/u).filter((token) => token.length >= 2));
    const exactRequest = nonDataRequestIds.includes(assetId) || nonDataRequestIds.some((requestId) => recordTokens.has(requestId.toLowerCase()));
    const overlap = [...shotTokens].filter((token) => recordTokens.has(token)).length;
    const semanticScore = (exactRequest ? 100 : 0) + overlap * 4;
    if (semanticScore <= 0) continue;
    const quality = objectOf(record.quality);
    const grade = String(quality.grade ?? "").toUpperCase();
    const score = semanticScore + gradeWeight[grade] + Number(quality.quality_score ?? 0) * 0.2 - Math.min(20, Number(record.used_count ?? 0) * 2);
    candidates.push({record, score, semanticScore});
  }

  candidates.sort((left, right) => right.score - left.score || String(left.record.asset_id).localeCompare(String(right.record.asset_id)));
  const selected = candidates[0];
  if (!selected) {
    if (required) {
      gaps.push({
        shot_id: shotId,
        request_ids: nonDataRequestIds,
        reason: eligibleRecords.length === 0 ? "no eligible active local assets" : "no semantic match",
      });
    }
    return;
  }

  const record = selected.record;
  const selectedId = String(record.asset_id ?? "");
  const source = objectOf(record.source);
  const license = objectOf(record.license);
  const quality = objectOf(record.quality);
  const grade = String(quality.grade ?? "").toUpperCase();
  const existingEntry = manifestAssets.find((entry) => entry.asset_id === selectedId);

  if (existingEntry) {
    const additional = Array.isArray(existingEntry.additional_shot_ids) ? existingEntry.additional_shot_ids : [];
    additional.push(shotId);
    existingEntry.additional_shot_ids = additional;
  } else {
    manifestAssets.push({
      asset_id: selectedId,
      shot_id: shotId,
      additional_shot_ids: [],
      type: String(record.type ?? "video"),
      required,
      source: {
        source_type: String(source.source_type ?? ""),
        owner: String(source.owner ?? ""),
        url: String(source.url ?? ""),
        local_path: String(record.local_path ?? source.local_path ?? ""),
        provider: String(source.provider ?? "local"),
        collected_at: String(source.collected_at ?? ""),
        sha256: String(source.sha256 ?? ""),
      },
      license,
      preview_frame: String(record.preview_frame ?? ""),
      quality,
      duplicate: {
        exact_duplicate_of: "",
        possible_duplicate_of: "",
        reuse_reason: reuseAllowed ? stringValue(asset.reuse_reason) : "",
      },
      matching: {
        database_path: databasePath,
        database_revision: Number(database.schema_version ?? 1),
        candidate_asset_ids: candidates.map((candidate) => String(candidate.record.asset_id ?? "")),
        selected_reason: nonDataRequestIds.includes(selectedId) ? "exact request_id and hard gates passed" : "highest deterministic semantic and quality score",
        quality_score: Number(quality.quality_score ?? 0),
        source_score: Number(quality.source_score ?? 0),
        visual_score: Number(quality.visual_score ?? selected.semanticScore),
        commercial_risk: Number(quality.commercial_risk ?? 0),
      },
      generation: objectOf(record.generation),
      status: String(license.status ?? "blocked"),
    });
  }

  usedAssetIds.add(selectedId);
  selectedForMix.push({duration, grade});
});

const measuredSeconds = selectedForMix.reduce((sum, item) => sum + item.duration, 0);
const gradeAbSeconds = selectedForMix.filter((item) => item.grade === "A" || item.grade === "B").reduce((sum, item) => sum + item.duration, 0);
const gradeDSeconds = selectedForMix.filter((item) => item.grade === "D").reduce((sum, item) => sum + item.duration, 0);
const gradeAbPercent = measuredSeconds > 0 ? Number((gradeAbSeconds / measuredSeconds * 100).toFixed(2)) : 0;
const gradeDPercent = measuredSeconds > 0 ? Number((gradeDSeconds / measuredSeconds * 100).toFixed(2)) : 0;
const mixPassed = measuredSeconds > 0 && gradeAbPercent >= 70 && gradeDPercent <= 30;
if (!mixPassed) issues.push(`asset mix failed: A+B=${gradeAbPercent}%, D=${gradeDPercent}%`);
if (gaps.length > 0) issues.push(`${gaps.length} required shot(s) have no eligible asset`);

const rejectedAssets = [...eligibilityIssues.entries()]
  .map(([assetId, reasons]) => {
    const record = latestRecords.get(assetId) ?? {};
    const license = objectOf(record.license);
    const quality = objectOf(record.quality);
    return {
      asset_id: assetId,
      local_path: String(record.local_path ?? ""),
      license_status: String(license.status ?? ""),
      quality_grade: String(quality.grade ?? ""),
      reasons,
    };
  })
  .sort((left, right) => left.asset_id.localeCompare(right.asset_id));

const validationStatus = issues.length === 0 ? "passed" : "blocked";
const absoluteStoryboard = resolve(root, storyboardPath);
const manifestDocument = {
  schema_version: 2,
  generated_by: "scripts/generate_asset_manifest.ts",
  manifest: {
    job_id: stringValue(storyboard.job_id),
    revision: Number(storyboard.revision ?? 1),
    storyboard_path: toRelativePath(storyboardPath),
    storyboard_sha256: sha256(absoluteStoryboard),
    database_path: databasePath,
    cache_path: cachePath,
    verified_data_path: verifiedDataPath,
    verified_data_sha256: verifiedDataSha256,
    platform,
    brand_filter: brandFilter,
    mix_policy: {
      measurement: "screen_time_seconds",
      grade_ab_min_percent: 70,
      grade_d_max_percent: 30,
      measured_seconds: measuredSeconds,
      grade_ab_actual_percent: gradeAbPercent,
      grade_d_actual_percent: gradeDPercent,
      excluded_graphics_seconds: excludedGraphicsSeconds,
      exclusions: excludedGraphics,
      status: mixPassed ? "passed" : "blocked",
    },
    assets: manifestAssets,
    verified_data_bindings: verifiedDataBindings,
    rejected_assets: rejectedAssets,
    gaps,
    issues,
    validation_status: validationStatus,
  },
};

mkdirSync(dirname(absoluteOutput), {recursive: true});
writeFileSync(absoluteOutput, `${toYaml(manifestDocument)}\n`, {encoding: "utf8", flag: "wx"});

console.log(JSON.stringify({
  output: relative(root, absoluteOutput),
  status: validationStatus,
  selected_assets: manifestAssets.length,
  verified_data_bindings: verifiedDataBindings.length,
  rejected_assets: rejectedAssets.length,
  gaps: gaps.length,
  grade_ab_percent: gradeAbPercent,
  grade_d_percent: gradeDPercent,
  network_accessed: false,
  downloads_performed: false,
}, null, 2));

if (validationStatus === "blocked" && !allowBlocked) process.exitCode = 2;
