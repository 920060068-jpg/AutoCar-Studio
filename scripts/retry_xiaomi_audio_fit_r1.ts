import {createHash} from "node:crypto";
import {existsSync, mkdirSync, readFileSync, writeFileSync} from "node:fs";
import {relative, resolve} from "node:path";
import {spawnSync} from "node:child_process";
import {synthesizeMinimaxTts} from "../src/audio/minimax/client.ts";
import type {MinimaxConfig} from "../src/audio/minimax/config.ts";
import {loadYamlRecord, numberValue, projectRoot, stringValue} from "./lib/common.ts";
import {asArray, asRecord} from "./lib/yaml.ts";

const projectId = "xiaomi_skynomad_20260714_r1";
const service = "autocar-studio-minimax-paygo";
const account = "AutoCar-Studio";
const scriptPath = resolve(projectRoot, `output/${projectId}/intermediate/script_r3_audio_fit.yaml`);
const fitRoot = resolve(projectRoot, `output/${projectId}/audio/audio_fit_r1`);
const segmentRoot = resolve(fitRoot, "narration_segments");
const retryRoot = resolve(fitRoot, "retry_2");
const manifestPath = resolve(retryRoot, "retry_2_manifest.json");

const sha256 = (value: string | Uint8Array): string => createHash("sha256").update(value).digest("hex");
const run = (command: string, args: string[]): string => {
  const result = spawnSync(command, args, {cwd: projectRoot, encoding: "utf8", maxBuffer: 20 * 1024 * 1024});
  if (result.status !== 0) throw new Error(`${command} 失败：${String(result.stderr).trim()}`);
  return String(result.stdout).trim();
};
const durationSeconds = (path: string): number => {
  const duration = Number(run("ffprobe", [
    "-v", "error", "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1", path,
  ]));
  if (!Number.isFinite(duration) || duration <= 0) throw new Error(`无效音频：${path}`);
  return duration;
};
const key = spawnSync("security", ["find-generic-password", "-s", service, "-a", account, "-w"], {encoding: "utf8"});
if (key.status !== 0) throw new Error("Keychain 凭证不可用");
const apiKey = String(key.stdout).trim();
const fingerprint = `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`;
const config = (speed: number): MinimaxConfig => ({
  apiKey,
  apiBaseUrl: "https://api.minimax.io/v1",
  endpointName: "t2a_v2",
  requestUrl: "https://api.minimax.io/v1/t2a_v2",
  groupId: "",
  model: "speech-2.8-hd",
  voiceId: "Chinese (Mandarin)_Gentleman",
  voiceName: "沉曜男声",
  speed,
  volume: 1,
  pitch: -1,
  languageBoost: "Chinese",
  audioFormat: "mp3",
  sampleRate: 32000,
  bitrate: 128000,
  channels: 1,
  timeoutMs: 120000,
  envFile: `Keychain:${service}`,
});
const withoutSpokenPauses = (text: string): string => text.replace(/[，。；：、！？,.!?;:]/gu, "");
const lexical = (text: string): string => text.replace(/[\s，。；：、！？,.!?;:（）()“”'"—-]/gu, "");

const script = asRecord(loadYamlRecord(relative(projectRoot, scriptPath)).script, "script");
const byShot = new Map(asArray(script.segments, "segments").map((value, index) => {
  const segment = asRecord(value, `segments[${index}]`);
  return [stringValue(segment.shot_id), segment] as const;
}));
mkdirSync(retryRoot, {recursive: true});
mkdirSync(segmentRoot, {recursive: true});
if (existsSync(manifestPath)) throw new Error("拒绝覆盖 retry_2_manifest.json");

const results = [];
for (const shotId of ["shot_12", "shot_13", "shot_14", "shot_15"]) {
  const segment = byShot.get(shotId);
  if (!segment) throw new Error(`缺少 ${shotId}`);
  const text = stringValue(segment.narration);
  const target = numberValue(segment.target_voice_duration_max_seconds);
  const shotRoot = resolve(retryRoot, shotId);
  mkdirSync(shotRoot, {recursive: true});
  const specs = shotId === "shot_15"
    ? [{speed: 1.06, mode: "all_pause_punctuation_removed" as const}]
    : [
        {speed: 1, mode: "locked" as const},
        {speed: 1.06, mode: "all_pause_punctuation_removed" as const},
      ];
  const attempts = [];
  for (const [index, spec] of specs.entries()) {
    const requestText = spec.mode === "locked" ? text : withoutSpokenPauses(text);
    if (lexical(requestText) !== lexical(text)) throw new Error(`${shotId} 词法内容变化`);
    const rawPath = resolve(shotRoot, `attempt_${index + 1}_${spec.speed}.mp3`);
    const wavPath = resolve(shotRoot, `attempt_${index + 1}_${spec.speed}_trimmed.wav`);
    const response = await synthesizeMinimaxTts(requestText, config(spec.speed));
    writeFileSync(rawPath, response.audio, {flag: "wx", mode: 0o644});
    run("ffmpeg", [
      "-nostdin", "-hide_banner", "-loglevel", "error", "-n", "-i", rawPath,
      "-af", "silenceremove=start_periods=1:start_duration=0.01:start_threshold=-55dB:start_silence=0.04,areverse,silenceremove=start_periods=1:start_duration=0.01:start_threshold=-55dB:start_silence=0.06,areverse",
      "-ar", "48000", "-ac", "1", "-c:a", "pcm_s16le", wavPath,
    ]);
    const duration = durationSeconds(wavPath);
    attempts.push({
      speed: spec.speed,
      punctuation_mode: spec.mode,
      request_text_sha256: sha256(requestText),
      lexical_content_unchanged: true,
      duration_seconds: Number(duration.toFixed(6)),
      http_status: response.httpStatus,
      provider_status_code: response.providerStatusCode,
      trace_id: response.traceId,
      raw_mp3_path: relative(projectRoot, rawPath),
      raw_mp3_sha256: sha256(readFileSync(rawPath)),
      wav_path: relative(projectRoot, wavPath),
      wav_sha256: sha256(readFileSync(wavPath)),
      selected: false,
    });
    if (duration <= target) break;
  }
  const fitting = attempts.find((attempt) => attempt.duration_seconds <= target);
  const selected = fitting ?? [...attempts].sort((a, b) => a.duration_seconds - b.duration_seconds)[0];
  if (!selected) throw new Error(`${shotId} 没有候选`);
  selected.selected = true;
  const canonicalPath = resolve(segmentRoot, `${shotId}_retry2.wav`);
  if (existsSync(canonicalPath)) throw new Error(`拒绝覆盖：${canonicalPath}`);
  const selectedPath = resolve(projectRoot, selected.wav_path);
  run("ffmpeg", [
    "-nostdin", "-hide_banner", "-loglevel", "error", "-n", "-i", selectedPath,
    "-c:a", "copy", canonicalPath,
  ]);
  results.push({
    shot_id: shotId,
    text,
    text_sha256: sha256(text),
    target_max_seconds: target,
    selected_duration_seconds: selected.duration_seconds,
    safety_to_target_seconds: Number((target - selected.duration_seconds).toFixed(6)),
    status: selected.duration_seconds <= target ? "passed" : "narration_timing_blocked",
    canonical_path: relative(projectRoot, canonicalPath),
    canonical_sha256: sha256(readFileSync(canonicalPath)),
    selected_speed: selected.speed,
    selected_punctuation_mode: selected.punctuation_mode,
    attempts,
  });
  console.log(JSON.stringify(results.at(-1)));
}
const blocked = results.filter((result) => result.status !== "passed").map((result) => result.shot_id);
writeFileSync(manifestPath, `${JSON.stringify({
  schema_version: 1,
  project_id: projectId,
  revision: "audio_fit_r1_retry_2",
  created_at: new Date().toISOString(),
  retry_of: "output/xiaomi_skynomad_20260714_r1/audio/audio_fit_r1/generation_manifest.json",
  script_path: relative(projectRoot, scriptPath),
  script_sha256: sha256(readFileSync(scriptPath)),
  keychain_service: service,
  api_key_fingerprint: fingerprint,
  logical_voice: "chenyao_male",
  provider_voice_id: "Chinese (Mandarin)_Gentleman",
  allowed_speed_range: [0.96, 1.06],
  status: blocked.length ? "narration_timing_blocked" : "passed",
  blocked_shots: blocked,
  results,
}, null, 2)}\n`, {flag: "wx", mode: 0o644});
if (blocked.length) {
  console.error(`retry_2 阻断：${blocked.join(", ")}`);
  process.exitCode = 2;
}
