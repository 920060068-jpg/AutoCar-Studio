import {createHash} from "node:crypto";
import {
  constants as fsConstants,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import {dirname, relative, resolve} from "node:path";
import {spawnSync} from "node:child_process";
import {synthesizeMinimaxTts} from "../src/audio/minimax/client.ts";
import type {MinimaxConfig} from "../src/audio/minimax/config.ts";
import {loadYamlRecord, numberValue, projectRoot, stringValue} from "./lib/common.ts";
import {asArray, asRecord} from "./lib/yaml.ts";

const projectId = "xiaomi_skynomad_20260714_r1";
const keychainService = "autocar-studio-minimax-paygo";
const keychainAccount = "AutoCar-Studio";
const logicalVoice = "chenyao_male";
const displayVoice = "沉曜男声";
const voiceId = "Chinese (Mandarin)_Gentleman";
const scriptPath = resolve(
  projectRoot,
  `output/${projectId}/intermediate/script_r3_audio_fit.yaml`,
);
const audioRoot = resolve(projectRoot, `output/${projectId}/audio`);
const fitRoot = resolve(audioRoot, "audio_fit_r1");
const segmentRoot = resolve(fitRoot, "narration_segments");
const finalNarrationPath = resolve(
  audioRoot,
  "xiaomi_skynomad_chenyao_narration_audio_fit_r1.wav",
);
const oldSegmentRoot = resolve(audioRoot, "narration_segments");

const sha256 = (value: string | Uint8Array): string => (
  createHash("sha256").update(value).digest("hex")
);

const run = (command: string, args: string[]): string => {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(`${command} 失败：${String(result.stderr).trim()}`);
  }
  return String(result.stdout).trim();
};

const durationSeconds = (path: string): number => {
  const value = Number(run("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    path,
  ]));
  if (!Number.isFinite(value) || value <= 0) throw new Error(`无效音频：${path}`);
  return value;
};

const keyResult = spawnSync("security", [
  "find-generic-password",
  "-s", keychainService,
  "-a", keychainAccount,
  "-w",
], {encoding: "utf8"});
if (keyResult.status !== 0) throw new Error("MiniMax Keychain 凭证不存在");
const apiKey = String(keyResult.stdout).trim();
if (!apiKey.startsWith("sk-") || apiKey.length < 40) throw new Error("MiniMax Key 格式错误");
const apiKeyFingerprint = `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`;

const configForSpeed = (speed: number): MinimaxConfig => ({
  apiKey,
  apiBaseUrl: "https://api.minimax.io/v1",
  endpointName: "t2a_v2",
  requestUrl: "https://api.minimax.io/v1/t2a_v2",
  groupId: "",
  model: "speech-2.8-hd",
  voiceId,
  voiceName: displayVoice,
  speed,
  volume: 1,
  pitch: -1,
  languageBoost: "Chinese",
  audioFormat: "mp3",
  sampleRate: 32000,
  bitrate: 128000,
  channels: 1,
  timeoutMs: 120000,
  envFile: `Keychain:${keychainService}`,
});

const compactPausePunctuation = (text: string): string => (
  text.replace(/[，：；]/gu, "")
);
const lexicalContent = (text: string): string => (
  text.replace(/[\s，。；：、！？,.!?;:（）()“”'"—-]/gu, "")
);

type Segment = {
  segmentId: string;
  shotId: string;
  text: string;
  textChanged: boolean;
  windowSeconds: number;
  targetMaxSeconds: number;
  startSeconds: number;
  endSeconds: number;
};

const document = loadYamlRecord(relative(projectRoot, scriptPath));
const script = asRecord(document.script, "script");
const narrator = asRecord(script.narrator, "script.narrator");
if (stringValue(narrator.logical_voice) !== logicalVoice) throw new Error("逻辑声音不匹配");
if (stringValue(narrator.provider_voice_id) !== voiceId) throw new Error("MiniMax voice_id 不匹配");
const segmentValues = asArray(script.segments, "script.segments");
const segments: Segment[] = segmentValues.map((value, index) => {
  const record = asRecord(value, `segments[${index}]`);
  const range = stringValue(record.time_range).split("-").map(Number);
  const segment: Segment = {
    segmentId: stringValue(record.segment_id),
    shotId: stringValue(record.shot_id),
    text: stringValue(record.narration),
    textChanged: record.text_changed === true,
    windowSeconds: numberValue(record.locked_window_seconds),
    targetMaxSeconds: numberValue(record.target_voice_duration_max_seconds),
    startSeconds: range[0],
    endSeconds: range[1],
  };
  if (
    !segment.segmentId || !segment.shotId || !segment.text
    || !Number.isFinite(segment.windowSeconds) || !Number.isFinite(segment.targetMaxSeconds)
    || !Number.isFinite(segment.startSeconds) || !Number.isFinite(segment.endSeconds)
  ) throw new Error(`segments[${index}] 字段不完整`);
  if (Math.abs(segment.endSeconds - segment.startSeconds - segment.windowSeconds) > 0.0001) {
    throw new Error(`${segment.shotId} 时间窗不一致`);
  }
  return segment;
});
if (segments.length !== 15) throw new Error(`必须有 15 个镜头，实际 ${segments.length}`);

for (const path of [fitRoot, segmentRoot]) mkdirSync(path, {recursive: true});
const startedAt = new Date().toISOString();
const runId = `audio_fit_r1_${startedAt.replace(/[^0-9]/gu, "").slice(0, 17)}`;
const runRoot = resolve(fitRoot, "runs", runId);
mkdirSync(runRoot, {recursive: true});

type Attempt = {
  attempt_id: string;
  speed: number;
  punctuation_mode: "locked" | "compact_pause_only";
  request_text_sha256: string;
  lexical_content_sha256: string;
  raw_mp3_path: string;
  trimmed_wav_path: string;
  duration_seconds: number;
  http_status: number;
  provider_status_code: number;
  trace_id: string;
  selected: boolean;
};

type Result = {
  segment_id: string;
  shot_id: string;
  text: string;
  text_sha256: string;
  text_changed: boolean;
  source: "regenerated_minimax" | "reused_previous_minimax";
  window_seconds: number;
  target_max_seconds: number;
  actual_duration_seconds: number;
  safety_margin_seconds: number;
  speed: number;
  punctuation_mode: string;
  status: "passed" | "narration_timing_blocked";
  canonical_segment_path: string;
  canonical_segment_sha256: string;
  attempts: Attempt[];
  entry_offset_seconds: number | null;
  tail_margin_seconds: number | null;
  slot_path: string | null;
};

const results: Result[] = [];
for (const segment of segments) {
  const canonicalPath = resolve(segmentRoot, `${segment.shotId}.wav`);
  if (existsSync(canonicalPath)) throw new Error(`拒绝覆盖：${relative(projectRoot, canonicalPath)}`);

  if (!segment.textChanged) {
    const sourcePath = resolve(oldSegmentRoot, `${segment.shotId}.wav`);
    if (!existsSync(sourcePath)) throw new Error(`复用源文件不存在：${sourcePath}`);
    copyFileSync(sourcePath, canonicalPath, fsConstants.COPYFILE_EXCL);
    const duration = durationSeconds(canonicalPath);
    const sourceSpeed: Record<string, number> = {shot_02: 1, shot_08: 1, shot_11: 1};
    const speed = sourceSpeed[segment.shotId];
    if (!speed) throw new Error(`${segment.shotId} 未登记复用语速`);
    const safety = segment.windowSeconds - duration;
    results.push({
      segment_id: segment.segmentId,
      shot_id: segment.shotId,
      text: segment.text,
      text_sha256: sha256(segment.text),
      text_changed: false,
      source: "reused_previous_minimax",
      window_seconds: segment.windowSeconds,
      target_max_seconds: segment.targetMaxSeconds,
      actual_duration_seconds: Number(duration.toFixed(6)),
      safety_margin_seconds: Number(safety.toFixed(6)),
      speed,
      punctuation_mode: "locked",
      status: duration <= segment.targetMaxSeconds ? "passed" : "narration_timing_blocked",
      canonical_segment_path: relative(projectRoot, canonicalPath),
      canonical_segment_sha256: sha256(readFileSync(canonicalPath)),
      attempts: [],
      entry_offset_seconds: null,
      tail_margin_seconds: null,
      slot_path: null,
    });
    continue;
  }

  const shotRoot = resolve(runRoot, segment.shotId);
  mkdirSync(shotRoot, {recursive: true});
  const specifications: Array<{speed: number; mode: "locked" | "compact_pause_only"}> = [
    {speed: 1, mode: "locked"},
    {speed: 1.06, mode: "locked"},
    {speed: 1.06, mode: "compact_pause_only"},
  ];
  const attempts: Attempt[] = [];
  let selectedPath = "";
  for (const [index, specification] of specifications.entries()) {
    const requestText = specification.mode === "locked"
      ? segment.text
      : compactPausePunctuation(segment.text);
    if (lexicalContent(requestText) !== lexicalContent(segment.text)) {
      throw new Error(`${segment.shotId} 标点处理改变词法内容`);
    }
    const attemptId = `attempt_${index + 1}_${Math.round(specification.speed * 100)}_${specification.mode}`;
    const rawPath = resolve(shotRoot, `${attemptId}.mp3`);
    const trimmedPath = resolve(shotRoot, `${attemptId}_trimmed.wav`);
    const response = await synthesizeMinimaxTts(requestText, configForSpeed(specification.speed));
    writeFileSync(rawPath, response.audio, {flag: "wx", mode: 0o644});
    run("ffmpeg", [
      "-nostdin", "-hide_banner", "-loglevel", "error", "-n",
      "-i", rawPath,
      "-af",
      "silenceremove=start_periods=1:start_duration=0.01:start_threshold=-55dB:start_silence=0.04,areverse,silenceremove=start_periods=1:start_duration=0.01:start_threshold=-55dB:start_silence=0.06,areverse",
      "-ar", "48000", "-ac", "1", "-c:a", "pcm_s16le",
      trimmedPath,
    ]);
    const duration = durationSeconds(trimmedPath);
    const attempt: Attempt = {
      attempt_id: attemptId,
      speed: specification.speed,
      punctuation_mode: specification.mode,
      request_text_sha256: sha256(requestText),
      lexical_content_sha256: sha256(lexicalContent(requestText)),
      raw_mp3_path: relative(projectRoot, rawPath),
      trimmed_wav_path: relative(projectRoot, trimmedPath),
      duration_seconds: Number(duration.toFixed(6)),
      http_status: response.httpStatus,
      provider_status_code: response.providerStatusCode,
      trace_id: response.traceId,
      selected: false,
    };
    attempts.push(attempt);
    writeFileSync(resolve(shotRoot, `${attemptId}.json`), `${JSON.stringify({
      schema_version: 1,
      project_id: projectId,
      run_id: runId,
      shot_id: segment.shotId,
      keychain_service: keychainService,
      api_key_fingerprint: apiKeyFingerprint,
      provider: "minimax",
      model: "speech-2.8-hd",
      logical_voice: logicalVoice,
      display_name: displayVoice,
      provider_voice_id: voiceId,
      speed: specification.speed,
      punctuation_mode: specification.mode,
      locked_text_sha256: sha256(segment.text),
      request_text_sha256: attempt.request_text_sha256,
      lexical_content_unchanged: true,
      http_status: response.httpStatus,
      provider_status_code: response.providerStatusCode,
      provider_status_message: response.providerStatusMessage,
      trace_id: response.traceId,
      duration_seconds: attempt.duration_seconds,
      raw_mp3_sha256: sha256(readFileSync(rawPath)),
      trimmed_wav_sha256: sha256(readFileSync(trimmedPath)),
    }, null, 2)}\n`, {flag: "wx", mode: 0o644});
    if (duration <= segment.targetMaxSeconds) {
      attempt.selected = true;
      selectedPath = trimmedPath;
      break;
    }
  }

  const selected = attempts.find((attempt) => attempt.selected)
    ?? [...attempts].sort((left, right) => left.duration_seconds - right.duration_seconds)[0];
  if (!selected) throw new Error(`${segment.shotId} 未生成任何候选`);
  if (!selectedPath) selectedPath = resolve(projectRoot, selected.trimmed_wav_path);
  copyFileSync(selectedPath, canonicalPath, fsConstants.COPYFILE_EXCL);
  const duration = durationSeconds(canonicalPath);
  const safety = segment.windowSeconds - duration;
  results.push({
    segment_id: segment.segmentId,
    shot_id: segment.shotId,
    text: segment.text,
    text_sha256: sha256(segment.text),
    text_changed: true,
    source: "regenerated_minimax",
    window_seconds: segment.windowSeconds,
    target_max_seconds: segment.targetMaxSeconds,
    actual_duration_seconds: Number(duration.toFixed(6)),
    safety_margin_seconds: Number(safety.toFixed(6)),
    speed: selected.speed,
    punctuation_mode: selected.punctuation_mode,
    status: duration <= segment.targetMaxSeconds ? "passed" : "narration_timing_blocked",
    canonical_segment_path: relative(projectRoot, canonicalPath),
    canonical_segment_sha256: sha256(readFileSync(canonicalPath)),
    attempts,
    entry_offset_seconds: null,
    tail_margin_seconds: null,
    slot_path: null,
  });
  console.log(JSON.stringify({
    shot_id: segment.shotId,
    status: results.at(-1)?.status,
    duration_seconds: Number(duration.toFixed(3)),
    target_max_seconds: segment.targetMaxSeconds,
    speed: selected.speed,
    punctuation_mode: selected.punctuation_mode,
  }));
}

results.sort((left, right) => left.shot_id.localeCompare(right.shot_id));
const blockedShots = results
  .filter((result) => result.status !== "passed")
  .map((result) => result.shot_id);
const activeSpeechDuration = results.reduce(
  (sum, result) => sum + result.actual_duration_seconds,
  0,
);

const manifestPath = resolve(fitRoot, "generation_manifest.json");
const manifestBase = {
  schema_version: 1,
  project_id: projectId,
  revision: "audio_fit_r1",
  run_id: runId,
  started_at: startedAt,
  finished_at: new Date().toISOString(),
  script_path: relative(projectRoot, scriptPath),
  script_sha256: sha256(readFileSync(scriptPath)),
  keychain_service: keychainService,
  api_key_fingerprint: apiKeyFingerprint,
  provider: "minimax",
  model: "speech-2.8-hd",
  logical_voice: logicalVoice,
  display_name: displayVoice,
  provider_voice_id: voiceId,
  allowed_speed_range: [0.96, 1.06],
  changed_segment_count: results.filter((result) => result.text_changed).length,
  reused_segment_count: results.filter((result) => !result.text_changed).length,
  active_speech_duration_seconds: Number(activeSpeechDuration.toFixed(6)),
  locked_video_duration_seconds: 41.5,
  blocked_shots: blockedShots,
  results,
};

if (blockedShots.length > 0) {
  writeFileSync(manifestPath, `${JSON.stringify({
    ...manifestBase,
    status: "narration_timing_blocked",
    final_narration_path: null,
  }, null, 2)}\n`, {flag: "wx", mode: 0o644});
  console.error(`Audio Fit 阻断：${blockedShots.join(", ")}`);
  process.exitCode = 2;
} else {
  for (const result of results) {
    const available = result.window_seconds - result.actual_duration_seconds;
    const desiredTail = Math.min(0.25, Math.max(0.15, available * 0.65));
    const entryOffset = Math.max(0, available - desiredTail);
    const slotPath = resolve(runRoot, `${result.shot_id}_slot.wav`);
    run("ffmpeg", [
      "-nostdin", "-hide_banner", "-loglevel", "error", "-n",
      "-i", resolve(projectRoot, result.canonical_segment_path),
      "-af", `adelay=${Math.round(entryOffset * 1000)}:all=1,apad,atrim=duration=${result.window_seconds},asetpts=N/SR/TB`,
      "-ar", "48000", "-ac", "1", "-c:a", "pcm_s16le",
      slotPath,
    ]);
    result.entry_offset_seconds = Number(entryOffset.toFixed(6));
    result.tail_margin_seconds = Number((available - entryOffset).toFixed(6));
    result.slot_path = relative(projectRoot, slotPath);
  }
  const concatPath = resolve(runRoot, "slots.ffconcat");
  const concatBody = [
    "ffconcat version 1.0",
    ...results.map((result) => `file '${resolve(projectRoot, result.slot_path ?? "").replaceAll("'", "'\\''")}'`),
    "",
  ].join("\n");
  writeFileSync(concatPath, concatBody, {flag: "wx", mode: 0o644});
  const unnormalizedPath = resolve(runRoot, "narration_unnormalized.wav");
  run("ffmpeg", [
    "-nostdin", "-hide_banner", "-loglevel", "error", "-n",
    "-f", "concat", "-safe", "0", "-i", concatPath,
    "-ar", "48000", "-ac", "1", "-c:a", "pcm_s16le",
    unnormalizedPath,
  ]);
  run("ffmpeg", [
    "-nostdin", "-hide_banner", "-loglevel", "error", "-n",
    "-i", unnormalizedPath,
    "-af", "loudnorm=I=-16:TP=-1.2:LRA=7,apad,atrim=duration=41.5,asetpts=N/SR/TB",
    "-ar", "48000", "-ac", "1", "-c:a", "pcm_s24le",
    finalNarrationPath,
  ]);
  const finalDuration = durationSeconds(finalNarrationPath);
  if (Math.abs(finalDuration - 41.5) > 0.001) {
    throw new Error(`完整旁白轨时长错误：${finalDuration}`);
  }
  writeFileSync(manifestPath, `${JSON.stringify({
    ...manifestBase,
    finished_at: new Date().toISOString(),
    status: "passed",
    blocked_shots: [],
    results,
    final_narration_path: relative(projectRoot, finalNarrationPath),
    final_narration_sha256: sha256(readFileSync(finalNarrationPath)),
    final_narration_duration_seconds: finalDuration,
    final_narration_codec: "pcm_s24le",
    final_narration_sample_rate_hz: 48000,
    final_narration_channels: 1,
  }, null, 2)}\n`, {flag: "wx", mode: 0o644});
  console.log(JSON.stringify({
    status: "passed",
    segments: results.length,
    changed_segments: results.filter((result) => result.text_changed).length,
    reused_segments: results.filter((result) => !result.text_changed).length,
    active_speech_duration_seconds: Number(activeSpeechDuration.toFixed(6)),
    final_narration_path: relative(projectRoot, finalNarrationPath),
    final_narration_duration_seconds: finalDuration,
  }, null, 2));
}
