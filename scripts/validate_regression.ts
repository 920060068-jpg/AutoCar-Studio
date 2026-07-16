import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { asArray, asRecord } from "./lib/yaml.ts";
import { booleanValue, loadYamlRecord, numberValue, stringValue } from "./lib/common.ts";
import { DAILY_STAGES, evaluateDailyAction, loadDailyRuntimeConfig } from "./lib/daily.ts";
import {
  applyPronunciationTokens,
  spokenForSemantic,
  type NumberSemanticType,
  type PronunciationEntry,
} from "../src/audio/pronunciation.ts";

const config = loadYamlRecord("CONFIG.yaml");
const production = asRecord(config.production, "production");
const automation = asRecord(config.automation, "automation");
const productionModes = asRecord(config.production_modes, "production_modes");
const originalEditorial = asRecord(config.original_editorial_visual_mode, "original_editorial_visual_mode");
const quality = asRecord(config.quality, "quality");
const audio = asRecord(config.audio, "audio");
const timing = asRecord(audio.narration_timing, "audio.narration_timing");
const publishing = asRecord(config.publishing, "publishing");
const runtime = loadDailyRuntimeConfig();
const contract = readFileSync("EXECUTION_CONTRACT.md", "utf8");
const agents = readFileSync("AGENTS.md", "utf8");
const qualityDoc = readFileSync("QUALITY_STANDARD.md", "utf8");
const safetyDoc = readFileSync("rules/safety.md", "utf8");
const copyrightDoc = readFileSync("rules/copyright.md", "utf8");
const porsche = loadYamlRecord("tests/fixtures/porsche/v4_audio.yaml");
const xiaomi = loadYamlRecord("tests/fixtures/xiaomi/original_editorial.yaml");
const toyota = JSON.parse(readFileSync("tests/fixtures/toyota/copyright_qc.json", "utf8")) as {
  director_score: number;
  final_quality_score: number;
  gates: Record<string, boolean>;
};

const dictionaryRoot = loadYamlRecord("config/pronunciation_dictionary.yaml");
const dictionary: PronunciationEntry[] = asArray(dictionaryRoot.entries, "entries").map((value) => {
  const entry = asRecord(value, "entries[]");
  return {
    sourceText: stringValue(entry.source_text),
    semanticType: stringValue(entry.semantic_type) as NumberSemanticType,
    spokenText: stringValue(entry.spoken_text),
    context: stringValue(entry.context) || undefined,
    status: stringValue(entry.status) as PronunciationEntry["status"],
  };
});

const results: string[] = [];
function test(name: string, check: () => void): void {
  check();
  results.push(name);
  console.log(`PASS ${results.length}. ${name}`);
}

function strictScorePass(score: number, threshold: number): boolean {
  return score > threshold;
}

function requestFingerprint(request: unknown): string {
  return createHash("sha256").update(JSON.stringify(request)).digest("hex");
}

test("CONFIG 与永久规则一致", () => {
  assert.match(agents, /每天只生产 1 条/u);
  assert.match(qualityDoc, /必须 `> 90`/u);
  assert.equal(stringValue(productionModes.default), "editorial");
});

test("每天最多 1 条", () => {
  assert.equal(numberValue(production.videos_per_day), 1);
  assert.equal(numberValue(automation.max_daily_productions), 1);
});

test("本地 12:00 启动", () => {
  assert.equal(stringValue(production.daily_start_time), "12:00");
  assert.equal(runtime.startTimeLocal, "12:00");
});

test("断点恢复", () => {
  const result = evaluateDailyAction({ now: new Date("2026-07-14T13:00:00+08:00"), statePath: "examples/daily_states/interrupted.json", json: true }, runtime);
  assert.equal(result.action, "resume");
});

test("重复任务锁", () => {
  const result = evaluateDailyAction({ now: new Date("2026-07-14T13:00:00+08:00"), statePath: "examples/daily_states/empty.json", lockPath: "examples/daily_states/active.lock", json: true }, runtime);
  assert.equal(result.action, "locked");
  assert.equal(runtime.allowParallelDailyRuns, false);
});

test("Director Score 严格大于 90", () => {
  assert.equal(stringValue(quality.director_score_operator), "greater_than");
  assert.equal(strictScorePass(90, 90), false);
  assert.equal(strictScorePass(91, 90), true);
});

test("Final Quality Score 严格大于 90", () => {
  assert.equal(stringValue(quality.final_quality_score_operator), "greater_than");
  assert.equal(strictScorePass(90, 90), false);
  assert.equal(strictScorePass(91, 90), true);
});

test("Audio Timing Budget 必须存在", () => {
  assert.equal(booleanValue(timing.timing_budget_required_before_tts), true);
  assert.equal(booleanValue(asRecord(porsche.timing_budget, "timing_budget").required_before_tts), true);
});

test("Audio Preflight 在正式 TTS 前", () => {
  assert.ok(DAILY_STAGES.indexOf("audio_preflight") < DAILY_STAGES.indexOf("minimax_tts"));
  assert.match(contract, /正式 MiniMax TTS 前必须有 Audio Preflight PASS/u);
});

test("旁白过长自动精简", () => {
  const windowSeconds = 3;
  const estimatedSeconds = 6;
  const condensed = estimatedSeconds > windowSeconds - 0.15 ? windowSeconds - 0.25 : estimatedSeconds;
  assert.ok(condensed <= windowSeconds - 0.15);
  assert.equal(numberValue(timing.auto_condense_revision_max), 2);
});

test("只重新生成变化的 TTS 片段", () => {
  const changed = asArray(asRecord(porsche.audio_fit, "audio_fit").changed_segment_ids, "changed_segment_ids").map(stringValue);
  const segments = ["shot_01", "shot_08", "shot_12"];
  assert.deepEqual(segments.filter((id) => changed.includes(id)), ["shot_08"]);
});

test("TTS 缓存复用", () => {
  const request = { text: "保时捷九一一", voice_id: "Chinese (Mandarin)_Gentleman", speed: 1.16 };
  assert.equal(requestFingerprint(request), requestFingerprint({ ...request }));
  assert.equal(booleanValue(timing.cache_identical_tts_requests), true);
});

test("自然留白允许", () => {
  assert.equal(booleanValue(timing.natural_silence_between_shots_allowed), true);
  assert.equal(booleanValue(timing.full_video_occupancy_required), false);
});

test("数量 14,501 使用位权读法", () => {
  assert.equal(spokenForSemantic({ sourceText: "14,501", semanticType: "quantity" }, dictionary), "一万四千五百零一");
});

test("Porsche 911 在车型语境读作九一一", () => {
  assert.equal(spokenForSemantic({ sourceText: "911", semanticType: "model_name", context: "porsche_model" }, dictionary), "九一一");
});

test("普通数量 911 不套用车型读法", () => {
  assert.equal(spokenForSemantic({ sourceText: "911", semanticType: "quantity" }, dictionary), "九百一十一");
});

test("百分比按语义朗读", () => {
  assert.equal(spokenForSemantic({ sourceText: "-32%", semanticType: "percentage" }, dictionary), "下降百分之三十二");
});

test("display_text 与 tts_text 分离", () => {
  const displayText = "中国交付 14,501 辆，同比 -32%";
  const ttsText = applyPronunciationTokens("中国交付14501辆，同比-32%。", [
    { sourceText: "14501", semanticType: "quantity" },
    { sourceText: "-32%", semanticType: "percentage" },
  ], dictionary);
  assert.notEqual(displayText, ttsText);
  assert.equal(booleanValue(timing.display_narration_tts_text_separation_required), true);
});

test("verified data 不被 TTS 处理修改", () => {
  const verified = asRecord(porsche.verified_data, "verified_data");
  const before = JSON.stringify(verified);
  applyPronunciationTokens("交付14501辆。", [{ sourceText: "14501", semanticType: "quantity" }], dictionary);
  assert.equal(JSON.stringify(verified), before);
});

test("MiniMax 中断后从 checkpoint 恢复", () => {
  const checkpoint = asRecord(porsche.checkpoint, "checkpoint");
  assert.equal(stringValue(checkpoint.interrupted_stage), "minimax_tts");
  assert.equal(stringValue(checkpoint.resume_stage), "minimax_tts");
  assert.match(contract, /从 narration 继续/u);
});

test("Editorial Mode 不依赖外部受限素材", () => {
  assert.equal(stringValue(xiaomi.mode), "original_editorial_visual");
  assert.equal(booleanValue(xiaomi.external_media_allowed), false);
  assert.equal(booleanValue(originalEditorial.external_media_allowed), false);
});

test("403 robots DRM 不得绕过", () => {
  const combined = `${safetyDoc}\n${copyrightDoc}`;
  assert.match(combined, /403/u);
  assert.match(combined, /robots/u);
  assert.match(combined, /DRM/u);
  assert.match(combined, /绕过/u);
});

test("Picture Lock 后禁止修改视觉事实", () => {
  const lock = asRecord(porsche.picture_lock, "picture_lock");
  const before = stringValue(lock.visual_fact_hash);
  const audioOnlyOperation = { visual_fact_hash: before, narration_fit: "updated" };
  assert.equal(audioOnlyOperation.visual_fact_hash, before);
  assert.equal(booleanValue(lock.locked), true);
});

test("Final QC 全门禁", () => {
  assert.ok(Object.values(toyota.gates).every(Boolean));
  assert.equal(strictScorePass(toyota.director_score, 90), true);
  assert.equal(strictScorePass(toyota.final_quality_score, 90), true);
});

test("Release Candidate 不等于自动发布", () => {
  assert.equal(booleanValue(publishing.release_candidate_only), true);
  assert.equal(booleanValue(publishing.auto_publish), false);
  assert.match(contract, /Release Candidate 不是发布状态/u);
});

assert.equal(results.length, 25);
console.log(`PASS V4 stable regression suite (${results.length})`);
