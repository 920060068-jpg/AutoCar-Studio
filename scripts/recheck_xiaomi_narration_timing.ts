import {createHash} from "node:crypto";
import {
  constants as fsConstants,
  copyFileSync,
  existsSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import {basename, dirname, relative, resolve} from "node:path";
import {spawnSync} from "node:child_process";
import {projectRoot} from "./lib/common.ts";

const projectId = "xiaomi_skynomad_20260714_r1";
const segmentRoot = resolve(
  projectRoot,
  `output/${projectId}/audio/narration_segments`,
);
const runsRoot = resolve(segmentRoot, "runs");

const sha256 = (data: string | Uint8Array): string => (
  createHash("sha256").update(data).digest("hex")
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
  const duration = Number(run("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    path,
  ]));
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error(`无效音频时长：${path}`);
  }
  return duration;
};

const requestedRun = process.argv[2]?.trim();
const runId = requestedRun || readdirSync(runsRoot, {withFileTypes: true})
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort()
  .at(-1);
if (!runId) throw new Error("没有可复核的旁白生成 run");

const runRoot = resolve(runsRoot, runId);
const inputManifestPath = resolve(runRoot, "generation_manifest.json");
if (!existsSync(inputManifestPath)) throw new Error(`缺少 ${inputManifestPath}`);
const input = JSON.parse(readFileSync(inputManifestPath, "utf8")) as {
  api_key_fingerprint: string;
  cue_results: Array<{
    cueId: string;
    shotId: string;
    lockedStartSeconds: number;
    lockedEndSeconds: number;
    lockedWindowSeconds: number;
    lockedText: string;
    lockedTextSha256: string;
    fitRisk: string;
    attempts: Array<{
      attemptId: string;
      speed: number;
      punctuationMode: "locked" | "compact_pause_only";
      requestTextSha256: string;
      lexicalContentSha256: string;
      rawMp3Path: string;
      httpStatus: number;
      providerStatusCode: number;
      traceId: string;
      providerDurationMs: number;
    }>;
  }>;
};

if (input.cue_results.length !== 15) {
  throw new Error(`生成清单必须有 15 个 cue，实际 ${input.cue_results.length}`);
}

const results = [];
for (const cue of input.cue_results) {
  const attempts = [];
  for (const attempt of cue.attempts) {
    const rawMp3Path = resolve(projectRoot, attempt.rawMp3Path);
    const correctedPath = resolve(
      dirname(rawMp3Path),
      `${basename(rawMp3Path, ".mp3")}_trimmed_v2.wav`,
    );
    run("ffmpeg", [
      "-nostdin", "-hide_banner", "-loglevel", "error", "-n",
      "-i", rawMp3Path,
      "-af",
      "silenceremove=start_periods=1:start_duration=0.01:start_threshold=-55dB:start_silence=0.04,areverse,silenceremove=start_periods=1:start_duration=0.01:start_threshold=-55dB:start_silence=0.06,areverse",
      "-ar", "48000", "-ac", "1", "-c:a", "pcm_s16le",
      correctedPath,
    ]);
    attempts.push({
      ...attempt,
      correctedTrimmedWavPath: relative(projectRoot, correctedPath),
      correctedDurationSeconds: Number(durationSeconds(correctedPath).toFixed(6)),
      correctedWavSha256: sha256(readFileSync(correctedPath)),
      selected: false,
    });
  }

  const fitting = attempts.find(
    (attempt) => attempt.correctedDurationSeconds <= cue.lockedWindowSeconds - 0.01,
  );
  const shortest = [...attempts].sort(
    (left, right) => left.correctedDurationSeconds - right.correctedDurationSeconds,
  )[0];
  const selected = fitting ?? shortest;
  if (!selected) throw new Error(`${cue.shotId} 没有生成结果`);
  selected.selected = true;
  const canonicalPath = resolve(segmentRoot, `${cue.shotId}.wav`);
  copyFileSync(
    resolve(projectRoot, selected.correctedTrimmedWavPath),
    canonicalPath,
    fsConstants.COPYFILE_EXCL,
  );
  const overrunSeconds = Math.max(0, selected.correctedDurationSeconds - cue.lockedWindowSeconds);
  results.push({
    cue_id: cue.cueId,
    shot_id: cue.shotId,
    locked_start_seconds: cue.lockedStartSeconds,
    locked_end_seconds: cue.lockedEndSeconds,
    locked_window_seconds: cue.lockedWindowSeconds,
    locked_text: cue.lockedText,
    locked_text_sha256: cue.lockedTextSha256,
    fit_risk: cue.fitRisk,
    fit_status: fitting ? "passed" : "narration_timing_blocked",
    selected_attempt_id: selected.attemptId,
    selected_speed: selected.speed,
    selected_punctuation_mode: selected.punctuationMode,
    actual_duration_seconds: selected.correctedDurationSeconds,
    overrun_seconds: Number(overrunSeconds.toFixed(6)),
    overrun_frames_at_30fps: Math.ceil(overrunSeconds * 30),
    canonical_segment_path: relative(projectRoot, canonicalPath),
    canonical_segment_sha256: sha256(readFileSync(canonicalPath)),
    all_attempts: attempts,
  });
}

const blockedShots = results
  .filter((result) => result.fit_status === "narration_timing_blocked")
  .map((result) => result.shot_id);
const selectedSpeechDuration = results.reduce(
  (total, result) => total + result.actual_duration_seconds,
  0,
);
const report = {
  schema_version: 1,
  project_id: projectId,
  status: blockedShots.length > 0 ? "narration_timing_blocked" : "passed",
  source_run_id: runId,
  rechecked_at: new Date().toISOString(),
  recheck_method: "leading silence trim plus reverse-domain trailing silence trim; internal pauses preserved",
  provider: "minimax",
  model: "speech-2.8-hd",
  keychain_service: "autocar-studio-minimax-paygo",
  api_key_fingerprint: input.api_key_fingerprint,
  logical_voice: "chenyao_male",
  display_name: "沉曜男声",
  provider_voice_id: "Chinese (Mandarin)_Gentleman",
  locked_video_duration_seconds: 41.5,
  selected_speech_duration_seconds: Number(selectedSpeechDuration.toFixed(6)),
  generated_segment_count: results.length,
  successful_request_count: input.cue_results.reduce(
    (total, cue) => total + cue.attempts.filter(
      (attempt) => attempt.httpStatus === 200 && attempt.providerStatusCode === 0,
    ).length,
    0,
  ),
  blocked_shots: blockedShots,
  picture_lock_mutated: false,
  script_mutated: false,
  subtitle_text_mutated: false,
  sentence_truncation_used: false,
  results,
};

const recheckPath = resolve(runRoot, "timing_recheck_v2.json");
writeFileSync(recheckPath, `${JSON.stringify(report, null, 2)}\n`, {
  flag: "wx",
  mode: 0o644,
});
const canonicalRecheckPath = resolve(segmentRoot, "timing_recheck.json");
copyFileSync(recheckPath, canonicalRecheckPath, fsConstants.COPYFILE_EXCL);
console.log(JSON.stringify({
  status: report.status,
  source_run_id: runId,
  generated_segment_count: report.generated_segment_count,
  successful_request_count: report.successful_request_count,
  selected_speech_duration_seconds: report.selected_speech_duration_seconds,
  blocked_shots: report.blocked_shots,
  report_path: relative(projectRoot, canonicalRecheckPath),
}, null, 2));
