import { existsSync, readFileSync } from "node:fs";
import { asArray, asRecord } from "./lib/yaml.ts";
import {
  booleanValue,
  failIfIssues,
  loadYamlRecord,
  numberValue,
  projectPath,
  sha256File,
  stringValue,
  positionalArgs,
} from "./lib/common.ts";

const [inputPath = "data/assets.sample.yaml"] = positionalArgs(process.argv.slice(2));
const issues: string[] = [];

try {
  const config = loadYamlRecord("CONFIG.yaml");
  const forbiddenPolicy = asRecord(config.forbidden, "forbidden");
  const document = loadYamlRecord(inputPath);
  const manifest = asRecord(document.manifest, "manifest");
  const assets = asArray(manifest.assets, "manifest.assets");
  const verifiedDataBindings = asArray(manifest.verified_data_bindings, "manifest.verified_data_bindings");
  const forbidden = asArray(forbiddenPolicy.providers, "forbidden.providers")
    .map((value) => stringValue(value).toLowerCase());
  const ids = new Set<string>();
  const checksumOwners = new Map<string, string>();

  if (!stringValue(manifest.job_id)) issues.push("manifest.job_id is required");
  if (assets.length === 0) issues.push("manifest.assets cannot be empty");
  if (stringValue(manifest.validation_status) !== "passed") issues.push("manifest.validation_status must be passed");
  if (asArray(manifest.gaps, "manifest.gaps").length > 0) issues.push("manifest.gaps must be empty");

  if (manifest.mix_policy !== undefined) {
    const mixPolicy = asRecord(manifest.mix_policy, "manifest.mix_policy");
    const gradeAbMinimum = numberValue(mixPolicy.grade_ab_min_percent);
    const gradeDMaximum = numberValue(mixPolicy.grade_d_max_percent);
    const gradeAbActual = numberValue(mixPolicy.grade_ab_actual_percent);
    const gradeDActual = numberValue(mixPolicy.grade_d_actual_percent);

    if (!Number.isFinite(gradeAbMinimum) || gradeAbMinimum < 70) {
      issues.push("manifest.mix_policy.grade_ab_min_percent must be at least 70");
    }
    if (!Number.isFinite(gradeDMaximum) || gradeDMaximum > 30) {
      issues.push("manifest.mix_policy.grade_d_max_percent must be at most 30");
    }
    if (!Number.isFinite(gradeAbActual) || gradeAbActual < gradeAbMinimum) {
      issues.push("manifest A+B screen-time ratio does not meet the configured minimum");
    }
    if (!Number.isFinite(gradeDActual) || gradeDActual > gradeDMaximum) {
      issues.push("manifest AI/D-grade screen-time ratio exceeds the configured maximum");
    }
    if (stringValue(mixPolicy.status) !== "passed") {
      issues.push("manifest.mix_policy.status must be passed");
    }
  }

  assets.forEach((value, index) => {
    const asset = asRecord(value, `assets[${index}]`);
    const id = stringValue(asset.asset_id);
    const type = stringValue(asset.type).toLowerCase();
    const source = asRecord(asset.source, `${id || index}.source`);
    const license = asRecord(asset.license, `${id || index}.license`);
    const localPath = stringValue(source.local_path);
    const provider = stringValue(source.provider).toLowerCase();
    const checksum = stringValue(source.sha256);
    const licenseStatus = stringValue(license.status);
    const assetStatus = stringValue(asset.status);
    const officialPressAsset = licenseStatus === "official_press_asset";

    if (!id) issues.push(`assets[${index}] missing asset_id`);
    if (ids.has(id)) issues.push(`duplicate asset_id: ${id}`);
    ids.add(id);
    if (!stringValue(asset.shot_id)) issues.push(`${id || index} missing shot_id`);
    if (!type) issues.push(`${id || index} missing type`);
    if (!stringValue(source.source_type) || !stringValue(source.owner)) {
      issues.push(`${id || index} source_type and source.owner are required`);
    }
    if (!localPath) issues.push(`${id || index} missing local_path`);
    if (booleanValue(asset.required) !== true && booleanValue(asset.required) !== false) {
      issues.push(`${id || index} required must be boolean`);
    }
    if (provider && forbidden.includes(provider)) issues.push(`${id || index} uses forbidden provider: ${provider}`);
    if (!localPath || !existsSync(projectPath(localPath))) {
      if (booleanValue(asset.required) === true) issues.push(`${id || index} required file is missing: ${localPath}`);
    } else if (/^[a-f0-9]{64}$/i.test(checksum)) {
      const actual = sha256File(localPath);
      if (actual !== checksum.toLowerCase()) issues.push(`${id || index} sha256 mismatch`);
      const previousOwner = checksumOwners.get(actual);
      if (previousOwner && previousOwner !== id) {
        issues.push(`${id || index} duplicates file content from ${previousOwner}; reuse one asset_id instead`);
      } else {
        checksumOwners.set(actual, id);
      }
    } else {
      issues.push(`${id || index} requires a 64-character sha256`);
    }

    if (!["cleared", "project_owned", "official_press_asset"].includes(licenseStatus)) {
      issues.push(`${id || index} license status must be cleared, project_owned or official_press_asset`);
    }
    if (!["cleared", "project_owned", "official_press_asset"].includes(assetStatus)) {
      issues.push(`${id || index} asset status must be cleared, project_owned or official_press_asset`);
    }
    if (!stringValue(license.type)) issues.push(`${id || index} license.type is required`);
    const proofPath = stringValue(license.proof_path);
    if (!proofPath || !existsSync(projectPath(proofPath))) issues.push(`${id || index} license proof is missing`);
    if (officialPressAsset) {
      if (stringValue(source.source_type) !== "official_media_kit") {
        issues.push(`${id || index} official_press_asset requires source_type official_media_kit`);
      }
      if (!stringValue(source.url)) issues.push(`${id || index} official_press_asset requires an official source URL`);
      if (booleanValue(license.commercial_use) !== false) {
        issues.push(`${id || index} official_press_asset commercial_use must be false`);
      }
      if (booleanValue(license.editorial_use_only) !== true) {
        issues.push(`${id || index} official_press_asset editorial_use_only must be true`);
      }
      if (!stringValue(license.usage_restrictions)) {
        issues.push(`${id || index} official_press_asset usage_restrictions is required`);
      }
    }
    const quality = asRecord(asset.quality, `${id || index}.quality`);
    if (["image", "video"].includes(type)) {
      const grade = stringValue(quality.grade).toUpperCase();
      if (!["A", "B", "C", "D"].includes(grade)) {
        issues.push(`${id || index} image/video quality.grade must be A, B, C or D`);
      }
      const previewFrame = stringValue(asset.preview_frame);
      if (!previewFrame || !existsSync(projectPath(previewFrame))) {
        issues.push(`${id || index} image/video requires an existing preview_frame`);
      }
      if (numberValue(quality.width) <= 0 || numberValue(quality.height) <= 0) {
        issues.push(`${id || index} requires positive width and height metadata`);
      }
      if (booleanValue(quality.low_resolution) !== false) {
        issues.push(`${id || index} low_resolution must be false`);
      }
      if (!["none", "authorized"].includes(stringValue(quality.watermark_status))) {
        issues.push(`${id || index} watermark_status must be none or authorized`);
      }
      if (stringValue(quality.semantic_match_status) !== "approved") {
        issues.push(`${id || index} semantic_match_status must be approved`);
      }
    }
  });

  const verifiedDataShotIds = new Set<string>();
  verifiedDataBindings.forEach((value, index) => {
    const binding = asRecord(value, `verified_data_bindings[${index}]`);
    const shotId = stringValue(binding.shot_id);
    const dataIds = asArray(binding.data_ids, `${shotId || index}.data_ids`).map(stringValue).filter(Boolean);
    const databasePath = stringValue(binding.database_path);
    const databaseSha256 = stringValue(binding.database_sha256);
    const records = asArray(binding.records, `${shotId || index}.records`);

    if (!shotId) issues.push(`verified_data_bindings[${index}] missing shot_id`);
    if (verifiedDataShotIds.has(shotId)) issues.push(`duplicate verified data binding for shot_id: ${shotId}`);
    verifiedDataShotIds.add(shotId);
    if (dataIds.length === 0) issues.push(`${shotId || index} verified data binding requires data_ids`);
    if (!databasePath || !existsSync(projectPath(databasePath))) {
      issues.push(`${shotId || index} verified data database is missing`);
    } else if (!/^[a-f0-9]{64}$/i.test(databaseSha256) || sha256File(databasePath) !== databaseSha256.toLowerCase()) {
      issues.push(`${shotId || index} verified data database sha256 mismatch`);
    }
    if (binding.source_linked !== true) issues.push(`${shotId || index} verified data must be source-linked`);
    if (binding.webpage_screenshot_used !== false) issues.push(`${shotId || index} webpage screenshots cannot be verified data`);
    if (binding.reviewer_required !== true) issues.push(`${shotId || index} verified data must retain automatic review`);
    if (stringValue(binding.status) !== "verified_official") issues.push(`${shotId || index} verified data binding is not verified_official`);
    if (!["pending", "approved"].includes(stringValue(binding.automatic_review_status))) {
      issues.push(`${shotId || index} verified data automatic_review_status must be pending or approved`);
    }
    if (records.length !== dataIds.length) issues.push(`${shotId || index} verified data record count does not match data_ids`);

    let databaseRecords = new Map<string, Record<string, unknown>>();
    if (databasePath && existsSync(projectPath(databasePath))) {
      const databaseDocument = JSON.parse(readFileSync(projectPath(databasePath), "utf8")) as Record<string, unknown>;
      const rawRecords = Array.isArray(databaseDocument.records) ? databaseDocument.records : [];
      databaseRecords = new Map(rawRecords
        .filter((record): record is Record<string, unknown> => typeof record === "object" && record !== null)
    .map((record) => [String(record.data_id ?? ""), record]));
    }

    records.forEach((recordValue, recordIndex) => {
      const record = asRecord(recordValue, `${shotId || index}.records[${recordIndex}]`);
      const dataId = stringValue(record.data_id);
      for (const field of ["metric", "unit", "source_title", "source_url", "source_type", "published_at", "accessed_at", "notes"]) {
        if (!stringValue(record[field])) issues.push(`${dataId || recordIndex} verified data missing ${field}`);
      }
      if (!dataId || !dataIds.includes(dataId)) issues.push(`${dataId || recordIndex} is not declared in binding data_ids`);
      if (record.value === undefined || record.value === null || record.value === "") issues.push(`${dataId || recordIndex} verified data missing value`);
      if (stringValue(record.verification_status) !== "verified_official") issues.push(`${dataId || recordIndex} is not verified_official`);
      if (record.reviewer_required !== true) issues.push(`${dataId || recordIndex} must require automatic review`);
      if (/search|snippet|screenshot/i.test(stringValue(record.source_type))) issues.push(`${dataId || recordIndex} uses a forbidden evidence type`);
      const databaseRecord = databaseRecords.get(dataId);
      if (!databaseRecord) {
        issues.push(`${dataId || recordIndex} is missing from verified data database`);
      } else if (JSON.stringify(databaseRecord) !== JSON.stringify(record)) {
        issues.push(`${dataId || recordIndex} differs from verified data database`);
      }
    });
  });

  failIfIssues(inputPath, issues);
} catch (error) {
  issues.push(error instanceof Error ? error.message : String(error));
  failIfIssues(inputPath, issues);
}
