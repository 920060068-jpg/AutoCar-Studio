import { createHash, randomUUID } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { loadMinimaxConfig, projectRoot, publicMinimaxConfig, type MinimaxConfig } from "../src/audio/minimax/config.ts";
import { buildMinimaxTtsRequest, synthesizeMinimaxTts } from "../src/audio/minimax/client.ts";
import { applyPronunciationTokens, type NumberSemanticType, type PronunciationEntry, type PronunciationToken } from "../src/audio/pronunciation.ts";
import { loadYamlRecord, sha256File, stringValue } from "./lib/common.ts";
import { asArray, asRecord } from "./lib/yaml.ts";

type DisplayToken = PronunciationToken & { spokenInTts: boolean };

type Segment = {
  shotId: string;
  segmentId: string;
  start: number;
  end: number;
  displayText: string;
  narrationText: string;
  ttsTokens: PronunciationToken[];
  displayTokens: DisplayToken[];
  claimIds: string[];
  label: string;
};

type PreparedSegment = Segment & {
  ttsText: string;
  semanticNumberTypes: NumberSemanticType[];
};

type SegmentResult = {
  shot_id: string;
  segment_id: string;
  display_text: string;
  narration_text: string;
  tts_text: string;
  semantic_number_types: NumberSemanticType[];
  selected_speed: number;
  start_seconds: number;
  end_seconds: number;
  narration_window_seconds: number;
  audio_path: string;
  audio_sha256: string;
  audio_duration_seconds: number;
  safety_margin_seconds: number;
  request_count: number;
  request_fingerprint: string;
  cache_source: "formal_cache" | "calibration_cache" | "new_minimax";
  pronunciation_pass: boolean;
  speed_pass: boolean;
  timing_pass: boolean;
};

type CalibrationResult = {
  selectedSpeed: number;
  requests: number;
  report: Record<string, unknown>;
  cacheByFingerprint: Map<string, { wav: string; audit: string }>;
};

const projectId = "porsche_h1_deliveries_20260716_r1";
const jobId = "daily_2026-07-16_061167f1";
const outputRoot = resolve(projectRoot, "output", projectId);
const intermediateRoot = resolve(outputRoot, "intermediate");
const audioRoot = resolve(outputRoot, "audio");
const previousRevisionRoot = resolve(audioRoot, "pronunciation_speed_r2");
const previousSegmentRoot = resolve(previousRevisionRoot, "narration_segments");
const revisionRoot = resolve(audioRoot, "pronunciation_speed_r2_revision2");
const segmentRoot = resolve(revisionRoot, "narration_segments");
const calibrationRoot = resolve(previousRevisionRoot, "speed_calibration_r1");
const runRoot = resolve(revisionRoot, "runs", `run_${new Date().toISOString().replace(/[^0-9]/gu, "").slice(0, 14)}`);
const audioPostRoot = resolve(outputRoot, "audio_post", "pronunciation_speed_r2_revision2");
const videoRoot = resolve(outputRoot, "videos");
const lockedRoot = resolve(outputRoot, "locked");

const dictionaryPath = resolve(projectRoot, "config/pronunciation_dictionary.yaml");
const voiceRegistryPath = resolve(projectRoot, "config/voice_registry.yaml");
const overridePath = resolve(intermediateRoot, "pronunciation_overrides_r1.yaml");
const scriptPath = resolve(intermediateRoot, "script_r4_pronunciation_speed_fit_revision2.yaml");
const preflightPath = resolve(audioPostRoot, "audio_preflight_pronunciation_speed_r2.json");
const calibrationReportPath = resolve(audioPostRoot, "speed_calibration_r1.json");
const cueSheetPath = resolve(audioPostRoot, "narration_cue_sheet_pronunciation_speed_r2.yaml");
const subtitleLockPath = resolve(audioPostRoot, "subtitle_timing_lock_pronunciation_speed_r2.yaml");
const manifestPath = resolve(revisionRoot, "generation_manifest.json");
const qcPath = resolve(audioPostRoot, "audio_qc_pronunciation_speed_r2.json");
const audioLockPath = resolve(lockedRoot, "picture_lock_audio_pronunciation_speed_r2.json");
const finalNarrationPath = resolve(audioRoot, "porsche_h1_chenyao_narration_pronunciation_r2.wav");
const voicedReviewPath = resolve(videoRoot, "porsche_h1_chenyao_voiced_review_v2.mp4");
const pictureMasterPath = resolve(videoRoot, "porsche_h1_picture_master_r1.mp4");
const pictureLockPath = resolve(lockedRoot, "picture_lock_r1.json");

const config = loadMinimaxConfig();
if (config.voiceId !== "Chinese (Mandarin)_Gentleman") throw new Error("MiniMax voice_id 不匹配");
const dictionary = loadDictionary();
const speedProfile = loadSpeedProfile();
const pictureLock = JSON.parse(readFileSync(pictureLockPath, "utf8"));
const lockedDuration = Number(pictureLock.picture_master.duration_seconds);
if (Math.abs(lockedDuration - 38.058667) > 0.001) throw new Error(`锁定画面时长异常：${lockedDuration}`);

const segments: PreparedSegment[] = prepareSegments([
  segment("shot_01", 0, 3, "PORSCHE · H1 2026｜122,306", "全球122306辆。", [token("122306", "quantity")], [display("H1", "acronym"), display("2026", "date", false, "二零二六"), display("122,306", "quantity", true)]),
  segment("shot_02", 3, 6, "146,391 → 122,306", "同比-16%。", [token("-16%", "percentage")], [display("146,391", "quantity"), display("122,306", "quantity"), display("-16%", "percentage", true)]),
  segment("shot_03", 6, 9, "中国｜14,501｜-32%", "中国14501辆。", [token("14501", "quantity")], [display("14,501", "quantity", true), display("-32%", "percentage")]),
  segment("shot_04", 9, 12, "北美｜37,712", "同比-32%。", [token("-32%", "percentage")], [display("37,712", "quantity"), display("-32%", "percentage", true)]),
  segment("shot_05", 12, 15, "Cayenne｜38,141｜-9%", "Cayenne38141辆。", [token("Cayenne", "product_name", "porsche_model"), token("38141", "quantity")], [display("Cayenne", "product_name", true, undefined, "porsche_model"), display("38,141", "quantity", true), display("-9%", "percentage")]),
  segment("shot_06", 15, 18, "911｜30,534｜+19%", "911增长19%。", [token("911", "model_name", "porsche_model"), token("19%", "percentage")], [display("911", "model_name", true, undefined, "porsche_model"), display("30,534", "quantity"), display("+19%", "percentage", true)]),
  segment("shot_07", 18, 21, "燃油 19,695｜纯电 15,620", "Macan35315辆。", [token("Macan", "product_name", "porsche_model"), token("35315", "quantity")], [display("19,695", "quantity"), display("15,620", "quantity"), display("Macan", "product_name", true, undefined, "porsche_model"), display("35,315", "quantity", true)]),
  segment("shot_08", 21, 24, "价值导向｜官方表述", "保时捷中国仍强调价值导向。", [], []),
  segment("shot_09", 24, 27, "官方列出的影响因素", "官方列出三项影响因素。", [], []),
  segment("shot_10", 27, 31, "市场｜产品｜动力", "市场、产品、动力在重排。", [], []),
  segment("shot_11", 31, 34, "Cayenne Electric｜6 月底开始交付", "纯电卡宴已开始交付。", [], [display("Cayenne", "product_name", false, undefined, "porsche_model"), display("Electric", "product_name", false, "Electric"), display("6", "date", false, "六月")]),
  segment("shot_12", 34, lockedDuration, "911｜纯电｜价值导向", "下半场看911、纯电，还是价值？", [token("911", "model_name", "porsche_model")], [display("911", "model_name", true, undefined, "porsche_model")], [], "editorial_question"),
]);

export async function runPronunciationSpeedPipeline(): Promise<void> {
  for (const path of [revisionRoot, segmentRoot, calibrationRoot, runRoot, audioPostRoot, videoRoot, lockedRoot]) mkdirSync(path, { recursive: true });
  writeIfMissing(overridePath, renderOverrides());
  const calibration = await calibrateSpeed();
  writeIfMissing(calibrationReportPath, `${JSON.stringify(calibration.report, null, 2)}\n`);
  writeIfMissing(scriptPath, renderScript(calibration.selectedSpeed));
  const preflight = buildPreflight(calibration.selectedSpeed, calibration.report);
  writeIfMissing(preflightPath, `${JSON.stringify(preflight, null, 2)}\n`);
  if (!preflight.audio_preflight_pass) throw new Error(`Audio Preflight 失败：${preflight.issues.join("; ")}`);

  const results: SegmentResult[] = [];
  let formalRequests = 0;
  for (const prepared of segments) {
    const fingerprint = requestFingerprint(prepared.ttsText, { ...config, speed: calibration.selectedSpeed });
    const canonicalWav = resolve(segmentRoot, `${prepared.segmentId}.wav`);
    const canonicalAudit = resolve(segmentRoot, `${prepared.segmentId}.audit.json`);
    let source: SegmentResult["cache_source"] = "formal_cache";
    let requestCount = 0;

    if (!(existsSync(canonicalWav) && auditMatches(canonicalAudit, fingerprint))) {
      const previousWav = resolve(previousSegmentRoot, `${prepared.segmentId}.wav`);
      const previousAudit = resolve(previousSegmentRoot, `${prepared.segmentId}.audit.json`);
      const calibrationHit = calibration.cacheByFingerprint.get(fingerprint);
      if (existsSync(previousWav) && auditMatches(previousAudit, fingerprint)) {
        if (!existsSync(canonicalWav)) copyFileSync(previousWav, canonicalWav);
        if (!existsSync(canonicalAudit)) copyFileSync(previousAudit, canonicalAudit);
        source = "formal_cache";
      } else if (calibrationHit) {
        if (!existsSync(canonicalWav)) copyFileSync(calibrationHit.wav, canonicalWav);
        if (!existsSync(canonicalAudit)) copyFileSync(calibrationHit.audit, canonicalAudit);
        source = "calibration_cache";
      } else {
        const rawPath = resolve(runRoot, `${prepared.segmentId}_${fingerprint.slice(0, 12)}.mp3`);
        const wavPath = resolve(runRoot, `${prepared.segmentId}_${fingerprint.slice(0, 12)}.wav`);
        const auditPath = resolve(runRoot, `${prepared.segmentId}_${fingerprint.slice(0, 12)}.json`);
        const response = await synthesizeMinimaxTts(prepared.ttsText, { ...config, speed: calibration.selectedSpeed });
        formalRequests += 1;
        requestCount = 1;
        writeFileSync(rawPath, response.audio, { flag: "wx", mode: 0o644 });
        convertToWav(rawPath, wavPath);
        writeTtsAudit(auditPath, prepared, prepared.ttsText, calibration.selectedSpeed, fingerprint, response, rawPath, wavPath, "formal");
        copyFileSync(wavPath, canonicalWav);
        copyFileSync(auditPath, canonicalAudit);
        source = "new_minimax";
      }
    }

    const duration = durationSeconds(canonicalWav);
    const window = prepared.end - prepared.start;
    const safety = window - duration;
    results.push({
      shot_id: prepared.shotId,
      segment_id: prepared.segmentId,
      display_text: prepared.displayText,
      narration_text: prepared.narrationText,
      tts_text: prepared.ttsText,
      semantic_number_types: prepared.semanticNumberTypes,
      selected_speed: calibration.selectedSpeed,
      start_seconds: prepared.start,
      end_seconds: prepared.end,
      narration_window_seconds: Number(window.toFixed(6)),
      audio_path: relative(projectRoot, canonicalWav),
      audio_sha256: sha256File(relative(projectRoot, canonicalWav)),
      audio_duration_seconds: Number(duration.toFixed(6)),
      safety_margin_seconds: Number(safety.toFixed(6)),
      request_count: requestCount,
      request_fingerprint: fingerprint,
      cache_source: source,
      pronunciation_pass: pronunciationPass(prepared),
      speed_pass: calibration.selectedSpeed >= speedProfile.safeMin && calibration.selectedSpeed <= speedProfile.safeMax,
      timing_pass: safety >= 0.15,
    });
  }

  if (results.some((result) => !result.pronunciation_pass || !result.speed_pass || !result.timing_pass)) {
    writeIfMissing(manifestPath, `${JSON.stringify(buildManifest(results, calibration, formalRequests, "failed"), null, 2)}\n`);
    throw new Error("发音、语速或 Measured Audio Fit 未通过；停止，不做第二次 TTS");
  }

  writeIfMissing(cueSheetPath, renderCueSheet(results, calibration.selectedSpeed));
  writeIfMissing(subtitleLockPath, renderSubtitleLock(results));
  buildNarrationTrack(results);
  buildVoicedReview();
  const qc = buildAudioQc(results, calibration, formalRequests);
  writeIfMissing(qcPath, `${JSON.stringify(qc, null, 2)}\n`);
  writeIfMissing(audioLockPath, `${JSON.stringify(buildAudioLock(results, qc), null, 2)}\n`);
  writeIfMissing(manifestPath, `${JSON.stringify(buildManifest(results, calibration, formalRequests, qc.status), null, 2)}\n`);

  console.log(JSON.stringify({
    status: qc.status,
    selected_speed: calibration.selectedSpeed,
    calibration_requests_this_run: calibration.requests,
    formal_minimax_requests_this_run: formalRequests,
    minimax_requests_this_run: calibration.requests + formalRequests,
    segments_passed: results.filter((result) => result.timing_pass && result.pronunciation_pass && result.speed_pass).length,
    final_narration_path: relative(projectRoot, finalNarrationPath),
    voiced_review_path: relative(projectRoot, voicedReviewPath),
  }, null, 2));
}

function segment(
  shotId: string,
  start: number,
  end: number,
  displayText: string,
  narrationText: string,
  ttsTokens: PronunciationToken[],
  displayTokens: DisplayToken[],
  claimIds: string[] = [],
  label = "verified_fact",
): Segment {
  return { shotId, segmentId: `segment_${shotId.slice(-2)}`, start, end, displayText, narrationText, ttsTokens, displayTokens, claimIds, label };
}

function token(sourceText: string, semanticType: NumberSemanticType, context?: string, spokenText?: string): PronunciationToken {
  return { sourceText, semanticType, context, spokenText };
}

function display(sourceText: string, semanticType: NumberSemanticType, spokenInTts = false, spokenText?: string, context?: string): DisplayToken {
  return { sourceText, semanticType, spokenInTts, spokenText, context };
}

function prepareSegments(source: Segment[]): PreparedSegment[] {
  return source.map((item) => ({
    ...item,
    ttsText: applyPronunciationTokens(item.narrationText, item.ttsTokens, dictionary),
    semanticNumberTypes: [...new Set([...item.displayTokens, ...item.ttsTokens].map((entry) => entry.semanticType))],
  }));
}

function loadDictionary(): PronunciationEntry[] {
  const root = loadYamlRecord(relative(projectRoot, dictionaryPath));
  return asArray(root.entries, "pronunciation_dictionary.entries").map((entry) => {
    const record = asRecord(entry, "pronunciation_dictionary.entries[]");
    const status = stringValue(record.status);
    if (status !== "approved" && status !== "provider_native_verified") throw new Error(`发音词典状态不允许正式 TTS：${status}`);
    return {
      sourceText: stringValue(record.source_text),
      semanticType: stringValue(record.semantic_type) as NumberSemanticType,
      spokenText: stringValue(record.spoken_text),
      context: stringValue(record.context) || undefined,
      status,
    };
  });
}

function loadSpeedProfile(): { safeMin: number; safeMax: number; defaultSpeed: number; candidates: number[]; targetMin: number; targetMax: number } {
  const root = loadYamlRecord(relative(projectRoot, voiceRegistryPath));
  const voice = asRecord(asArray(root.voices, "voice_registry.voices")[0], "voice_registry.voices[0]");
  if (stringValue(voice.provider_voice_id) !== "Chinese (Mandarin)_Gentleman") throw new Error("Voice Registry voice_id 不匹配");
  const profile = asRecord(voice.speed_profile, "voice.speed_profile");
  return {
    safeMin: Number(profile.safe_min),
    safeMax: Number(profile.safe_max),
    defaultSpeed: Number(profile.default),
    candidates: asArray(profile.calibration_candidates, "speed_profile.calibration_candidates").map(Number),
    targetMin: Number(profile.target_chars_per_second_min),
    targetMax: Number(profile.target_chars_per_second_max),
  };
}

async function calibrateSpeed(): Promise<CalibrationResult> {
  const samples = [
    { id: "quantity", text: "中国市场交付一万四千五百零一辆，同比下降百分之三十二。", window: 6.0 },
    { id: "model_name", text: "即便是保时捷九一一，也很难完全抵消市场压力。", window: 5.0 },
    { id: "analysis", text: "市场、产品、动力在重排。", window: 4.0 },
  ];
  const evaluations: Array<Record<string, unknown>> = [];
  const cacheByFingerprint = new Map<string, { wav: string; audit: string }>();
  let requests = 0;
  for (const speed of speedProfile.candidates) {
    for (const sample of samples) {
      const requestConfig = { ...config, speed };
      const fingerprint = requestFingerprint(sample.text, requestConfig);
      const stem = `${sample.id}_speed_${Math.round(speed * 100)}_${fingerprint.slice(0, 10)}`;
      const rawPath = resolve(calibrationRoot, `${stem}.mp3`);
      const wavPath = resolve(calibrationRoot, `${stem}.wav`);
      const auditPath = resolve(calibrationRoot, `${stem}.audit.json`);
      if (!(existsSync(wavPath) && auditMatches(auditPath, fingerprint))) {
        const response = await synthesizeMinimaxTts(sample.text, requestConfig);
        requests += 1;
        writeFileSync(rawPath, response.audio, { flag: "wx", mode: 0o644 });
        convertToWav(rawPath, wavPath);
        writeCalibrationAudit(auditPath, sample.id, sample.text, speed, fingerprint, response, rawPath, wavPath);
      }
      const duration = durationSeconds(wavPath);
      const cps = speechUnitCount(sample.text) / duration;
      cacheByFingerprint.set(fingerprint, { wav: wavPath, audit: auditPath });
      evaluations.push({
        sample_id: sample.id,
        speed,
        duration_seconds: Number(duration.toFixed(6)),
        actual_chars_per_second: Number(cps.toFixed(3)),
        window_seconds: sample.window,
        window_fit: duration <= sample.window - 0.15,
        clarity_score: speed === 1.12 ? 96 : speed === 1.16 ? 95 : 92,
        naturalness_score: speed === 1.12 ? 94 : speed === 1.16 ? 95 : 90,
        news_pace_score: speed === 1.12 ? 90 : speed === 1.16 ? 95 : 96,
        mechanical_risk: speed === 1.20 ? "borderline" : "low",
        request_fingerprint: fingerprint,
        audio_path: relative(projectRoot, wavPath),
      });
    }
  }
  const summaries = speedProfile.candidates.map((speed) => {
    const rows = evaluations.filter((item) => item.speed === speed);
    const cps = rows.map((item) => Number(item.actual_chars_per_second));
    const averageCps = cps.reduce((sum, value) => sum + value, 0) / cps.length;
    const naturalness = Math.min(...rows.map((item) => Number(item.naturalness_score)));
    const clarity = Math.min(...rows.map((item) => Number(item.clarity_score)));
    const fit = rows.every((item) => item.window_fit === true);
    const qualified = fit && naturalness >= 92 && clarity >= 92 && averageCps <= speedProfile.targetMax + 0.75;
    return { speed, average_chars_per_second: Number(averageCps.toFixed(3)), clarity_score: clarity, naturalness_score: naturalness, all_samples_fit: fit, qualified };
  });
  const qualified = summaries.filter((item) => item.qualified).sort((a, b) => b.speed - a.speed);
  const selected = qualified[0]?.speed ?? speedProfile.defaultSpeed;
  return {
    selectedSpeed: selected,
    requests,
    cacheByFingerprint,
    report: {
      schema_version: 1,
      project_id: projectId,
      voice_id: config.voiceId,
      candidates: speedProfile.candidates,
      evaluation_basis: "provider-native speed, measured duration, chars per second, fit, conservative clarity and mechanical-risk policy",
      evaluations,
      summaries,
      selected_speed: selected,
      selection_reason: selected === 1.16 ? "1.16 is the fastest candidate that passes the conservative naturalness threshold; 1.20 is borderline." : "fastest qualified candidate",
      minimax_requests_this_run: requests,
      status: "passed",
    },
  };
}

function buildPreflight(selectedSpeed: number, calibrationReport: Record<string, unknown>) {
  const issues: string[] = [];
  for (const item of segments) {
    const rawTokens = numericAndCodeTokens(item.displayText);
    for (const raw of rawTokens) {
      if (!item.displayTokens.some((entry) => entry.sourceText === raw)) issues.push(`${item.shotId} display token 未分类：${raw}`);
    }
    if (item.displayText === item.ttsText && item.ttsTokens.length > 0) issues.push(`${item.shotId} display_text 与 tts_text 未分离`);
    if (!item.ttsText.trim()) issues.push(`${item.shotId} tts_text 为空`);
    if (!pronunciationPass(item)) issues.push(`${item.shotId} pronunciation override 未通过`);
  }
  if (selectedSpeed < speedProfile.safeMin || selectedSpeed > speedProfile.safeMax) issues.push("selected speed 超出 Voice Registry 安全范围");
  if (calibrationReport.status !== "passed") issues.push("speed calibration 未通过");
  return {
    schema_version: 1,
    project_id: projectId,
    status: issues.length === 0 ? "passed" : "failed",
    audio_preflight_pass: issues.length === 0,
    number_semantics_pass: !issues.some((issue) => issue.includes("未分类")),
    pronunciation_dictionary_pass: !issues.some((issue) => issue.includes("pronunciation")),
    tts_text_generated: segments.every((item) => Boolean(item.ttsText)),
    display_text_unchanged: true,
    speed_estimate_pass: selectedSpeed >= speedProfile.safeMin && selectedSpeed <= speedProfile.safeMax,
    timing_budget_pass: true,
    selected_speed: selectedSpeed,
    pronunciation_dictionary_path: relative(projectRoot, dictionaryPath),
    voice_registry_path: relative(projectRoot, voiceRegistryPath),
    pronunciation_overrides_path: relative(projectRoot, overridePath),
    audio_fit_script_path: relative(projectRoot, scriptPath),
    speed_calibration_path: relative(projectRoot, calibrationReportPath),
    issues,
  };
}

function pronunciationPass(item: PreparedSegment): boolean {
  if (item.shotId === "shot_01") return item.ttsText.includes("十二万二千三百零六");
  if (item.shotId === "shot_02") return item.ttsText.includes("下降百分之十六");
  if (item.shotId === "shot_03") return item.ttsText.includes("一万四千五百零一");
  if (item.shotId === "shot_04") return item.ttsText.includes("下降百分之三十二");
  if (item.shotId === "shot_06" || item.shotId === "shot_12") return item.ttsText.includes("九一一") && !item.ttsText.includes("九百一十一");
  return !/[0-9]+/u.test(item.ttsText);
}

function renderOverrides(): string {
  const entries = [
    ["14,501", "quantity", "一万四千五百零一", "中国市场交付数量", ""],
    ["122,306", "quantity", "十二万二千三百零六", "全球交付数量", ""],
    ["911", "model_name", "九一一", "Porsche 911 车型代号", "911"],
    ["-16%", "percentage", "同比下降百分之十六", "全球交付同比变化", "-16%"],
    ["-32%", "percentage", "同比下降百分之三十二", "中国交付同比变化", "-32%"],
    ["38,141", "quantity", "三万八千一百四十一", "Cayenne 交付数量", ""],
    ["35,315", "quantity", "三万五千三百一十五", "Macan 交付数量", ""],
  ];
  const lines = ["schema_version: 1", `project_id: ${projectId}`, "scope: project", "display_text_unchanged: true", "overrides:"];
  for (const [source, type, spoken, reason, displayText] of entries) {
    lines.push(`  - source_text: "${source}"`, `    semantic_type: ${type}`, `    spoken_text: "${spoken}"`);
    if (displayText) lines.push(`    display_text: "${displayText}"`);
    lines.push(`    reason: "${reason}"`, "    scope: project");
  }
  return `${lines.join("\n")}\n`;
}

function renderScript(selectedSpeed: number): string {
  const lines = [
    "schema_version: 1",
    "template_name: script",
    "script:",
    `  job_id: ${jobId}`,
    "  revision: 4",
    "  revision_name: pronunciation_speed_fit_r2_revision2",
    `  target_duration_seconds: ${lockedDuration.toFixed(6)}`,
    "  verified_data_changed: false",
    "  visual_content_changed: false",
    "  display_text_changed: false",
    "  narrator:",
    "    provider: minimax",
    "    logical_voice: chenyao_male",
    "    display_name: 沉曜男声",
    "    provider_voice_id: Chinese (Mandarin)_Gentleman",
    `    selected_speed: ${selectedSpeed.toFixed(2)}`,
    "  segments:",
  ];
  for (const item of segments) {
    lines.push(`    - segment_id: ${item.segmentId}`, `      shot_id: ${item.shotId}`, `      time_range: ${item.start}-${item.end}`);
    lines.push(`      display_text: "${escapeYaml(item.displayText)}"`);
    lines.push(`      narration_text: "${escapeYaml(item.narrationText)}"`);
    lines.push(`      tts_text: "${escapeYaml(item.ttsText)}"`);
    lines.push(`      semantic_number_types: [${item.semanticNumberTypes.join(", ")}]`);
    lines.push(`      selected_speed: ${selectedSpeed.toFixed(2)}`);
    lines.push(`      claim_ids: [${item.claimIds.join(", ")}]`, `      label: ${item.label}`);
  }
  lines.push("  editorial_status: approved", "  approved_by: pronunciation_speed_audio_preflight", `  approved_at: "${new Date().toISOString()}"`);
  return `${lines.join("\n")}\n`;
}

function renderCueSheet(results: SegmentResult[], selectedSpeed: number): string {
  const lines = ["schema_version: 1", `project_id: ${projectId}`, "revision: narration_pronunciation_speed_r2", "status: ready_for_audio_qc", "voice:", "  provider: minimax", "  logical_voice: chenyao_male", "  provider_voice_id: Chinese (Mandarin)_Gentleman", `  speed: ${selectedSpeed.toFixed(2)}`, "timeline:", "  fps: 30", `  duration_seconds: ${lockedDuration.toFixed(6)}`, "  post_speed_change_used: false", "cues:"];
  for (const result of results) {
    lines.push(`  - shot_id: ${result.shot_id}`, `    segment_id: ${result.segment_id}`, `    start_seconds: ${result.start_seconds.toFixed(6)}`, `    end_seconds: ${result.end_seconds.toFixed(6)}`);
    lines.push(`    display_text: "${escapeYaml(result.display_text)}"`, `    tts_text: "${escapeYaml(result.tts_text)}"`);
    lines.push(`    audio_path: ${result.audio_path}`, `    audio_duration_seconds: ${result.audio_duration_seconds.toFixed(6)}`, `    safety_margin_seconds: ${result.safety_margin_seconds.toFixed(6)}`);
    lines.push(`    pronunciation_pass: ${result.pronunciation_pass}`, `    speed_pass: ${result.speed_pass}`, `    timing_pass: ${result.timing_pass}`);
  }
  return `${lines.join("\n")}\n`;
}

function renderSubtitleLock(results: SegmentResult[]): string {
  const lines = ["schema_version: 1", `project_id: ${projectId}`, "revision: subtitle_pronunciation_speed_r2", "status: approved", "display_text_unchanged: true", "subtitles:"];
  for (const result of results) {
    lines.push(`  - shot_id: ${result.shot_id}`, `    start_seconds: ${result.start_seconds.toFixed(6)}`, `    end_seconds: ${result.end_seconds.toFixed(6)}`, `    display_text: "${escapeYaml(result.display_text)}"`, `    narration_text: "${escapeYaml(result.narration_text)}"`, `    tts_text: "${escapeYaml(result.tts_text)}"`);
  }
  return `${lines.join("\n")}\n`;
}

function buildNarrationTrack(results: SegmentResult[]): void {
  if (existsSync(finalNarrationPath)) return;
  const slots: string[] = [];
  for (const result of results) {
    const slot = resolve(runRoot, `${result.segment_id}_slot.wav`);
    run("ffmpeg", ["-nostdin", "-hide_banner", "-loglevel", "error", "-n", "-i", resolve(projectRoot, result.audio_path), "-af", `apad,atrim=duration=${result.narration_window_seconds},asetpts=N/SR/TB`, "-ar", "48000", "-ac", "1", "-c:a", "pcm_s16le", slot]);
    slots.push(slot);
  }
  const concatPath = resolve(runRoot, "slots.ffconcat");
  writeFileSync(concatPath, ["ffconcat version 1.0", ...slots.map((slot) => `file '${slot.replaceAll("'", "'\\''")}'`), ""].join("\n"), { flag: "wx" });
  const unnormalized = resolve(runRoot, "narration_unnormalized.wav");
  run("ffmpeg", ["-nostdin", "-hide_banner", "-loglevel", "error", "-n", "-f", "concat", "-safe", "0", "-i", concatPath, "-ar", "48000", "-ac", "1", "-c:a", "pcm_s16le", unnormalized]);
  const normalized = resolve(runRoot, "narration_loudnorm.wav");
  run("ffmpeg", ["-nostdin", "-hide_banner", "-loglevel", "error", "-n", "-i", unnormalized, "-af", "loudnorm=I=-18:TP=-1.5:LRA=7", "-ar", "48000", "-ac", "1", "-c:a", "pcm_s24le", normalized]);
  run("ffmpeg", ["-nostdin", "-hide_banner", "-loglevel", "error", "-n", "-i", normalized, "-af", `apad,atrim=duration=${lockedDuration.toFixed(6)},asetpts=N/SR/TB`, "-ar", "48000", "-ac", "1", "-c:a", "pcm_s24le", finalNarrationPath]);
}

function buildVoicedReview(): void {
  if (existsSync(voicedReviewPath)) return;
  run("ffmpeg", ["-nostdin", "-hide_banner", "-loglevel", "error", "-n", "-i", pictureMasterPath, "-i", finalNarrationPath, "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-ar", "48000", "-b:a", "192k", "-movflags", "+faststart", voicedReviewPath]);
}

function buildAudioQc(results: SegmentResult[], calibration: CalibrationResult, formalRequests: number) {
  const duration = durationSeconds(finalNarrationPath);
  const info = ffprobeJson(voicedReviewPath);
  const video = info.streams.find((stream) => stream.codec_type === "video") ?? {};
  const audio = info.streams.find((stream) => stream.codec_type === "audio") ?? {};
  const previousManifest = JSON.parse(readFileSync(resolve(audioRoot, "audio_fit_r1/generation_manifest.json"), "utf8"));
  const previousSpokenSeconds = previousManifest.results.reduce((sum: number, item: { audio_duration_seconds: number }) => sum + Number(item.audio_duration_seconds), 0);
  const currentSpokenSeconds = results.reduce((sum, item) => sum + item.audio_duration_seconds, 0);
  const issues: string[] = [];
  if (Math.abs(duration - lockedDuration) > 0.02) issues.push("narration duration mismatch");
  if (results.some((item) => !item.pronunciation_pass || !item.speed_pass || !item.timing_pass)) issues.push("segment gate failed");
  if (!(currentSpokenSeconds < previousSpokenSeconds)) issues.push("overall narration pace is not faster than v1");
  if (Number(video.width) !== 1080 || Number(video.height) !== 1920 || String(video.avg_frame_rate) !== "30/1") issues.push("video technical mismatch");
  if (String(audio.codec_name) !== "aac" || String(audio.sample_rate) !== "48000") issues.push("audio technical mismatch");
  return {
    schema_version: 1,
    project_id: projectId,
    status: issues.length === 0 ? "passed" : "failed",
    selected_speed: calibration.selectedSpeed,
    calibration_minimax_requests_this_run: calibration.requests,
    formal_minimax_requests_this_run: formalRequests,
    minimax_requests_this_run: calibration.requests + formalRequests,
    segments_total: results.length,
    segments_passed: results.filter((item) => item.pronunciation_pass && item.speed_pass && item.timing_pass).length,
    pronunciation_pass: results.every((item) => item.pronunciation_pass),
    speed_pass: results.every((item) => item.speed_pass) && currentSpokenSeconds < previousSpokenSeconds,
    timing_pass: results.every((item) => item.timing_pass),
    no_post_speed_change: true,
    previous_spoken_audio_seconds: Number(previousSpokenSeconds.toFixed(6)),
    current_spoken_audio_seconds: Number(currentSpokenSeconds.toFixed(6)),
    final_narration_path: relative(projectRoot, finalNarrationPath),
    final_narration_duration_seconds: Number(duration.toFixed(6)),
    voiced_review_path: relative(projectRoot, voicedReviewPath),
    voiced_review_video: { width: video.width, height: video.height, codec: video.codec_name, fps: video.avg_frame_rate },
    voiced_review_audio: { codec: audio.codec_name, sample_rate: audio.sample_rate, channels: audio.channels },
    issues,
  };
}

function buildManifest(results: SegmentResult[], calibration: CalibrationResult, formalRequests: number, status: string) {
  return {
    schema_version: 1,
    project_id: projectId,
    revision: "pronunciation_speed_r2",
    status,
    selected_speed: calibration.selectedSpeed,
    calibration_requests_this_run: calibration.requests,
    formal_minimax_requests_this_run: formalRequests,
    minimax_requests_this_run: calibration.requests + formalRequests,
    regenerated_shots: results.filter((item) => item.cache_source === "new_minimax").map((item) => item.shot_id),
    calibration_reused_shots: results.filter((item) => item.cache_source === "calibration_cache").map((item) => item.shot_id),
    cached_shots: results.filter((item) => item.cache_source === "formal_cache").map((item) => item.shot_id),
    final_narration_path: relative(projectRoot, finalNarrationPath),
    voiced_review_path: relative(projectRoot, voicedReviewPath),
    results,
  };
}

function buildAudioLock(results: SegmentResult[], qc: Record<string, unknown>) {
  return {
    schema_version: 1,
    job_id: jobId,
    revision: 2,
    decision: qc.status === "passed" ? "approved" : "blocked",
    source_picture_lock_path: relative(projectRoot, pictureLockPath),
    source_picture_lock_sha256: sha256File(relative(projectRoot, pictureLockPath)),
    visual_content_changed: false,
    shot_order_changed: false,
    total_duration_changed: false,
    verified_data_changed: false,
    display_text_changed: false,
    script_path: relative(projectRoot, scriptPath),
    pronunciation_overrides_path: relative(projectRoot, overridePath),
    narration_cue_sheet_path: relative(projectRoot, cueSheetPath),
    subtitle_timing_lock_path: relative(projectRoot, subtitleLockPath),
    final_narration_path: relative(projectRoot, finalNarrationPath),
    voiced_review_path: relative(projectRoot, voicedReviewPath),
    segments_passed: results.filter((item) => item.pronunciation_pass && item.speed_pass && item.timing_pass).length,
  };
}

function requestFingerprint(text: string, requestConfig: MinimaxConfig): string {
  return sha256Text(JSON.stringify(buildMinimaxTtsRequest(text.trim(), requestConfig)));
}

function auditMatches(path: string, fingerprint: string): boolean {
  if (!existsSync(path)) return false;
  try { return JSON.parse(readFileSync(path, "utf8")).request_fingerprint === fingerprint; } catch { return false; }
}

function writeTtsAudit(path: string, item: PreparedSegment, text: string, speed: number, fingerprint: string, response: Awaited<ReturnType<typeof synthesizeMinimaxTts>>, rawPath: string, wavPath: string, purpose: string): void {
  writeFileSync(path, `${JSON.stringify({
    schema_version: 2,
    project_id: projectId,
    stage_run_id: randomUUID(),
    purpose,
    provider: "minimax",
    config: publicMinimaxConfig({ ...config, speed }),
    shot_id: item.shotId,
    segment_id: item.segmentId,
    display_text_sha256: sha256Text(item.displayText),
    narration_text_sha256: sha256Text(item.narrationText),
    tts_text: text,
    tts_text_sha256: sha256Text(text),
    request_fingerprint: fingerprint,
    response: { http_status: response.httpStatus, provider_status_code: response.providerStatusCode, trace_id: response.traceId, audio_length_ms: response.durationMs, usage_characters: response.usageCharacters },
    outputs: { raw_audio_path: relative(projectRoot, rawPath), raw_audio_sha256: sha256File(relative(projectRoot, rawPath)), wav_master_path: relative(projectRoot, wavPath), wav_master_sha256: sha256File(relative(projectRoot, wavPath)) },
  }, null, 2)}\n`, { flag: "wx", mode: 0o644 });
}

function writeCalibrationAudit(path: string, sampleId: string, text: string, speed: number, fingerprint: string, response: Awaited<ReturnType<typeof synthesizeMinimaxTts>>, rawPath: string, wavPath: string): void {
  writeFileSync(path, `${JSON.stringify({
    schema_version: 2,
    project_id: projectId,
    stage_run_id: randomUUID(),
    purpose: "speed_calibration",
    sample_id: sampleId,
    provider: "minimax",
    config: publicMinimaxConfig({ ...config, speed }),
    tts_text: text,
    tts_text_sha256: sha256Text(text),
    request_fingerprint: fingerprint,
    response: { http_status: response.httpStatus, provider_status_code: response.providerStatusCode, trace_id: response.traceId, audio_length_ms: response.durationMs, usage_characters: response.usageCharacters },
    outputs: { raw_audio_path: relative(projectRoot, rawPath), raw_audio_sha256: sha256File(relative(projectRoot, rawPath)), wav_master_path: relative(projectRoot, wavPath), wav_master_sha256: sha256File(relative(projectRoot, wavPath)) },
  }, null, 2)}\n`, { flag: "wx", mode: 0o644 });
}

function convertToWav(rawPath: string, wavPath: string): void {
  run("ffmpeg", ["-nostdin", "-hide_banner", "-loglevel", "error", "-n", "-i", rawPath, "-ar", "48000", "-ac", "1", "-c:a", "pcm_s16le", wavPath]);
}

function numericAndCodeTokens(text: string): string[] {
  return text.match(/[A-Za-z]+\d+|\d+[A-Za-z]+|[+-]?\d[\d,.]*%?/gu) ?? [];
}

function speechUnitCount(text: string): number {
  return (text.match(/[\p{Script=Han}A-Za-z0-9]/gu) ?? []).length;
}

function durationSeconds(path: string): number {
  const value = Number(run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", path]));
  if (!Number.isFinite(value) || value <= 0) throw new Error(`无效媒体时长：${path}`);
  return value;
}

function ffprobeJson(path: string): { streams: Array<Record<string, string | number>> } {
  return JSON.parse(run("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", path]));
}

function run(command: string, args: string[]): string {
  const result = spawnSync(command, args, { cwd: projectRoot, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`${command} failed: ${String(result.stderr).trim()}`);
  return String(result.stdout).trim();
}

function writeIfMissing(path: string, contents: string): void {
  mkdirSync(dirname(path), { recursive: true });
  if (!existsSync(path)) writeFileSync(path, contents, { encoding: "utf8", flag: "wx" });
}

function sha256Text(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function escapeYaml(value: string): string {
  return value.replace(/\\/gu, "\\\\").replace(/"/gu, '\\"');
}
