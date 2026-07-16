import { existsSync } from "node:fs";
import { basename } from "node:path";
import { asArray, asRecord } from "./lib/yaml.ts";
import {
  failIfIssues,
  loadYamlRecord,
  numberValue,
  positionalArgs,
  projectPath,
  sha256File,
  stringValue,
} from "./lib/common.ts";

const args = process.argv.slice(2);
const [inputPath = "data/qc.sample.yaml"] = positionalArgs(args);
const schemaOnly = args.includes("--schema-only");
const issues: string[] = [];

try {
  const config = loadYamlRecord("CONFIG.yaml");
  const publishing = asRecord(config.publishing, "publishing");
  const document = loadYamlRecord(inputPath);
  const report = asRecord(document.report, "report");
  const gates = asArray(report.gates, "report.gates");
  const requiredGates = new Set([
    "config",
    "fact_check",
    "data_sources",
    "deduplication",
    "director_score",
    "storyboard",
    "asset_or_original_visual_manifest",
    "picture_render",
    "picture_lock",
    "subtitle",
    "audio",
    "audio_sync",
    "final_render",
    "technical_qc",
    "content_qc",
    "copyright_editorial_policy",
    "final_quality_score",
    "automatic_review",
  ]);
  const checks = asArray(report.checks, "report.checks");
  const requiredChecks = new Set([
    "resolution",
    "frame_rate",
    "duration",
    "black_frames",
    "missing_assets",
    "subtitle_bounds",
    "audio_clipping",
    "av_sync",
    "duplicate_assets",
    "low_resolution_assets",
    "watermark_and_copyright",
    "news_facts",
    "data_sources",
    "historical_duplication",
    "visual_semantic_match",
    "automatic_review_status",
  ]);
  const allowedStatuses = new Set(["passed", "failed", "blocked", "needs_review"]);
  const seen = new Set<string>();
  const seenChecks = new Set<string>();

  if (!stringValue(report.job_id)) issues.push("report.job_id is required");
  gates.forEach((value, index) => {
    const gate = asRecord(value, `gates[${index}]`);
    const name = stringValue(gate.gate);
    const status = stringValue(gate.status);
    if (!name) issues.push(`gates[${index}] missing gate name`);
    if (seen.has(name)) issues.push(`duplicate gate: ${name}`);
    seen.add(name);
    if (!allowedStatuses.has(status)) issues.push(`${name || index} has invalid status: ${status}`);
    if (!stringValue(gate.evidence)) issues.push(`${name || index} missing evidence`);
  });
  for (const name of requiredGates) if (!seen.has(name)) issues.push(`missing required gate: ${name}`);
  checks.forEach((value, index) => {
    const check = asRecord(value, `checks[${index}]`);
    const name = stringValue(check.check);
    const status = stringValue(check.status);
    if (!name) issues.push(`checks[${index}] missing check name`);
    if (seenChecks.has(name)) issues.push(`duplicate check: ${name}`);
    seenChecks.add(name);
    if (!allowedStatuses.has(status)) issues.push(`${name || index} has invalid status: ${status}`);
    if (!stringValue(check.evidence)) issues.push(`${name || index} missing evidence`);
  });
  for (const name of requiredChecks) if (!seenChecks.has(name)) issues.push(`missing required check: ${name}`);

  const artifactPath = stringValue(report.artifact_path);
  if (!artifactPath || !existsSync(projectPath(artifactPath))) issues.push("artifact_path is missing or does not exist");
  if (!schemaOnly && artifactPath && existsSync(projectPath(artifactPath))) {
    const checksum = stringValue(report.artifact_sha256);
    if (!/^[a-f0-9]{64}$/i.test(checksum)) issues.push("artifact_sha256 must be a real sha256");
    else if (sha256File(artifactPath) !== checksum.toLowerCase()) issues.push("artifact_sha256 mismatch");
  }

  const automaticReview = asRecord(report.automatic_review, "report.automatic_review");
  const overallStatus = stringValue(report.overall_status);
  if (!allowedStatuses.has(overallStatus)) issues.push(`invalid overall_status: ${overallStatus}`);
  const automaticDecision = stringValue(automaticReview.decision);
  const directorScore = numberValue(report.director_score);
  const finalQualityScore = numberValue(report.final_quality_score);
  if (!["pending", "approved", "revise", "retry", "blocked", "failed"].includes(automaticDecision)) {
    issues.push(`invalid automatic review decision: ${automaticDecision}`);
  }
  if (!schemaOnly) {
    for (const value of gates) {
      const gate = asRecord(value, "gate");
      if (stringValue(gate.status) !== "passed") issues.push(`release blocked by gate: ${stringValue(gate.gate)}`);
    }
    for (const value of checks) {
      const check = asRecord(value, "check");
      if (stringValue(check.status) !== "passed") issues.push(`release blocked by check: ${stringValue(check.check)}`);
    }
    if (overallStatus !== "passed") issues.push("overall_status is not passed");
    if (!(directorScore > 90)) issues.push("director_score must be strictly greater than 90");
    if (!(finalQualityScore > 90)) issues.push("final_quality_score must be strictly greater than 90");
    if (automaticDecision !== "approved") issues.push("automatic review is not approved");
    if (automaticDecision === "approved" && (!stringValue(automaticReview.reviewer) || !stringValue(automaticReview.reviewed_at))) {
      issues.push("approved automatic review requires reviewer and reviewed_at");
    }
    if (publishing.auto_publish !== false) issues.push("publishing.auto_publish must remain false");
    if (publishing.release_candidate_only !== true) issues.push("publishing.release_candidate_only must remain true");
    const artifactName = basename(artifactPath);
    if (artifactName !== "release_candidate.mp4" && !/_release_candidate_v\d+\.mp4$/u.test(artifactName)) {
      issues.push("release artifact must be release_candidate.mp4 or a versioned *_release_candidate_vN.mp4");
    }
  }

  failIfIssues(schemaOnly ? `${inputPath} schema` : `${inputPath} release`, issues);
  if (schemaOnly && issues.length === 0) console.log("INFO schema is valid; sample remains non-publishable");
} catch (error) {
  issues.push(error instanceof Error ? error.message : String(error));
  failIfIssues(inputPath, issues);
}
