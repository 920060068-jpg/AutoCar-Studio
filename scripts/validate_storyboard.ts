import { existsSync } from "node:fs";
import { asArray, asRecord } from "./lib/yaml.ts";
import {
  booleanValue,
  failIfIssues,
  loadYamlRecord,
  numberValue,
  positionalArgs,
  projectPath,
  sha256File,
  stringValue,
} from "./lib/common.ts";

const [inputPath = "data/storyboard.sample.yaml"] = positionalArgs(process.argv.slice(2));
const issues: string[] = [];

try {
  const config = loadYamlRecord("CONFIG.yaml");
  const video = asRecord(config.video, "video");
  const durationTarget = asRecord(video.duration_target_seconds, "video.duration_target_seconds");
  const editorialPolicy = asRecord(config.editorial_mode, "editorial_mode");
  const originalEditorialPolicy = asRecord(config.original_editorial_visual_mode, "original_editorial_visual_mode");
  const forbiddenPolicy = asRecord(config.forbidden, "forbidden");
  const providers = asRecord(config.providers, "providers");
  const heygen = asRecord(providers.heygen, "providers.heygen");
  const document = loadYamlRecord(inputPath);
  const storyboard = asRecord(document.storyboard, "storyboard");
  const shots = asArray(storyboard.shots, "storyboard.shots");
  const approval = asRecord(storyboard.approval, "storyboard.approval");
  const productionMode = stringValue(storyboard.production_mode).toLowerCase();
  const presentationFormat = stringValue(storyboard.presentation_format).toLowerCase();
  const generatedOriginalDynamic = presentationFormat === "original_dynamic_editorial_video";
  const editorialMode = productionMode === "editorial";
  const originalEditorialMode = productionMode === "original_editorial";
  const editorialModeRecord = editorialMode
    ? asRecord(storyboard.editorial_mode, "storyboard.editorial_mode")
    : {};
  const forbidden = asArray(forbiddenPolicy.providers, "forbidden.providers")
    .map((value) => stringValue(value).toLowerCase());
  const forbiddenFormats = asArray(forbiddenPolicy.formats, "forbidden.formats")
    .map((value) => stringValue(value).toLowerCase());
  const heygenAllowedFor = new Set(asArray(heygen.allowed_for, "providers.heygen.allowed_for")
    .map((value) => stringValue(value).toLowerCase()));
  const resolutionMatch = stringValue(video.resolution).match(/^(\d+)x(\d+)$/);
  const configWidth = resolutionMatch ? Number(resolutionMatch[1]) : Number.NaN;
  const configHeight = resolutionMatch ? Number(resolutionMatch[2]) : Number.NaN;
  const allowedEngines = new Set(["remotion", "hyperframes", "heygen", "footage", "image"]);
  const allowedStoryboardCopyrightStatuses = new Set([
    "pending",
    "cleared",
    "project_owned",
    "project_owned_when_generated",
  ]);
  const allowedEditorialComponents = new Set(asArray(
    editorialPolicy.allowed_visual_components,
    "editorial_mode.allowed_visual_components",
  ).map((value) => stringValue(value)));
  const allowedOriginalEditorialComponents = new Set(asArray(
    originalEditorialPolicy.allowed_visual_components,
    "original_editorial_visual_mode.allowed_visual_components",
  ).map((value) => stringValue(value)));

  if (!stringValue(storyboard.job_id)) issues.push("storyboard.job_id is required");
  if (stringValue(storyboard.aspect_ratio) !== stringValue(video.aspect_ratio)) {
    issues.push("storyboard aspect_ratio differs from CONFIG.yaml");
  }
  if (numberValue(storyboard.width) !== configWidth) issues.push("storyboard width mismatch");
  if (numberValue(storyboard.height) !== configHeight) issues.push("storyboard height mismatch");
  if (numberValue(storyboard.fps) !== numberValue(video.fps)) issues.push("storyboard fps mismatch");
  if (!presentationFormat) issues.push("storyboard.presentation_format is required");
  if (presentationFormat && !["dynamic_editorial_video", "original_dynamic_editorial_video"].includes(presentationFormat)) {
    issues.push(`unsupported presentation_format: ${presentationFormat}`);
  }
  if (forbiddenFormats.includes(presentationFormat)) {
    issues.push(`storyboard uses forbidden format: ${presentationFormat}`);
  }
  if (booleanValue(storyboard.static_slideshow_allowed) !== false) {
    issues.push("storyboard.static_slideshow_allowed must be false");
  }
  if (generatedOriginalDynamic && booleanValue(storyboard.external_media_allowed) !== false) {
    issues.push("original dynamic storyboard must set external_media_allowed=false");
  }
  if (editorialMode) {
    if (booleanValue(editorialPolicy.enabled) !== true) issues.push("CONFIG editorial_mode is not enabled");
    if (stringValue(editorialModeRecord.trigger) !== "official_video_legally_unavailable") {
      issues.push("editorial storyboard trigger is invalid");
    }
    if (booleanValue(editorialModeRecord.restricted_video_search_permitted) !== false) {
      issues.push("editorial storyboard must stop restricted video search");
    }
    if (booleanValue(editorialModeRecord.wait_for_pr_assets) !== false) {
      issues.push("editorial storyboard cannot wait for PR assets");
    }
    if (booleanValue(editorialModeRecord.render_allowed) !== false) {
      issues.push("editorial storyboard render_allowed must be false");
    }
    const triggerEvidence = asArray(editorialModeRecord.trigger_evidence, "storyboard.editorial_mode.trigger_evidence");
    if (triggerEvidence.length === 0) issues.push("editorial storyboard requires trigger evidence");
    for (const evidence of triggerEvidence) {
      const evidencePath = stringValue(evidence);
      if (!evidencePath || !existsSync(projectPath(evidencePath))) {
        issues.push(`editorial trigger evidence is missing: ${evidencePath || "empty"}`);
      }
    }
  }
  if (originalEditorialMode) {
    const mode = asRecord(storyboard.original_editorial_mode, "storyboard.original_editorial_mode");
    if (booleanValue(originalEditorialPolicy.enabled) !== true) issues.push("CONFIG original_editorial_visual_mode is not enabled");
    if (stringValue(mode.trigger) !== "no_legally_acquirable_external_media") issues.push("original editorial trigger is invalid");
    if (booleanValue(mode.external_media_permitted) !== false) issues.push("original editorial mode must prohibit external media");
    if (booleanValue(mode.continue_asset_search) !== false) issues.push("original editorial mode must stop asset search");
    if (booleanValue(mode.wait_for_pr_assets) !== false) issues.push("original editorial mode cannot wait for PR assets");
    if (booleanValue(mode.render_allowed) !== false) issues.push("original editorial mode render_allowed must be false");
    const triggerEvidence = asArray(mode.trigger_evidence, "storyboard.original_editorial_mode.trigger_evidence");
    if (triggerEvidence.length === 0) issues.push("original editorial mode requires trigger evidence");
    for (const evidence of triggerEvidence) {
      const evidencePath = stringValue(evidence);
      if (!evidencePath || !existsSync(projectPath(evidencePath))) {
        issues.push(`original editorial trigger evidence is missing: ${evidencePath || "empty"}`);
      }
    }
  }

  const totalDuration = numberValue(storyboard.total_duration_seconds);
  if (totalDuration < numberValue(durationTarget.min) || totalDuration > numberValue(durationTarget.max)) {
    issues.push("storyboard total duration is outside CONFIG.yaml range");
  }

  const brandStyle = stringValue(storyboard.brand_style);
  if (!brandStyle || !existsSync(projectPath(brandStyle))) issues.push("brand_style file is missing");

  const ids = new Set<string>();
  let expectedStart = 0;
  shots.forEach((value, index) => {
    const shot = asRecord(value, `shots[${index}]`);
    const id = stringValue(shot.shot_id);
    const start = numberValue(shot.start_seconds);
    const duration = numberValue(shot.duration);
    const visual = asRecord(shot.visual, `${id || index}.visual`);
    const camera = asRecord(shot.camera, `${id || index}.camera`);
    const movement = asRecord(shot.movement, `${id || index}.movement`);
    const audio = asRecord(shot.audio, `${id || index}.audio`);
    const asset = asRecord(shot.asset, `${id || index}.asset`);
    const engine = stringValue(shot.engine).toLowerCase();
    const segmentRole = stringValue(shot.segment_role).toLowerCase();

    if (!id) issues.push(`shots[${index}] missing shot_id`);
    if (ids.has(id)) issues.push(`duplicate shot_id: ${id}`);
    ids.add(id);
    if (!Number.isFinite(start) || start < 0) issues.push(`${id || index} has invalid start_seconds`);
    if (!Number.isFinite(duration) || duration <= 0) issues.push(`${id || index} has invalid duration`);
    if (Math.abs(start - expectedStart) > 0.001) issues.push(`${id || index} creates a gap or overlap at ${start}s`);
    expectedStart = start + duration;
    if (!stringValue(shot.script_segment_id)) issues.push(`${id || index} missing script_segment_id`);
    const visualDescription = stringValue(visual.description);
    const compactPurpose = /(?:^|，)purpose:\s*(.*?)(?:，claim_ids:|$)/u.exec(visualDescription)?.[1]?.trim() ?? "";
    if (!visualDescription) issues.push(`${id || index} missing visual.description`);
    if (!stringValue(visual.purpose) && !(generatedOriginalDynamic && compactPurpose)) issues.push(`${id || index} missing visual.purpose`);
    if (!generatedOriginalDynamic && !stringValue(visual.lighting)) issues.push(`${id || index} missing visual.lighting`);
    const compactClaimIds = /(?:^|，)claim_ids:\s*\[([^\]]*)\]/u.exec(visualDescription)?.[1]
      ?.split(",")
      .map((claimId) => claimId.trim())
      .filter(Boolean) ?? [];
    const visualClaimIds = Array.isArray(visual.claim_ids)
      ? asArray(visual.claim_ids, `${id || index}.visual.claim_ids`)
      : compactClaimIds;
    if ((!generatedOriginalDynamic && visualClaimIds.length === 0) || visualClaimIds.some((claimId) => !stringValue(claimId))) {
      issues.push(`${id || index} requires at least one visual claim_id`);
    }
    if (!stringValue(camera.shot_size)) issues.push(`${id || index} missing camera.shot_size`);
    if (numberValue(camera.focal_length_mm) <= 0) issues.push(`${id || index} camera.focal_length_mm must be positive`);
    if (!stringValue(camera.angle)) issues.push(`${id || index} missing camera.angle`);
    if (!stringValue(movement.type)) issues.push(`${id || index} missing movement.type`);
    if (!stringValue(movement.plan)) issues.push(`${id || index} missing movement.plan`);
    const narration = stringValue(audio.narration);
    const narrationRequired = booleanValue(audio.narration_required);
    const intentionalSilence = booleanValue(audio.intentional_silence);
    const audioClaimIds = asArray(audio.claim_ids, `${id || index}.audio.claim_ids`);
    const claimlessEditorialEnding = generatedOriginalDynamic && index === shots.length - 1 && visualClaimIds.length === 0;
    if (narration) {
      if (narrationRequired === false) issues.push(`${id || index} has narration but narration_required is false`);
      if (intentionalSilence === true) issues.push(`${id || index} has narration but intentional_silence is true`);
      if ((!claimlessEditorialEnding && audioClaimIds.length === 0) || audioClaimIds.some((claimId) => !stringValue(claimId))) {
        issues.push(`${id || index} narrated shot requires at least one audio claim_id`);
      }
    } else {
      if (narrationRequired !== false || intentionalSilence !== true) {
        issues.push(`${id || index} empty narration requires narration_required=false and intentional_silence=true`);
      }
      if (!stringValue(audio.sync_notes)) issues.push(`${id || index} intentional silence requires sync_notes`);
      if (audioClaimIds.some((claimId) => !stringValue(claimId))) {
        issues.push(`${id || index} intentional silence contains an invalid audio claim_id`);
      }
    }
    if (!stringValue(shot.engine_reason)) issues.push(`${id || index} missing engine_reason`);
    if (!generatedOriginalDynamic && !segmentRole) issues.push(`${id || index} missing segment_role`);
    const previewFrame = stringValue(shot.preview_frame);
    const previewStatus = stringValue(shot.preview_status);
    if (!previewFrame) issues.push(`${id || index} missing preview_frame`);
    if (!previewStatus) issues.push(`${id || index} missing preview_status`);
    if (previewStatus === "approved" && !existsSync(projectPath(previewFrame))) {
      issues.push(`${id || index} approved preview_frame does not exist`);
    }
    if (generatedOriginalDynamic && previewStatus === "approved" && existsSync(projectPath(previewFrame))) {
      const previewSha = stringValue(shot.preview_sha256);
      if (!/^[a-f0-9]{64}$/iu.test(previewSha) || sha256File(previewFrame) !== previewSha.toLowerCase()) {
        issues.push(`${id || index} preview_sha256 mismatch`);
      }
    }
    if (booleanValue(shot.presenter_required) === null) issues.push(`${id || index} presenter_required must be boolean`);
    const assetRequestIds = asArray(asset.request_ids, `${id || index}.asset.request_ids`);
    if (assetRequestIds.length === 0 || assetRequestIds.some((requestId) => !stringValue(requestId))) {
      issues.push(`${id || index} requires at least one valid asset request_id`);
    }
    if (booleanValue(asset.required) === null) issues.push(`${id || index} asset.required must be boolean`);
    if (!stringValue(shot.subtitle_safe_area)) issues.push(`${id || index} missing subtitle_safe_area`);
    if (!stringValue(shot.transition_in) || !stringValue(shot.transition_out)) {
      issues.push(`${id || index} requires transition_in and transition_out`);
    }
    const copyrightStatus = stringValue(shot.copyright_status);
    const primaryVisualSource = stringValue(shot.primary_visual_source).toLowerCase();
    if (!allowedStoryboardCopyrightStatuses.has(copyrightStatus)) {
      issues.push(`${id || index} has unsupported storyboard copyright_status: ${copyrightStatus || "missing"}`);
    }
    if (!allowedEngines.has(engine)) issues.push(`${id || index} uses unsupported engine: ${engine}`);
    if (forbidden.includes(engine)) issues.push(`${id || index} uses forbidden provider: ${engine}`);
    if (generatedOriginalDynamic) {
      if (engine !== "remotion") issues.push(`${id || index} original dynamic shot must use remotion`);
      if (copyrightStatus !== "project_owned") issues.push(`${id || index} original dynamic shot must be project_owned`);
      if (stringValue(approval.status) !== "approved") issues.push(`${id || index} original dynamic storyboard is not approved`);
    }
    if (editorialMode) {
      const componentTypes = asArray(visual.component_types, `${id || index}.visual.component_types`)
        .map((value) => stringValue(value));
      if (componentTypes.length === 0) issues.push(`${id || index} editorial shot requires visual.component_types`);
      for (const componentType of componentTypes) {
        if (!allowedEditorialComponents.has(componentType)) {
          issues.push(`${id || index} uses unsupported editorial component: ${componentType || "empty"}`);
        }
      }
      if (/real_vehicle_media|restricted_video|official_video/.test(primaryVisualSource)) {
        issues.push(`${id || index} editorial shot still depends on restricted video`);
      }
      if (engine === "image") issues.push(`${id || index} editorial shot cannot use image-only engine`);
      if (componentTypes.includes("official_news_image") && !["pending", "cleared"].includes(copyrightStatus)) {
        issues.push(`${id || index} official news image copyright must remain pending or cleared`);
      }
      if (stringValue(approval.status) === "pending" && previewStatus === "approved") {
        issues.push(`${id || index} cannot retain approved preview in a pending editorial revision`);
      }
    }
    if (originalEditorialMode) {
      const componentTypes = asArray(visual.component_types, `${id || index}.visual.component_types`)
        .map((value) => stringValue(value));
      if (componentTypes.length === 0) issues.push(`${id || index} original editorial shot requires visual.component_types`);
      for (const componentType of componentTypes) {
        if (!allowedOriginalEditorialComponents.has(componentType)) {
          issues.push(`${id || index} uses unsupported original editorial component: ${componentType || "empty"}`);
        }
      }
      if (primaryVisualSource !== "project_owned_original_visual_plan") {
        issues.push(`${id || index} original editorial shot has external or unsupported primary_visual_source`);
      }
      if (copyrightStatus !== "project_owned_when_generated") {
        issues.push(`${id || index} original editorial copyright_status must be project_owned_when_generated`);
      }
      if (engine === "image" || engine === "footage") {
        issues.push(`${id || index} original editorial shot cannot use external media engine`);
      }
      const previewFrame = stringValue(shot.preview_frame);
      if (!previewFrame || !existsSync(projectPath(previewFrame))) {
        issues.push(`${id || index} original editorial preview_frame is missing`);
      }
      if (stringValue(approval.status) === "pending" && previewStatus === "approved") {
        issues.push(`${id || index} cannot retain approved preview in a pending original editorial revision`);
      }
    }
    if (engine === "heygen") {
      if (booleanValue(shot.presenter_required) !== true) issues.push(`${id || index} uses HeyGen without presenter_required`);
      if (!stringValue(shot.presenter_reason)) issues.push(`${id || index} uses HeyGen without presenter_reason`);
      if (!heygenAllowedFor.has(segmentRole)) issues.push(`${id || index} uses HeyGen for disallowed segment_role: ${segmentRole}`);
    }
  });

  if (shots.length === 0) issues.push("storyboard requires at least one shot");
  if (shots.length > 1 && shots.every((value) => stringValue(asRecord(value, "shot").engine).toLowerCase() === "image")) {
    issues.push("image-only slideshow is forbidden");
  }
  if (Math.abs(expectedStart - totalDuration) > 0.001) {
    issues.push("shot timeline does not equal total_duration_seconds");
  }

  failIfIssues(inputPath, issues);
} catch (error) {
  issues.push(error instanceof Error ? error.message : String(error));
  failIfIssues(inputPath, issues);
}
