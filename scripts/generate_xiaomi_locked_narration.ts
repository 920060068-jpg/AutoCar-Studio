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
const canonicalVoiceId = "Chinese (Mandarin)_Gentleman";
const logicalVoice = "chenyao_male";
const displayVoice = "沉曜男声";
const cueSheetPath = resolve(
  projectRoot,
  `output/${projectId}/audio_post/picture_lock_v1/narration_cue_sheet.yaml`,
);
const audioRoot = resolve(projectRoot, `output/${projectId}/audio`);
const segmentRoot = resolve(audioRoot, "narration_segments");
const finalNarrationPath = resolve(audioRoot, "xiaomi_skynomad_chenyao_narration_v1.wav");

const sha256 = (data: string | Uint8Array): string => (
  createHash("sha256").update(data).digest("hex")
);

const run = (
  command: string,
  args: string[],
  options: {allowFailure?: boolean; sensitiveStdout?: boolean} = {},
): string => {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.status !== 0 && !options.allowFailure) {
    throw new Error(`${command} 失败：${String(result.stderr).trim()}`);
  }
  return options.sensitiveStdout ? String(result.stdout) : String(result.stdout).trim();
};

const keyResult = spawnSync("security", [
  "find-generic-password",
  "-s", keychainService,
  "-a", keychainAccount,
  "-w",
], {encoding: "utf8"});
if (keyResult.status !== 0) {
  throw new Error(`Keychain 未找到可用凭证：${keychainService}/${keychainAccount}`);
}
const apiKey = String(keyResult.stdout).trim();
if (!apiKey.startsWith("sk-") || apiKey.length < 40) {
  throw new Error("Keychain MiniMax 凭证格式无效");
}

const configForSpeed = (speed: number): MinimaxConfig => ({
  apiKey,
  apiBaseUrl: "https://api.minimax.io/v1",
  endpointName: "t2a_v2",
  requestUrl: "https://api.minimax.io/v1/t2a_v2",
  groupId: "",
  model: "speech-2.8-hd",
  voiceId: canonicalVoiceId,
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

const durationSeconds = (path: string): number => {
  const raw = run("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    path,
  ]);
  const duration = Number(raw);
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error(`ffprobe 无法读取有效时长：${path}`);
  }
  return duration;
};

const lexicalContent = (text: string): string => (
  text.replace(/[\s，。；：、！？,.!?;:（）()“”'"—-]/gu, "")
);

const compactPunctuation = (text: string): string => (
  text.replace(/[，：]/gu, "").replace(/；/gu, "，")
);

type Cue = {
  cueId: string;
  shotId: string;
  startSeconds: number;
  endSeconds: number;
  windowSeconds: number;
  text: string;
  textSha256: string;
  fitRisk: string;
};

type Attempt = {
  attemptId: string;
  speed: number;
  punctuationMode: "locked" | "compact_pause_only";
  requestTextSha256: string;
  lexicalContentSha256: string;
  rawMp3Path: string;
  trimmedWavPath: string;
  rawDurationSeconds: number;
  trimmedDurationSeconds: number;
  httpStatus: number;
  providerStatusCode: number;
  traceId: string;
  providerDurationMs: number;
  selected: boolean;
};

type CueResult = {
  cueId: string;
  shotId: string;
  lockedStartSeconds: number;
  lockedEndSeconds: number;
  lockedWindowSeconds: number;
  lockedText: string;
  lockedTextSha256: string;
  fitRisk: string;
  attempts: Attempt[];
  fitStatus: "passed" | "narration_timing_blocked";
  selectedAttemptId: string | null;
  selectedDurationSeconds: number | null;
  entryOffsetSeconds: number | null;
  tailReserveSeconds: number | null;
  canonicalSegmentPath: string | null;
  slotPath: string | null;
};

const cueSheet = loadYamlRecord(relative(projectRoot, cueSheetPath));
const voice = asRecord(cueSheet.voice, "narration_cue_sheet.voice");
if (stringValue(voice.provider_voice_id) !== canonicalVoiceId) {
  throw new Error("Cue Sheet 的 MiniMax voice_id 与已验证映射不一致");
}
if (stringValue(voice.logical_voice) !== displayVoice) {
  throw new Error("Cue Sheet 的逻辑声音标签与沉曜男声不一致");
}

const cueValues = asArray(cueSheet.cues, "narration_cue_sheet.cues");
const cues: Cue[] = cueValues.map((value, index) => {
  const record = asRecord(value, `cues[${index}]`);
  const cue: Cue = {
    cueId: stringValue(record.cue_id),
    shotId: stringValue(record.shot_id),
    startSeconds: numberValue(record.start_seconds),
    endSeconds: numberValue(record.end_seconds),
    windowSeconds: numberValue(record.locked_window_seconds),
    text: stringValue(record.text),
    textSha256: stringValue(record.text_sha256),
    fitRisk: stringValue(record.fit_risk),
  };
  if (!cue.cueId || !cue.shotId || !cue.text || !Number.isFinite(cue.windowSeconds)) {
    throw new Error(`cues[${index}] 缺少必需字段`);
  }
  if (sha256(cue.text) !== cue.textSha256) {
    throw new Error(`${cue.shotId} 文本 SHA-256 与锁定 Cue Sheet 不一致`);
  }
  if (Math.abs((cue.endSeconds - cue.startSeconds) - cue.windowSeconds) > 0.0001) {
    throw new Error(`${cue.shotId} 锁定时间窗内部不一致`);
  }
  return cue;
});
if (cues.length !== 15) throw new Error(`锁定 Cue 数量必须为 15，实际 ${cues.length}`);

const startedAt = new Date().toISOString();
const runId = `xiaomi_locked_narration_${startedAt.replace(/[^0-9]/gu, "").slice(0, 17)}`;
const runRoot = resolve(segmentRoot, "runs", runId);
mkdirSync(runRoot, {recursive: true});

const initialSpeedByShot: Record<string, number> = {
  shot_01: 1.04,
  shot_12: 1.04,
  shot_14: 1.06,
  shot_15: 1.08,
};

const results: CueResult[] = [];
for (const cue of cues) {
  const shotRoot = resolve(runRoot, cue.shotId);
  mkdirSync(shotRoot, {recursive: true});
  const initialSpeed = initialSpeedByShot[cue.shotId] ?? 1;
  const specifications: Array<{speed: number; mode: "locked" | "compact_pause_only"}> = [];
  for (const speed of [initialSpeed, 1.04, 1.08]) {
    if (!specifications.some((item) => item.speed === speed && item.mode === "locked")) {
      specifications.push({speed, mode: "locked"});
    }
  }
  specifications.push({speed: 1.08, mode: "compact_pause_only"});

  const cueResult: CueResult = {
    cueId: cue.cueId,
    shotId: cue.shotId,
    lockedStartSeconds: cue.startSeconds,
    lockedEndSeconds: cue.endSeconds,
    lockedWindowSeconds: cue.windowSeconds,
    lockedText: cue.text,
    lockedTextSha256: cue.textSha256,
    fitRisk: cue.fitRisk,
    attempts: [],
    fitStatus: "narration_timing_blocked",
    selectedAttemptId: null,
    selectedDurationSeconds: null,
    entryOffsetSeconds: null,
    tailReserveSeconds: null,
    canonicalSegmentPath: null,
    slotPath: null,
  };

  for (const [attemptIndex, specification] of specifications.entries()) {
    const requestText = specification.mode === "locked"
      ? cue.text
      : compactPunctuation(cue.text);
    if (lexicalContent(requestText) !== lexicalContent(cue.text)) {
      throw new Error(`${cue.shotId} 标点停顿调整意外改变了词法内容`);
    }
    const attemptId = `attempt_${String(attemptIndex + 1).padStart(2, "0")}_${Math.round(specification.speed * 100)}_${specification.mode}`;
    const rawMp3Path = resolve(shotRoot, `${attemptId}.mp3`);
    const rawWavPath = resolve(shotRoot, `${attemptId}_48k.wav`);
    const trimmedWavPath = resolve(shotRoot, `${attemptId}_trimmed.wav`);
    const auditPath = resolve(shotRoot, `${attemptId}.json`);

    const response = await synthesizeMinimaxTts(requestText, configForSpeed(specification.speed));
    writeFileSync(rawMp3Path, response.audio, {flag: "wx", mode: 0o644});
    run("ffmpeg", [
      "-nostdin", "-hide_banner", "-loglevel", "error", "-n",
      "-i", rawMp3Path,
      "-ar", "48000", "-ac", "1", "-c:a", "pcm_s16le",
      rawWavPath,
    ]);
    run("ffmpeg", [
      "-nostdin", "-hide_banner", "-loglevel", "error", "-n",
      "-i", rawWavPath,
      "-af",
      "silenceremove=start_periods=1:start_duration=0.01:start_threshold=-55dB:start_silence=0.04,areverse,silenceremove=start_periods=1:start_duration=0.01:start_threshold=-55dB:start_silence=0.06,areverse",
      "-ar", "48000", "-ac", "1", "-c:a", "pcm_s16le",
      trimmedWavPath,
    ]);
    const rawDuration = durationSeconds(rawWavPath);
    const trimmedDuration = durationSeconds(trimmedWavPath);
    const attempt: Attempt = {
      attemptId,
      speed: specification.speed,
      punctuationMode: specification.mode,
      requestTextSha256: sha256(requestText),
      lexicalContentSha256: sha256(lexicalContent(requestText)),
      rawMp3Path: relative(projectRoot, rawMp3Path),
      trimmedWavPath: relative(projectRoot, trimmedWavPath),
      rawDurationSeconds: Number(rawDuration.toFixed(6)),
      trimmedDurationSeconds: Number(trimmedDuration.toFixed(6)),
      httpStatus: response.httpStatus,
      providerStatusCode: response.providerStatusCode,
      traceId: response.traceId,
      providerDurationMs: response.durationMs,
      selected: false,
    };
    cueResult.attempts.push(attempt);
    writeFileSync(auditPath, `${JSON.stringify({
      schema_version: 1,
      run_id: runId,
      project_id: projectId,
      cue_id: cue.cueId,
      shot_id: cue.shotId,
      keychain_service: keychainService,
      api_key_fingerprint: `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`,
      logical_voice: logicalVoice,
      display_name: displayVoice,
      provider_voice_id: canonicalVoiceId,
      locked_text_sha256: cue.textSha256,
      request_text_sha256: attempt.requestTextSha256,
      lexical_content_unchanged: true,
      speed: specification.speed,
      punctuation_mode: specification.mode,
      http_status: response.httpStatus,
      provider_status_code: response.providerStatusCode,
      provider_status_message: response.providerStatusMessage,
      trace_id: response.traceId,
      provider_duration_ms: response.durationMs,
      raw_duration_seconds: attempt.rawDurationSeconds,
      trimmed_duration_seconds: attempt.trimmedDurationSeconds,
      raw_mp3_sha256: sha256(readFileSync(rawMp3Path)),
      trimmed_wav_sha256: sha256(readFileSync(trimmedWavPath)),
    }, null, 2)}\n`, {flag: "wx", mode: 0o644});

    if (trimmedDuration <= cue.windowSeconds - 0.01) {
      attempt.selected = true;
      cueResult.fitStatus = "passed";
      cueResult.selectedAttemptId = attemptId;
      cueResult.selectedDurationSeconds = Number(trimmedDuration.toFixed(6));
      break;
    }
  }

  results.push(cueResult);
  const selected = cueResult.attempts.find((attempt) => attempt.selected);
  console.log(JSON.stringify({
    shot_id: cue.shotId,
    fit_status: cueResult.fitStatus,
    selected_speed: selected?.speed ?? null,
    punctuation_mode: selected?.punctuationMode ?? null,
    duration_seconds: cueResult.selectedDurationSeconds,
    window_seconds: cue.windowSeconds,
  }));
}

const blockedShots = results
  .filter((result) => result.fitStatus !== "passed")
  .map((result) => result.shotId);
const generationManifestPath = resolve(runRoot, "generation_manifest.json");
const baseManifest = {
  schema_version: 1,
  project_id: projectId,
  run_id: runId,
  started_at: startedAt,
  finished_at: new Date().toISOString(),
  keychain_service: keychainService,
  keychain_account: keychainAccount,
  api_key_fingerprint: `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`,
  provider: "minimax",
  model: "speech-2.8-hd",
  logical_voice: logicalVoice,
  display_name: displayVoice,
  provider_voice_id: canonicalVoiceId,
  cue_sheet_path: relative(projectRoot, cueSheetPath),
  cue_sheet_sha256: sha256(readFileSync(cueSheetPath)),
  locked_duration_seconds: 41.5,
  speed_range_enforced: [1, 1.08],
  narration_text_mutated: false,
  subtitle_text_mutated: false,
  picture_lock_mutated: false,
  cue_results: results,
  blocked_shots: blockedShots,
};

if (blockedShots.length > 0) {
  writeFileSync(generationManifestPath, `${JSON.stringify({
    ...baseManifest,
    status: "narration_timing_blocked",
    final_narration_path: null,
  }, null, 2)}\n`, {flag: "wx", mode: 0o644});
  console.error(`旁白时长阻断：${blockedShots.join(", ")}`);
  process.exitCode = 2;
} else {
  for (const result of results) {
    const selected = result.attempts.find((attempt) => attempt.selected);
    if (!selected) throw new Error(`${result.shotId} 缺少已选择片段`);
    const selectedPath = resolve(projectRoot, selected.trimmedWavPath);
    const canonicalSegmentPath = resolve(segmentRoot, `${result.shotId}.wav`);
    copyFileSync(selectedPath, canonicalSegmentPath, fsConstants.COPYFILE_EXCL);

    const spare = result.lockedWindowSeconds - (result.selectedDurationSeconds ?? 0);
    const entryOffset = result.shotId === "shot_15"
      ? 0
      : result.shotId === "shot_01"
        ? Math.min(0.02, Math.max(0, spare))
        : Math.min(0.12, Math.max(0, spare * 0.35));
    const tailReserve = Math.max(0, spare - entryOffset);
    const slotPath = resolve(runRoot, `${result.shotId}_locked_slot.wav`);
    const delayMs = Math.round(entryOffset * 1000);
    run("ffmpeg", [
      "-nostdin", "-hide_banner", "-loglevel", "error", "-n",
      "-i", canonicalSegmentPath,
      "-af", `adelay=${delayMs}:all=1,apad,atrim=duration=${result.lockedWindowSeconds},asetpts=N/SR/TB`,
      "-ar", "48000", "-ac", "1", "-c:a", "pcm_s16le",
      slotPath,
    ]);
    result.entryOffsetSeconds = Number(entryOffset.toFixed(6));
    result.tailReserveSeconds = Number(tailReserve.toFixed(6));
    result.canonicalSegmentPath = relative(projectRoot, canonicalSegmentPath);
    result.slotPath = relative(projectRoot, slotPath);
  }

  const concatPath = resolve(runRoot, "locked_slots.ffconcat");
  const concatBody = [
    "ffconcat version 1.0",
    ...results.map((result) => `file '${resolve(projectRoot, result.slotPath ?? "").replaceAll("'", "'\\''")}'`),
    "",
  ].join("\n");
  writeFileSync(concatPath, concatBody, {flag: "wx", mode: 0o644});
  const concatenatedPath = resolve(runRoot, "narration_locked_unnormalized.wav");
  run("ffmpeg", [
    "-nostdin", "-hide_banner", "-loglevel", "error", "-n",
    "-f", "concat", "-safe", "0", "-i", concatPath,
    "-ar", "48000", "-ac", "1", "-c:a", "pcm_s16le",
    concatenatedPath,
  ]);
  run("ffmpeg", [
    "-nostdin", "-hide_banner", "-loglevel", "error", "-n",
    "-i", concatenatedPath,
    "-af", "loudnorm=I=-18:TP=-1.5:LRA=7,apad,atrim=duration=41.5,asetpts=N/SR/TB",
    "-ar", "48000", "-ac", "1", "-c:a", "pcm_s24le",
    finalNarrationPath,
  ]);
  const finalDuration = durationSeconds(finalNarrationPath);
  if (Math.abs(finalDuration - 41.5) > 0.001) {
    throw new Error(`完整旁白时长不是 41.5 秒：${finalDuration}`);
  }
  writeFileSync(generationManifestPath, `${JSON.stringify({
    ...baseManifest,
    finished_at: new Date().toISOString(),
    status: "passed",
    cue_results: results,
    blocked_shots: [],
    final_narration_path: relative(projectRoot, finalNarrationPath),
    final_narration_sha256: sha256(readFileSync(finalNarrationPath)),
    final_narration_duration_seconds: finalDuration,
    final_narration_sample_rate_hz: 48000,
    final_narration_channels: 1,
    final_narration_codec: "pcm_s24le",
  }, null, 2)}\n`, {flag: "wx", mode: 0o644});
  const canonicalManifestPath = resolve(segmentRoot, "generation_manifest.json");
  copyFileSync(generationManifestPath, canonicalManifestPath, fsConstants.COPYFILE_EXCL);
  console.log(JSON.stringify({
    status: "passed",
    run_id: runId,
    segments: results.length,
    final_narration_path: relative(projectRoot, finalNarrationPath),
    duration_seconds: finalDuration,
  }));
}
