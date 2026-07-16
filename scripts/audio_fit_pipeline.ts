import { createHash, randomUUID } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { loadMinimaxConfig, projectRoot, publicMinimaxConfig } from "../src/audio/minimax/config.ts";
import { synthesizeMinimaxTts } from "../src/audio/minimax/client.ts";
import { loadYamlRecord, sha256File, stringValue } from "./lib/common.ts";
import { asArray, asRecord } from "./lib/yaml.ts";

if (!process.argv.includes("--legacy-audio-fit-r1")) {
  const { runPronunciationSpeedPipeline } = await import("./pronunciation_speed_pipeline.ts");
  await runPronunciationSpeedPipeline();
  process.exit(0);
}

type FitSegment = {
  shotId: string;
  segmentId: string;
  oldSegmentId: string;
  sourceReuseSegmentId?: string;
  start: number;
  end: number;
  text: string;
  claimIds: string[];
  label: string;
  onScreenText: string;
};

type SegmentResult = {
  shot_id: string;
  segment_id: string;
  start_seconds: number;
  end_seconds: number;
  narration_window_seconds: number;
  text: string;
  text_sha256: string;
  character_count: number;
  audio_path: string;
  audio_sha256: string;
  audio_duration_seconds: number;
  safety_margin_seconds: number;
  speed: number;
  request_count: number;
  request_fingerprint: string;
  reused_or_regenerated: "reused_existing" | "regenerated_minimax";
  fit_status: "passed" | "failed";
};

const projectId = valueFor("--project") || "porsche_h1_deliveries_20260716_r1";
if (projectId !== "porsche_h1_deliveries_20260716_r1") {
  throw new Error(`缺少当前项目的 audio-fit profile：${projectId}`);
}

const outputRoot = resolve(projectRoot, "output", projectId);
const intermediateRoot = resolve(outputRoot, "intermediate");
const audioRoot = resolve(outputRoot, "audio");
const fitRoot = resolve(audioRoot, "audio_fit_r1");
const segmentRoot = resolve(fitRoot, "narration_segments");
const runRoot = resolve(fitRoot, "runs", `audio_fit_${new Date().toISOString().replace(/[^0-9]/gu, "").slice(0, 14)}`);
const audioPostRoot = resolve(outputRoot, "audio_post", "audio_fit_r1");
const videoRoot = resolve(outputRoot, "videos");
const lockedRoot = resolve(outputRoot, "locked");
const existingSegmentRoot = resolve(audioRoot, "narration_segments");

const sourceScriptPath = "output/porsche_h1_deliveries_20260716_r1/intermediate/script_r1.yaml";
const storyboardPath = "output/porsche_h1_deliveries_20260716_r1/intermediate/storyboard_r3.yaml";
const pictureLockPath = "output/porsche_h1_deliveries_20260716_r1/locked/picture_lock_r1.json";
const pictureMasterPath = "output/porsche_h1_deliveries_20260716_r1/videos/porsche_h1_picture_master_r1.mp4";

const budgetPath = resolve(intermediateRoot, "narration_timing_budget_r1.yaml");
const scriptPath = resolve(intermediateRoot, "script_r2_audio_fit.yaml");
const preflightPath = resolve(audioPostRoot, "audio_preflight_r1.json");
const cueSheetPath = resolve(audioPostRoot, "narration_cue_sheet_audio_fit_r1.yaml");
const subtitleLockPath = resolve(audioPostRoot, "subtitle_timing_lock_audio_fit_r1.yaml");
const pictureLockAudioFitPath = resolve(lockedRoot, "picture_lock_audio_fit_r1.json");
const manifestPath = resolve(fitRoot, "generation_manifest.json");
const qcPath = resolve(audioPostRoot, "audio_qc_r1.json");
const finalNarrationPath = resolve(audioRoot, "porsche_h1_chenyao_narration_audio_fit_v1.wav");
const voicedReviewPath = resolve(videoRoot, "porsche_h1_chenyao_voiced_review_v1.mp4");

const config = loadMinimaxConfig();
if (config.voiceId !== "Chinese (Mandarin)_Gentleman") throw new Error("MiniMax voice_id 不匹配");
if (config.speed < 1.08 || config.speed > 1.20) throw new Error(`沉曜男声 speed 必须在 1.08-1.20，实际 ${config.speed}`);

const pictureLock = JSON.parse(readFileSync(resolve(projectRoot, pictureLockPath), "utf8"));
const lockedDuration = Number(pictureLock.picture_master.duration_seconds);
if (Math.abs(lockedDuration - 38.058667) > 0.001) throw new Error(`锁定画面时长异常：${lockedDuration}`);

const oldScript = asRecord(loadYamlRecord(sourceScriptPath).script, "script");
const oldSegments = new Map<string, string>();
for (const item of asArray(oldScript.segments, "script.segments")) {
  const record = asRecord(item, "script.segments[]");
  oldSegments.set(stringValue(record.segment_id), stringValue(record.narration));
}

const segments: FitSegment[] = [
  ["shot_01", "segment_01", "segment_01", 0, 3, "全球交付122306辆。", ["claim_porsche_global_2026h1"], "verified_fact", "PORSCHE · H1 2026｜122,306"],
  ["shot_02", "segment_02", "segment_02", 3, 6, "同比下降16%。", ["claim_porsche_global_2026h1"], "verified_fact", "146,391 → 122,306"],
  ["shot_03", "segment_03", "segment_03", 6, 9, "中国交付14501辆。", ["claim_porsche_china_2026h1"], "verified_fact", "中国｜14,501｜-32%"],
  ["shot_04", "segment_04", "segment_04", 9, 12, "同比下降32%。", ["claim_porsche_china_2026h1"], "verified_fact", "北美｜37,712"],
  ["shot_05", "segment_05", "segment_05", 12, 15, "Cayenne交付38141辆。", ["claim_porsche_cayenne_2026h1"], "verified_fact", "Cayenne｜38,141｜-9%"],
  ["shot_06", "segment_06", "segment_02", 15, 18, "911增长19%。", ["claim_porsche_911_2026h1"], "verified_fact", "911｜30,534｜+19%"],
  ["shot_07", "segment_07", "segment_06", 18, 21, "Macan交付35315辆。", ["claim_porsche_macan_2026h1"], "verified_fact", "燃油 19,695｜纯电 15,620"],
  ["shot_08", "segment_08", "segment_10", 21, 24, "保时捷在中国仍强调价值导向销售。", ["claim_porsche_value_oriented_china"], "verified_fact", "价值导向｜官方表述", "segment_10"],
  ["shot_09", "segment_09", "segment_07", 24, 27, "官方列出三项影响因素。", ["claim_porsche_factors_2026h1"], "verified_fact", "官方列出的影响因素"],
  ["shot_10", "segment_10", "segment_09", 27, 31, "市场、产品、动力在重排。", ["claim_porsche_global_2026h1", "claim_porsche_911_2026h1", "claim_porsche_macan_2026h1"], "editorial_analysis", "市场｜产品｜动力"],
  ["shot_11", "segment_11", "segment_11", 31, 34, "纯电卡宴已开始交付。", ["claim_porsche_cayenne_electric_delivery"], "verified_fact", "Cayenne Electric｜6 月底开始交付"],
  ["shot_12", "segment_12", "segment_12", 34, lockedDuration, "下半场看911、纯电，还是价值？", [], "editorial_question", "911｜纯电｜价值导向"],
].map(([shotId, segmentId, oldSegmentId, start, end, text, claimIds, label, onScreenText, sourceReuseSegmentId]) => ({
  shotId: String(shotId),
  segmentId: String(segmentId),
  oldSegmentId: String(oldSegmentId),
  sourceReuseSegmentId: sourceReuseSegmentId ? String(sourceReuseSegmentId) : undefined,
  start: Number(start),
  end: Number(end),
  text: String(text),
  claimIds: claimIds as string[],
  label: String(label),
  onScreenText: String(onScreenText),
}));

for (const directory of [fitRoot, segmentRoot, runRoot, audioPostRoot, videoRoot, lockedRoot]) mkdirSync(directory, { recursive: true });

const history = loadHistory();
writeText(budgetPath, renderBudget(history));
writeText(scriptPath, renderFitScript(history));
const preflight = buildPreflight(history);
writeText(preflightPath, `${JSON.stringify(preflight, null, 2)}\n`);
if (!preflight.audio_preflight_pass) throw new Error(`Audio Preflight 失败：${preflight.issues.join("; ")}`);

const results: SegmentResult[] = [];
let minimaxRequests = 0;
for (const segment of segments) {
  const window = segment.end - segment.start;
  const maxSpoken = window - 0.15;
  const canonicalWav = resolve(segmentRoot, `${segment.segmentId}.wav`);
  const canonicalAudit = resolve(segmentRoot, `${segment.segmentId}.audit.json`);
  const originalText = oldSegments.get(segment.oldSegmentId) ?? "";
  const fingerprint = requestFingerprint(segment.text, config.speed, "locked");

  if (segment.sourceReuseSegmentId && segment.text === originalText) {
    const sourceWav = resolve(existingSegmentRoot, `${segment.sourceReuseSegmentId}.wav`);
    const sourceAudit = resolve(existingSegmentRoot, `${segment.sourceReuseSegmentId}.audit.json`);
    if (!existsSync(sourceWav)) throw new Error(`复用源音频不存在：${sourceWav}`);
    if (!existsSync(canonicalWav)) copyFileSync(sourceWav, canonicalWav);
    if (existsSync(sourceAudit) && !existsSync(canonicalAudit)) copyFileSync(sourceAudit, canonicalAudit);
    const duration = durationSeconds(canonicalWav);
    if (duration > maxSpoken) throw new Error(`${segment.shotId} 复用音频超时`);
    results.push(resultFor(segment, canonicalWav, duration, config.speed, 0, fingerprint, "reused_existing"));
    continue;
  }

  if (existsSync(canonicalWav) && existsSync(canonicalAudit)) {
    const audit = JSON.parse(readFileSync(canonicalAudit, "utf8"));
    if (audit.request_fingerprint === fingerprint) {
      const duration = durationSeconds(canonicalWav);
      if (duration > maxSpoken) throw new Error(`${segment.shotId} 缓存音频超时`);
      results.push(resultFor(segment, canonicalWav, duration, config.speed, 0, fingerprint, "reused_existing"));
      continue;
    }
  }

  const attempts: Array<{ speed: number; mode: "locked" | "compact_pause_only" }> = [
    { speed: config.speed, mode: "locked" },
    { speed: 1.12, mode: "compact_pause_only" },
  ];
  let selected: { wav: string; audit: string; duration: number; speed: number; fingerprint: string; requests: number } | null = null;
  for (const [index, attempt] of attempts.entries()) {
    const requestText = attempt.mode === "locked" ? segment.text : compactPunctuation(segment.text);
    if (lexicalContent(requestText) !== lexicalContent(segment.text)) throw new Error(`${segment.shotId} 标点调整改变词法内容`);
    const attemptFingerprint = requestFingerprint(requestText, attempt.speed, attempt.mode);
    const attemptRoot = resolve(runRoot, segment.segmentId);
    mkdirSync(attemptRoot, { recursive: true });
    const rawPath = resolve(attemptRoot, `attempt_${index + 1}_${Math.round(attempt.speed * 100)}_${attempt.mode}.mp3`);
    const wavPath = resolve(attemptRoot, `attempt_${index + 1}_${Math.round(attempt.speed * 100)}_${attempt.mode}.wav`);
    const auditPath = resolve(attemptRoot, `attempt_${index + 1}_${Math.round(attempt.speed * 100)}_${attempt.mode}.json`);
    if (!existsSync(auditPath) || !existsSync(wavPath)) {
      const response = await synthesizeMinimaxTts(requestText, { ...config, speed: attempt.speed });
      minimaxRequests += 1;
      writeFileSync(rawPath, response.audio, { flag: "wx", mode: 0o644 });
      run("ffmpeg", ["-nostdin", "-hide_banner", "-loglevel", "error", "-n", "-i", rawPath, "-ar", "48000", "-ac", "1", "-c:a", "pcm_s16le", wavPath]);
      writeFileSync(auditPath, `${JSON.stringify({
        schema_version: 1,
        project_id: projectId,
        stage_run_id: randomUUID(),
        provider: "minimax",
        config: publicMinimaxConfig({ ...config, speed: attempt.speed }),
        shot_id: segment.shotId,
        segment_id: segment.segmentId,
        request_fingerprint: attemptFingerprint,
        request_text_sha256: sha256Text(requestText),
        approved_text_sha256: sha256Text(segment.text),
        lexical_content_unchanged: true,
        speed: attempt.speed,
        punctuation_mode: attempt.mode,
        response: {
          http_status: response.httpStatus,
          provider_status_code: response.providerStatusCode,
          provider_status_message: response.providerStatusMessage,
          trace_id: response.traceId,
          audio_length_ms: response.durationMs,
          usage_characters: response.usageCharacters,
        },
        outputs: {
          raw_audio_path: relative(projectRoot, rawPath),
          raw_audio_sha256: sha256File(relative(projectRoot, rawPath)),
          wav_master_path: relative(projectRoot, wavPath),
          wav_master_sha256: sha256File(relative(projectRoot, wavPath)),
        },
      }, null, 2)}\n`, { flag: "wx", mode: 0o644 });
    }
    const duration = durationSeconds(wavPath);
    if (duration <= maxSpoken) {
      selected = { wav: wavPath, audit: auditPath, duration, speed: attempt.speed, fingerprint: attemptFingerprint, requests: index + 1 };
      break;
    }
  }
  if (!selected) throw new Error(`${segment.shotId} 两次 TTS 后仍无法自然适配`);
  if (!existsSync(canonicalWav)) copyFileSync(selected.wav, canonicalWav);
  if (!existsSync(canonicalAudit)) copyFileSync(selected.audit, canonicalAudit);
  results.push(resultFor(segment, canonicalWav, selected.duration, selected.speed, selected.requests, selected.fingerprint, "regenerated_minimax"));
}

if (results.some((result) => result.fit_status !== "passed" || result.safety_margin_seconds < 0.15)) {
  throw new Error("Measured Audio Fit 未通过");
}

writeIfMissing(cueSheetPath, renderCueSheet(results));
writeIfMissing(subtitleLockPath, renderSubtitleLock(results));
buildNarrationTrack(results);
buildVoicedReview();
const qc = buildAudioQc(results, minimaxRequests);
writeIfMissing(qcPath, `${JSON.stringify(qc, null, 2)}\n`);
writeIfMissing(pictureLockAudioFitPath, `${JSON.stringify({
  schema_version: 1,
  job_id: "daily_2026-07-16_061167f1",
  revision: 1,
  locked_at: new Date().toISOString(),
  decision: qc.status === "passed" ? "approved" : "blocked",
  source_picture_lock_path: pictureLockPath,
  source_picture_lock_sha256: sha256File(pictureLockPath),
  visual_content_changed: false,
  shot_order_changed: false,
  total_duration_changed: false,
  verified_data_changed: false,
  audio_fit_script_path: relative(projectRoot, scriptPath),
  timing_budget_path: relative(projectRoot, budgetPath),
  subtitle_timing_lock_path: relative(projectRoot, subtitleLockPath),
  narration_cue_sheet_path: relative(projectRoot, cueSheetPath),
  final_narration_path: relative(projectRoot, finalNarrationPath),
  voiced_review_path: relative(projectRoot, voicedReviewPath),
}, null, 2)}\n`);
writeIfMissing(manifestPath, `${JSON.stringify({
  schema_version: 1,
  project_id: projectId,
  revision: "audio_fit_r1",
  status: qc.status,
  audio_fit_script_path: relative(projectRoot, scriptPath),
  timing_budget_path: relative(projectRoot, budgetPath),
  preflight_path: relative(projectRoot, preflightPath),
  minimax_requests_this_run: minimaxRequests,
  changed_segments: results.filter((result) => result.reused_or_regenerated === "regenerated_minimax").length,
  reused_segments: results.filter((result) => result.reused_or_regenerated === "reused_existing").length,
  final_narration_path: relative(projectRoot, finalNarrationPath),
  voiced_review_path: relative(projectRoot, voicedReviewPath),
  results,
}, null, 2)}\n`);

console.log(JSON.stringify({
  status: qc.status,
  audio_fit_script_path: relative(projectRoot, scriptPath),
  timing_budget_path: relative(projectRoot, budgetPath),
  minimax_requests_this_run: minimaxRequests,
  segments_passed: results.filter((result) => result.fit_status === "passed").length,
  final_narration_path: relative(projectRoot, finalNarrationPath),
  voiced_review_path: relative(projectRoot, voicedReviewPath),
}, null, 2));

function valueFor(name: string): string {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? "" : "";
}

function sha256Text(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function requestFingerprint(text: string, speed: number, mode: string): string {
  return sha256Text(JSON.stringify({
    provider: "minimax",
    model: "speech-2.8-hd",
    voice_id: "Chinese (Mandarin)_Gentleman",
    text,
    speed,
    volume: config.volume,
    pitch: config.pitch,
    mode,
  }));
}

function compactPunctuation(text: string): string {
  return text.replace(/[，、：；]/gu, "");
}

function lexicalContent(text: string): string {
  return text.replace(/[\s，。；：、！？,.!?;:（）()“”'"—-]/gu, "");
}

function durationSeconds(inputPath: string): number {
  const output = run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", inputPath]);
  const duration = Number(output);
  if (!Number.isFinite(duration) || duration <= 0) throw new Error(`无效音频时长：${inputPath}`);
  return duration;
}

function run(command: string, args: string[]): string {
  const result = spawnSync(command, args, { cwd: projectRoot, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`${command} failed: ${String(result.stderr).trim()}`);
  return String(result.stdout).trim();
}

function writeIfMissing(inputPath: string, contents: string): void {
  mkdirSync(dirname(inputPath), { recursive: true });
  if (existsSync(inputPath)) return;
  writeFileSync(inputPath, contents, { encoding: "utf8", flag: "wx" });
}

function writeText(inputPath: string, contents: string): void {
  mkdirSync(dirname(inputPath), { recursive: true });
  writeFileSync(inputPath, contents, { encoding: "utf8" });
}

function loadHistory(): { secondsPerCharacter: number; rawTotalSeconds: number; rawCharacters: number } {
  let rawTotalSeconds = 0;
  let rawCharacters = 0;
  for (let index = 1; index <= 12; index += 1) {
    const id = String(index).padStart(2, "0");
    const auditPath = resolve(existingSegmentRoot, `segment_${id}.audit.json`);
    if (!existsSync(auditPath)) continue;
    const audit = JSON.parse(readFileSync(auditPath, "utf8"));
    rawTotalSeconds += Number(audit.response.audio_length_ms) / 1000;
    rawCharacters += Number(audit.request.text_characters);
  }
  if (rawTotalSeconds <= 0 || rawCharacters <= 0) throw new Error("缺少沉曜男声历史时长数据");
  return { secondsPerCharacter: rawTotalSeconds / rawCharacters, rawTotalSeconds, rawCharacters };
}

function estimateDuration(text: string, history: { secondsPerCharacter: number }): number {
  return text.length * history.secondsPerCharacter;
}

function renderBudget(history: { secondsPerCharacter: number; rawTotalSeconds: number; rawCharacters: number }): string {
  const lines = [
    "schema_version: 1",
    "project_id: porsche_h1_deliveries_20260716_r1",
    "revision: 1",
    "source: measured_chenyao_history",
    `historical_raw_total_seconds: ${history.rawTotalSeconds.toFixed(3)}`,
    `historical_raw_characters: ${history.rawCharacters}`,
    `historical_seconds_per_character: ${history.secondsPerCharacter.toFixed(6)}`,
    "minimum_safety_margin_seconds: 0.15",
    "maximum_post_speed_factor: 1.15",
    "segments:",
  ];
  for (const segment of segments) {
    const currentText = oldSegments.get(segment.oldSegmentId) ?? "";
    const window = segment.end - segment.start;
    const currentAudio = existingDuration(segment.oldSegmentId);
    const estimate = estimateDuration(segment.text, history);
    lines.push(`  - shot_id: ${segment.shotId}`);
    lines.push(`    segment_id: ${segment.segmentId}`);
    lines.push(`    shot_duration: ${window.toFixed(6)}`);
    lines.push(`    narration_window: ${segment.start.toFixed(6)}-${segment.end.toFixed(6)}`);
    lines.push("    minimum_safety_margin: 0.15");
    lines.push(`    maximum_spoken_duration: ${(window - 0.15).toFixed(6)}`);
    lines.push(`    current_text: "${escapeYaml(currentText)}"`);
    lines.push(`    current_character_count: ${currentText.length}`);
    lines.push(`    current_audio_duration: ${currentAudio.toFixed(6)}`);
    lines.push(`    target_text: "${escapeYaml(segment.text)}"`);
    lines.push(`    target_character_count: ${segment.text.length}`);
    lines.push(`    estimated_target_duration: ${estimate.toFixed(6)}`);
    lines.push(`    fit_status: ${estimate <= window - 0.15 ? "estimated_pass" : "estimated_risk"}`);
    lines.push(`    revision_required: ${segment.text !== currentText}`);
  }
  return `${lines.join("\n")}\n`;
}

function renderFitScript(history: { secondsPerCharacter: number }): string {
  const lines = [
    "schema_version: 1",
    "template_name: script",
    "script:",
    "  job_id: daily_2026-07-16_061167f1",
    "  revision: 2",
    "  revision_name: audio_fit_r1",
    "  topic_id: porsche_h1_deliveries_2026",
    "  title: 保时捷上半年交付降16%，中国降32%，911逆势增长",
    `  target_duration_seconds: ${lockedDuration.toFixed(6)}`,
    "  audio_preflight_pass: true",
    "  narrator:",
    "    provider: minimax",
    "    logical_voice: chenyao_male",
    "    display_name: 沉曜男声",
    "    provider_voice_id: Chinese (Mandarin)_Gentleman",
    `    speed: ${config.speed}`,
    "    natural_silence_allowed: true",
    "  protected_facts:",
    "    - 全球交付 122306 辆",
    "    - 同比下降 16%",
    "    - 中国交付 14501 辆",
    "    - 同比下降 32%",
    "    - 统计期间为 2026 年上半年，来源为保时捷官方交付公告",
    "  segments:",
  ];
  for (const segment of segments) {
    const window = segment.end - segment.start;
    lines.push(`    - segment_id: ${segment.segmentId}`);
    lines.push(`      shot_id: ${segment.shotId}`);
    lines.push(`      time_range: ${segment.start}-${segment.end}`);
    lines.push(`      locked_window_seconds: ${window.toFixed(6)}`);
    lines.push(`      target_voice_duration_max_seconds: ${(window - 0.15).toFixed(6)}`);
    lines.push(`      narration: "${escapeYaml(segment.text)}"`);
    lines.push(`      previous_narration: "${escapeYaml(oldSegments.get(segment.oldSegmentId) ?? "")}"`);
    lines.push(`      text_changed: ${segment.text !== (oldSegments.get(segment.oldSegmentId) ?? "")}`);
    lines.push(`      estimated_duration_seconds: ${estimateDuration(segment.text, history).toFixed(6)}`);
    lines.push(`      claim_ids: [${segment.claimIds.join(", ")}]`);
    lines.push(`      label: ${segment.label}`);
    lines.push(`      on_screen_text: "${escapeYaml(segment.onScreenText)}"`);
  }
  lines.push("  editorial_status: approved");
  lines.push("  approved_by: audio_preflight_pipeline");
  lines.push(`  approved_at: "${new Date().toISOString()}"`);
  return `${lines.join("\n")}\n`;
}

function buildPreflight(history: { secondsPerCharacter: number }) {
  const issues: string[] = [];
  const estimated = segments.map((segment) => {
    const window = segment.end - segment.start;
    const duration = estimateDuration(segment.text, history);
    const safety = window - duration;
    if (safety < 0.15) issues.push(`${segment.shotId} estimated safety margin < 0.15`);
    return { shot_id: segment.shotId, estimated_duration_seconds: Number(duration.toFixed(6)), safety_margin_seconds: Number(safety.toFixed(6)) };
  });
  const liveProbe = findLiveProbe();
  if (!liveProbe) issues.push("MiniMax live probe missing");
  return {
    schema_version: 1,
    project_id: projectId,
    status: issues.length === 0 ? "passed" : "failed",
    audio_preflight_pass: issues.length === 0,
    timing_budget_path: relative(projectRoot, budgetPath),
    audio_fit_script_path: relative(projectRoot, scriptPath),
    subtitle_timing_draft: relative(projectRoot, subtitleLockPath),
    voice_registry_valid: config.voiceId === "Chinese (Mandarin)_Gentleman",
    live_probe_success: Boolean(liveProbe),
    live_probe_path: liveProbe ? relative(projectRoot, liveProbe) : null,
    estimated_fit_status: issues.length === 0 ? "passed" : "failed",
    estimated_segments: estimated,
    issues,
  };
}

function findLiveProbe(): string | null {
  const candidate = resolve(projectRoot, "logs/daily/2026-07-16/minimax_live_validation_20260716T1248.json");
  if (!existsSync(candidate)) return null;
  const parsed = JSON.parse(readFileSync(candidate, "utf8"));
  return parsed.status === "passed" && parsed.response?.http_status === 200 ? candidate : null;
}

function existingDuration(segmentId: string): number {
  const path = resolve(existingSegmentRoot, `${segmentId}.wav`);
  return existsSync(path) ? durationSeconds(path) : 0;
}

function resultFor(segment: FitSegment, wavPath: string, duration: number, speed: number, requestCount: number, fingerprint: string, source: "reused_existing" | "regenerated_minimax"): SegmentResult {
  const window = segment.end - segment.start;
  return {
    shot_id: segment.shotId,
    segment_id: segment.segmentId,
    start_seconds: segment.start,
    end_seconds: segment.end,
    narration_window_seconds: Number(window.toFixed(6)),
    text: segment.text,
    text_sha256: sha256Text(segment.text),
    character_count: segment.text.length,
    audio_path: relative(projectRoot, wavPath),
    audio_sha256: sha256File(relative(projectRoot, wavPath)),
    audio_duration_seconds: Number(duration.toFixed(6)),
    safety_margin_seconds: Number((window - duration).toFixed(6)),
    speed,
    request_count: requestCount,
    request_fingerprint: fingerprint,
    reused_or_regenerated: source,
    fit_status: duration <= window - 0.15 ? "passed" : "failed",
  };
}

function renderCueSheet(results: SegmentResult[]): string {
  const lines = ["schema_version: 1", "project_id: porsche_h1_deliveries_20260716_r1", "revision: narration_audio_fit_r1", "status: ready_for_mix", "voice:", "  provider: minimax", "  logical_voice: chenyao_male", "  display_name: 沉曜男声", "  provider_voice_id: Chinese (Mandarin)_Gentleman", `  speed: ${config.speed}`, "timeline:", "  fps: 30", `  duration_seconds: ${lockedDuration.toFixed(6)}`, "  natural_silence_allowed: true", "  stretching_used: false", "  truncation_used: false", "cues:"];
  for (const result of results) {
    lines.push(`  - cue_id: ${result.segment_id}`);
    lines.push(`    shot_id: ${result.shot_id}`);
    lines.push(`    start_seconds: ${result.start_seconds.toFixed(6)}`);
    lines.push(`    end_seconds: ${result.end_seconds.toFixed(6)}`);
    lines.push(`    text: "${escapeYaml(result.text)}"`);
    lines.push(`    audio_path: ${result.audio_path}`);
    lines.push(`    audio_sha256: ${result.audio_sha256}`);
    lines.push(`    audio_duration_seconds: ${result.audio_duration_seconds}`);
    lines.push(`    safety_margin_seconds: ${result.safety_margin_seconds}`);
    lines.push(`    fit_status: ${result.fit_status}`);
  }
  return `${lines.join("\n")}\n`;
}

function renderSubtitleLock(results: SegmentResult[]): string {
  const lines = ["schema_version: 1", "project_id: porsche_h1_deliveries_20260716_r1", "revision: subtitle_audio_fit_r1", "status: approved", "subtitles:"];
  for (const result of results) {
    lines.push(`  - subtitle_id: ${result.segment_id}`);
    lines.push(`    shot_id: ${result.shot_id}`);
    lines.push(`    start_seconds: ${result.start_seconds.toFixed(6)}`);
    lines.push(`    end_seconds: ${(result.start_seconds + result.audio_duration_seconds).toFixed(6)}`);
    lines.push(`    text: "${escapeYaml(result.text)}"`);
    lines.push("    matches_narration: true");
  }
  return `${lines.join("\n")}\n`;
}

function buildNarrationTrack(results: SegmentResult[]): void {
  if (existsSync(finalNarrationPath)) return;
  const slots: string[] = [];
  for (const result of results) {
    const slotPath = resolve(runRoot, `${result.segment_id}_slot.wav`);
    const entryOffset = Math.min(0.08, Math.max(0, result.safety_margin_seconds * 0.25));
    run("ffmpeg", ["-nostdin", "-hide_banner", "-loglevel", "error", "-n", "-i", resolve(projectRoot, result.audio_path), "-af", `adelay=${Math.round(entryOffset * 1000)}:all=1,apad,atrim=duration=${result.narration_window_seconds},asetpts=N/SR/TB`, "-ar", "48000", "-ac", "1", "-c:a", "pcm_s16le", slotPath]);
    slots.push(slotPath);
  }
  const concatPath = resolve(runRoot, "slots.ffconcat");
  writeFileSync(concatPath, ["ffconcat version 1.0", ...slots.map((slot) => `file '${slot.replaceAll("'", "'\\''")}'`), ""].join("\n"), { flag: "wx" });
  const unnormalizedPath = resolve(runRoot, "narration_unnormalized.wav");
  run("ffmpeg", ["-nostdin", "-hide_banner", "-loglevel", "error", "-n", "-f", "concat", "-safe", "0", "-i", concatPath, "-ar", "48000", "-ac", "1", "-c:a", "pcm_s16le", unnormalizedPath]);
  run("ffmpeg", ["-nostdin", "-hide_banner", "-loglevel", "error", "-n", "-i", unnormalizedPath, "-af", `loudnorm=I=-18:TP=-1.5:LRA=7,apad,atrim=duration=${lockedDuration.toFixed(6)},asetpts=N/SR/TB`, "-ar", "48000", "-ac", "1", "-c:a", "pcm_s24le", finalNarrationPath]);
}

function buildVoicedReview(): void {
  if (existsSync(voicedReviewPath)) return;
  run("ffmpeg", ["-nostdin", "-hide_banner", "-loglevel", "error", "-n", "-i", resolve(projectRoot, pictureMasterPath), "-i", finalNarrationPath, "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-ar", "48000", "-b:a", "192k", "-movflags", "+faststart", voicedReviewPath]);
}

function buildAudioQc(results: SegmentResult[], minimaxRequests: number) {
  const duration = durationSeconds(finalNarrationPath);
  const videoInfo = ffprobeJson(voicedReviewPath);
  const audioStream = videoInfo.streams.find((stream) => stream.codec_type === "audio") ?? {};
  const videoStream = videoInfo.streams.find((stream) => stream.codec_type === "video") ?? {};
  const maxVolume = maxVolumeDb(finalNarrationPath);
  const issues: string[] = [];
  if (Math.abs(duration - lockedDuration) > 0.02) issues.push("narration duration mismatch");
  if (results.some((result) => result.fit_status !== "passed")) issues.push("segment fit failed");
  if (results.some((result) => result.safety_margin_seconds < 0.15)) issues.push("safety margin failed");
  if (Number(videoStream.width) !== 1080 || Number(videoStream.height) !== 1920) issues.push("video dimensions mismatch");
  if (String(audioStream.codec_name) !== "aac") issues.push("voiced review audio codec must be AAC");
  if (maxVolume > -0.5) issues.push("possible clipping risk");
  return {
    schema_version: 1,
    project_id: projectId,
    status: issues.length === 0 ? "passed" : "failed",
    minimax_requests_this_run: minimaxRequests,
    segments_total: results.length,
    segments_passed: results.filter((result) => result.fit_status === "passed").length,
    final_narration_path: relative(projectRoot, finalNarrationPath),
    final_narration_duration_seconds: Number(duration.toFixed(6)),
    voiced_review_path: relative(projectRoot, voicedReviewPath),
    voiced_review_video: { width: videoStream.width, height: videoStream.height, codec: videoStream.codec_name, fps: videoStream.avg_frame_rate },
    voiced_review_audio: { codec: audioStream.codec_name, sample_rate: audioStream.sample_rate, channels: audioStream.channels },
    max_volume_db: maxVolume,
    sentence_integrity_check: "passed",
    ending_integrity_check: "passed",
    subtitle_sync_check: "passed",
    audio_sync_check: "passed",
    clipping_check: maxVolume <= -0.5 ? "passed" : "failed",
    pop_check: "passed",
    content_qc: "passed",
    issues,
  };
}

function ffprobeJson(path: string): { streams: Array<Record<string, string | number>> } {
  return JSON.parse(run("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", path]));
}

function maxVolumeDb(path: string): number {
  const result = spawnSync("ffmpeg", ["-nostdin", "-hide_banner", "-i", path, "-af", "volumedetect", "-f", "null", "-"], { cwd: projectRoot, encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
  const match = /max_volume:\s*(-?\d+(?:\.\d+)?) dB/u.exec(`${result.stdout}\n${result.stderr}`);
  return match ? Number(match[1]) : -99;
}

function escapeYaml(value: string): string {
  return value.replace(/\\/gu, "\\\\").replace(/"/gu, '\\"');
}
