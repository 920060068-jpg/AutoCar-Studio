import { asArray, asRecord } from "./lib/yaml.ts";
import {
  booleanValue,
  failIfIssues,
  loadYamlRecord,
  numberValue,
  positionalArgs,
  stringValue,
} from "./lib/common.ts";

const [inputPath = "CONFIG.yaml"] = positionalArgs(process.argv.slice(2));
const issues: string[] = [];

try {
  const config = loadYamlRecord(inputPath);
  const project = asRecord(config.project, "project");
  const foundation = asRecord(config.foundation, "foundation");
  const production = asRecord(config.production, "production");
  const productionModes = asRecord(config.production_modes, "production_modes");
  const video = asRecord(config.video, "video");
  const durationTarget = asRecord(video.duration_target_seconds, "video.duration_target_seconds");
  const automation = asRecord(config.automation, "automation");
  const retries = asRecord(config.retries, "retries");
  const quality = asRecord(config.quality, "quality");
  const qualityWeights = asRecord(quality.final_quality_weights, "quality.final_quality_weights");
  const editorialMode = asRecord(config.editorial_mode, "editorial_mode");
  const audio = asRecord(config.audio, "audio");
  const narrationTiming = asRecord(audio.narration_timing, "audio.narration_timing");
  const audioConnection = asRecord(audio.connection, "audio.connection");
  const providers = asRecord(config.providers, "providers");
  const hyperframes = asRecord(providers.hyperframes, "providers.hyperframes");
  const remotion = asRecord(providers.remotion, "providers.remotion");
  const heygen = asRecord(providers.heygen, "providers.heygen");
  const forbiddenPolicy = asRecord(config.forbidden, "forbidden");
  const publishing = asRecord(config.publishing, "publishing");
  const minDuration = numberValue(durationTarget.min);
  const maxDuration = numberValue(durationTarget.max);
  const forbidden = asArray(forbiddenPolicy.providers, "forbidden.providers")
    .map((value) => stringValue(value).toLowerCase())
    .filter(Boolean);
  const forbiddenFormats = asArray(forbiddenPolicy.formats, "forbidden.formats")
    .map((value) => stringValue(value).toLowerCase())
    .filter(Boolean);
  const heygenAllowedFor = asArray(heygen.allowed_for, "providers.heygen.allowed_for")
    .map((value) => stringValue(value).toLowerCase())
    .filter(Boolean);
  const externalApiScopes = asArray(foundation.external_api_scopes, "foundation.external_api_scopes")
    .map((value) => stringValue(value).toLowerCase())
    .filter(Boolean);

  if (numberValue(config.schema_version) !== 3) issues.push("schema_version must be 3");
  if (stringValue(project.name) !== "AutoCar Studio") issues.push("project.name must be AutoCar Studio");
  if (stringValue(project.version) !== "V4") issues.push("project.version must be V4");
  if (numberValue(production.videos_per_day) !== 1) issues.push("production.videos_per_day must be 1");
  if (stringValue(production.daily_start_time) !== "12:00") issues.push("production.daily_start_time must be 12:00");
  if (stringValue(production.timezone_mode) !== "local_system_timezone") {
    issues.push("production.timezone_mode must be local_system_timezone");
  }
  if (stringValue(production.platform) !== "douyin") issues.push("production.platform must be douyin");
  if (stringValue(productionModes.default) !== "editorial") issues.push("production_modes.default must be editorial");
  if (booleanValue(productionModes.press_kit_requires_local_authorized_assets) !== true) {
    issues.push("Press Kit Mode must require local authorized assets");
  }
  if (stringValue(productionModes.unavailable_media_fallback) !== "original_editorial_visual") {
    issues.push("unavailable media must fall back to original_editorial_visual");
  }
  if (numberValue(video.width) !== 1080 || numberValue(video.height) !== 1920) {
    issues.push("video dimensions must be 1080x1920");
  }
  if (stringValue(video.aspect_ratio) !== "9:16") issues.push("video.aspect_ratio must be 9:16");
  if (stringValue(video.resolution) !== "1080x1920") issues.push("video.resolution must be 1080x1920");
  if (numberValue(video.fps) !== 30) issues.push("video.fps must be 30");
  if (minDuration !== 38 || maxDuration !== 45) issues.push("duration target must be 38-45 seconds");
  if (booleanValue(automation.enabled) !== true) issues.push("automation.enabled must be true");
  if (stringValue(automation.mode) !== "daily_auto") issues.push("automation.mode must be daily_auto");
  if (numberValue(automation.max_daily_productions) !== 1) issues.push("automation.max_daily_productions must be 1");
  if (stringValue(automation.start_time_local) !== "12:00") issues.push("automation.start_time_local must be 12:00");
  if (booleanValue(automation.catch_up_after_missed_start) !== true) issues.push("automation catch-up must be enabled");
  if (booleanValue(automation.resume_from_checkpoint) !== true) issues.push("automation checkpoint resume must be enabled");
  if (booleanValue(automation.allow_parallel_daily_runs) !== false) issues.push("parallel daily runs must be disabled");
  if (booleanValue(automation.backfill_previous_dates) !== false) issues.push("previous-date backfill must be disabled");
  if (numberValue(retries.director_revision_max) !== 3) issues.push("director revision max must be 3");
  if (numberValue(retries.script_revision_max) !== 2) issues.push("script revision max must be 2");
  if (numberValue(retries.render_fix_max) !== 3) issues.push("render fix max must be 3");
  if (numberValue(retries.audio_generation_max) !== 3) issues.push("audio generation max must be 3");
  if (stringValue(quality.director_score_operator) !== "greater_than" || numberValue(quality.director_score_threshold) !== 90) {
    issues.push("Director Score must be strictly greater than 90");
  }
  if (stringValue(quality.final_quality_score_operator) !== "greater_than" || numberValue(quality.final_quality_score_threshold) !== 90) {
    issues.push("Final Quality Score must be strictly greater than 90");
  }
  const expectedWeights: Record<string, number> = {
    factual_accuracy: 20,
    opening_three_seconds: 15,
    narrative_and_viewpoint: 15,
    shot_design: 15,
    pacing_and_retention: 10,
    visual_quality: 10,
    subtitles_and_information: 5,
    audio_quality: 5,
    copyright_and_compliance: 5,
  };
  for (const [name, expected] of Object.entries(expectedWeights)) {
    if (numberValue(qualityWeights[name]) !== expected) issues.push(`quality weight ${name} must be ${expected}`);
  }
  const hardGates = asArray(quality.hard_gates, "quality.hard_gates").map((value) => stringValue(value));
  for (const gate of [
    "fact_check",
    "data_sources",
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
  ]) {
    if (!hardGates.includes(gate)) issues.push(`quality.hard_gates missing ${gate}`);
  }
  if (booleanValue(editorialMode.enabled) !== true) issues.push("editorial_mode.enabled must be true");
  if (stringValue(editorialMode.auto_switch_trigger) !== "official_video_legally_unavailable") {
    issues.push("editorial_mode.auto_switch_trigger is invalid");
  }
  if (booleanValue(editorialMode.stop_restricted_video_search) !== true) {
    issues.push("editorial_mode must stop restricted video search");
  }
  if (booleanValue(editorialMode.wait_for_pr_assets) !== false) {
    issues.push("editorial_mode.wait_for_pr_assets must be false");
  }
  if (booleanValue(editorialMode.official_news_images_allowed) !== true) {
    issues.push("editorial_mode must allow rule-compliant official news images");
  }
  if (booleanValue(editorialMode.official_news_images_require_clearance) !== true) {
    issues.push("editorial_mode official news images must require clearance");
  }
  if (stringValue(editorialMode.output_type) !== "editorial_storyboard") {
    issues.push("editorial_mode.output_type must be editorial_storyboard");
  }
  const editorialComponents = asArray(editorialMode.allowed_visual_components, "editorial_mode.allowed_visual_components")
    .map((value) => stringValue(value));
  for (const component of ["official_news_image", "verified_data_animation", "infographic", "timeline", "parameter_card", "map", "title_animation"]) {
    if (!editorialComponents.includes(component)) issues.push(`editorial_mode missing allowed component: ${component}`);
  }
  if (stringValue(audio.narrator) !== "沉曜男声") issues.push("audio.narrator must be 沉曜男声");
  if (stringValue(audio.narrator_key) !== "chenyao_male") issues.push("audio.narrator_key must be chenyao_male");
  if (stringValue(audio.provider_voice_id) !== "Chinese (Mandarin)_Gentleman") {
    issues.push("audio.provider_voice_id must be Chinese (Mandarin)_Gentleman");
  }
  if (booleanValue(narrationTiming.full_video_occupancy_required) !== false) {
    issues.push("audio.narration_timing.full_video_occupancy_required must be false");
  }
  if (booleanValue(narrationTiming.natural_silence_between_shots_allowed) !== true) {
    issues.push("audio.narration_timing.natural_silence_between_shots_allowed must be true");
  }
  if (booleanValue(narrationTiming.timing_budget_required_before_tts) !== true) {
    issues.push("audio.narration_timing.timing_budget_required_before_tts must be true");
  }
  if (booleanValue(narrationTiming.audio_fit_script_required_before_tts) !== true) {
    issues.push("audio.narration_timing.audio_fit_script_required_before_tts must be true");
  }
  if (booleanValue(narrationTiming.audio_preflight_required_before_tts) !== true) {
    issues.push("audio.narration_timing.audio_preflight_required_before_tts must be true");
  }
  if (numberValue(narrationTiming.minimum_safety_margin_seconds) !== 0.15) {
    issues.push("audio.narration_timing.minimum_safety_margin_seconds must be 0.15");
  }
  if (numberValue(narrationTiming.maximum_post_speed_factor) !== 1.15) {
    issues.push("audio.narration_timing.maximum_post_speed_factor must be 1.15");
  }
  if (numberValue(narrationTiming.auto_condense_revision_max) !== 2) {
    issues.push("audio.narration_timing.auto_condense_revision_max must be 2");
  }
  if (numberValue(narrationTiming.formal_tts_requests_per_shot_max) !== 2) {
    issues.push("audio.narration_timing.formal_tts_requests_per_shot_max must be 2");
  }
  if (booleanValue(narrationTiming.cache_identical_tts_requests) !== true) {
    issues.push("audio.narration_timing.cache_identical_tts_requests must be true");
  }
  if (booleanValue(narrationTiming.number_semantics_required_before_tts) !== true) {
    issues.push("audio.narration_timing.number_semantics_required_before_tts must be true");
  }
  if (booleanValue(narrationTiming.pronunciation_dictionary_required_before_tts) !== true) {
    issues.push("audio.narration_timing.pronunciation_dictionary_required_before_tts must be true");
  }
  if (booleanValue(narrationTiming.display_narration_tts_text_separation_required) !== true) {
    issues.push("audio narration display/narration/tts separation must be required");
  }
  if (stringValue(narrationTiming.voice_registry_path) !== "config/voice_registry.yaml") {
    issues.push("audio narration voice registry path is invalid");
  }
  if (stringValue(narrationTiming.pronunciation_dictionary_path) !== "config/pronunciation_dictionary.yaml") {
    issues.push("audio narration pronunciation dictionary path is invalid");
  }
  if (booleanValue(narrationTiming.speed_calibration_required) !== true) {
    issues.push("audio narration speed calibration must be required");
  }
  if (numberValue(narrationTiming.provider_native_speed_min) !== 1.08 || numberValue(narrationTiming.provider_native_speed_max) !== 1.20) {
    issues.push("audio narration provider native speed range must be 1.08-1.20");
  }
  if (numberValue(narrationTiming.chenyao_default_speed) !== 1.16) {
    issues.push("audio narration chenyao default speed must be 1.16");
  }
  if (booleanValue(narrationTiming.post_speed_change_allowed) !== false) {
    issues.push("audio narration post speed change must be forbidden");
  }
  const narrationTimingPriority = asArray(narrationTiming.priority, "audio.narration_timing.priority")
    .map((value) => stringValue(value));
  if (JSON.stringify(narrationTimingPriority) !== JSON.stringify([
    "natural_speech",
    "subtitle_synchronization",
    "visual_rhythm",
  ])) {
    issues.push("audio narration timing priority must be natural_speech, subtitle_synchronization, visual_rhythm");
  }
  if (stringValue(audio.provider).toLowerCase() !== "minimax") issues.push("audio.provider must be minimax");
  if (stringValue(audio.fallback_provider).toLowerCase() !== "minimax") {
    issues.push("audio.fallback_provider must be minimax");
  }
  if (stringValue(audioConnection.config_source) !== ".env") {
    issues.push("audio.connection.config_source must be .env");
  }
  if (stringValue(audioConnection.credential_source) !== "dotenv") {
    issues.push("audio.connection.credential_source must be dotenv");
  }
  if (booleanValue(audioConnection.live_tts_enabled) !== true) {
    issues.push("audio.connection.live_tts_enabled must be true");
  }
  if (booleanValue(audioConnection.voice_id_mapping_required) !== true) {
    issues.push("audio.connection.voice_id_mapping_required must be true");
  }
  if (!forbidden.includes("kling")) issues.push("forbidden.providers must contain kling");
  for (const format of ["ppt", "image_slideshow", "one_sentence_one_image"]) {
    if (!forbiddenFormats.includes(format)) issues.push(`forbidden.formats must contain ${format}`);
  }
  if (new Set(forbidden).size !== forbidden.length) issues.push("forbidden.providers contains duplicates");
  if (new Set(forbiddenFormats).size !== forbiddenFormats.length) issues.push("forbidden.formats contains duplicates");
  if (booleanValue(publishing.auto_publish) !== false) issues.push("publishing.auto_publish must be false");
  if (booleanValue(publishing.release_candidate_only) !== true) issues.push("publishing.release_candidate_only must be true");
  if (stringValue(publishing.release_candidate_review_mode) !== "automatic") {
    issues.push("release candidate review mode must be automatic");
  }
  if (booleanValue(publishing.manual_publish_review_required) !== true) {
    issues.push("manual publish review must remain required");
  }

  if (booleanValue(foundation.enabled) === true) {
    if (booleanValue(foundation.external_api_enabled) !== true) {
      issues.push("foundation.external_api_enabled must be true for native MiniMax TTS");
    }
    if (externalApiScopes.length !== 1 || externalApiScopes[0] !== "minimax_tts") {
      issues.push("foundation.external_api_scopes must contain only minimax_tts");
    }
    if (booleanValue(foundation.video_generation_enabled) !== true) {
      issues.push("foundation.video_generation_enabled must be true for daily production");
    }
  }

  if (booleanValue(hyperframes.enabled) !== true) issues.push("providers.hyperframes.enabled must be true");
  if (stringValue(hyperframes.role) !== "motion_graphics_and_visual_packaging") {
    issues.push("HyperFrames role must be motion_graphics_and_visual_packaging");
  }
  if (booleanValue(hyperframes.owns_master_timeline) !== false) issues.push("HyperFrames cannot own master timeline");
  if (booleanValue(hyperframes.tts_allowed) !== false) issues.push("HyperFrames TTS must remain disabled");
  if (booleanValue(remotion.enabled) !== true) issues.push("providers.remotion.enabled must be true");
  if (stringValue(remotion.role) !== "master_timeline_editing_subtitles_audio_final_render") {
    issues.push("Remotion role is invalid");
  }
  if (booleanValue(remotion.owns_master_timeline) !== true) issues.push("Remotion must own master timeline");
  if (!heygenAllowedFor.includes("host_segment") || heygenAllowedFor.length !== 1) {
    issues.push("providers.heygen.allowed_for must contain only host_segment");
  }
  if (booleanValue(heygen.whole_video_allowed) !== false) issues.push("HeyGen whole_video_allowed must be false");
  if (booleanValue(foundation.enabled) === true && booleanValue(heygen.enabled) !== false) {
    issues.push("HeyGen must remain disabled during Foundation");
  }

  failIfIssues(inputPath, issues);
} catch (error) {
  issues.push(error instanceof Error ? error.message : String(error));
  failIfIssues(inputPath, issues);
}
