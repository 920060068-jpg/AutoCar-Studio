import {createHash} from "node:crypto";
import {existsSync, mkdirSync, readFileSync, writeFileSync} from "node:fs";
import {relative, resolve} from "node:path";
import {spawnSync} from "node:child_process";
import {
  loadMinimaxConfig,
  projectRoot,
  publicMinimaxConfig,
} from "../src/audio/minimax/config.ts";
import {synthesizeMinimaxTts} from "../src/audio/minimax/client.ts";

const valueFor = (name: string): string => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? "" : "";
};

const outputPath = (name: string): string => {
  const value = valueFor(name);
  if (!value) throw new Error(`缺少 ${name}`);
  const absolutePath = resolve(projectRoot, value);
  const relativePath = relative(projectRoot, absolutePath);
  if (relativePath.startsWith("..") || relativePath === "") {
    throw new Error(`${name} 必须位于项目目录内`);
  }
  return absolutePath;
};

const sha256 = (data: string | Uint8Array): string => (
  createHash("sha256").update(data).digest("hex")
);

const text = valueFor("--text").trim();
if (!text) throw new Error("缺少 --text");

const rawAudioPath = outputPath("--out");
const wavMasterPath = outputPath("--wav-out");
const auditPath = outputPath("--audit");
const targets = [rawAudioPath, wavMasterPath, auditPath];
for (const target of targets) {
  if (existsSync(target)) throw new Error(`拒绝覆盖已存在文件：${target}`);
  mkdirSync(resolve(target, ".."), {recursive: true});
}

const config = loadMinimaxConfig();
const startedAt = new Date().toISOString();
const stageRunId = `minimax_tts_${startedAt.replace(/[^0-9]/gu, "").slice(0, 17)}`;

try {
  const result = await synthesizeMinimaxTts(text, config);
  writeFileSync(rawAudioPath, result.audio, {flag: "wx", mode: 0o644});

  const ffmpeg = spawnSync("ffmpeg", [
    "-nostdin",
    "-hide_banner",
    "-loglevel", "error",
    "-n",
    "-i", rawAudioPath,
    "-ar", "48000",
    "-ac", "1",
    "-c:a", "pcm_s16le",
    wavMasterPath,
  ], {encoding: "utf8"});
  if (ffmpeg.status !== 0) {
    throw new Error(`48 kHz WAV 母版转换失败：${ffmpeg.stderr.trim()}`);
  }

  const finishedAt = new Date().toISOString();
  const audit = {
    schema_version: 1,
    job_id: "minimax_native_tts_validation",
    revision: 1,
    stage: "audio",
    stage_run_id: stageRunId,
    started_at: startedAt,
    finished_at: finishedAt,
    actor: "codex",
    status: "passed",
    provider: "minimax",
    config: publicMinimaxConfig(config),
    request: {
      text_sha256: sha256(text),
      text_characters: text.length,
      stream: false,
      output_format: "hex",
    },
    response: {
      http_status: result.httpStatus,
      provider_status_code: result.providerStatusCode,
      provider_status_message: result.providerStatusMessage,
      trace_id: result.traceId,
      usage_characters: result.usageCharacters,
      audio_length_ms: result.durationMs,
      audio_sample_rate: result.audioSampleRate,
      audio_size: result.audioSize,
      audio_format: result.audioFormat,
      audio_channels: result.audioChannels,
    },
    outputs: {
      raw_audio_path: relative(projectRoot, rawAudioPath),
      raw_audio_sha256: sha256(readFileSync(rawAudioPath)),
      wav_master_path: relative(projectRoot, wavMasterPath),
      wav_master_sha256: sha256(readFileSync(wavMasterPath)),
    },
    errors: [],
    human_decision: "pending_test_listen",
  };

  writeFileSync(auditPath, `${JSON.stringify(audit, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o644,
  });
  console.log(JSON.stringify(audit, null, 2));
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  const failure = {
    schema_version: 1,
    job_id: "minimax_native_tts_validation",
    revision: 1,
    stage: "audio",
    stage_run_id: stageRunId,
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    actor: "codex",
    status: "failed",
    provider: "minimax",
    config: publicMinimaxConfig(config),
    request: {text_sha256: sha256(text), text_characters: text.length},
    outputs: {
      raw_audio_path: existsSync(rawAudioPath) ? relative(projectRoot, rawAudioPath) : "",
      wav_master_path: existsSync(wavMasterPath) ? relative(projectRoot, wavMasterPath) : "",
    },
    errors: [message],
    human_decision: "not_applicable",
  };
  if (!existsSync(auditPath)) {
    writeFileSync(auditPath, `${JSON.stringify(failure, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx",
      mode: 0o644,
    });
  }
  console.error(JSON.stringify(failure, null, 2));
  process.exitCode = 1;
}
