import { strict as assert } from "node:assert";
import { buildMinimaxTtsRequest } from "../src/audio/minimax/client.ts";
import { loadMinimaxConfig } from "../src/audio/minimax/config.ts";
import { applyPronunciationTokens, spokenForSemantic, type NumberSemanticType, type PronunciationEntry } from "../src/audio/pronunciation.ts";
import { loadYamlRecord, stringValue } from "./lib/common.ts";
import { asArray, asRecord } from "./lib/yaml.ts";

const root = loadYamlRecord("config/pronunciation_dictionary.yaml");
const dictionary: PronunciationEntry[] = asArray(root.entries, "entries").map((item) => {
  const record = asRecord(item, "entries[]");
  const status = stringValue(record.status);
  assert.ok(status === "approved" || status === "provider_native_verified");
  return {
    sourceText: stringValue(record.source_text),
    semanticType: stringValue(record.semantic_type) as NumberSemanticType,
    spokenText: stringValue(record.spoken_text),
    context: stringValue(record.context) || undefined,
    status,
  };
});

assert.equal(spokenForSemantic({ sourceText: "14,501", semanticType: "quantity" }, dictionary), "一万四千五百零一");
assert.equal(spokenForSemantic({ sourceText: "122,306", semanticType: "quantity" }, dictionary), "十二万二千三百零六");
console.log("PASS quantity semantics use Chinese place values");

assert.equal(spokenForSemantic({ sourceText: "911", semanticType: "model_name", context: "porsche_model" }, dictionary), "九一一");
assert.equal(spokenForSemantic({ sourceText: "911", semanticType: "quantity" }, dictionary), "九百一十一");
console.log("PASS Porsche 911 override is contextual, not global");

assert.equal(spokenForSemantic({ sourceText: "-32%", semanticType: "percentage" }, dictionary), "下降百分之三十二");
console.log("PASS signed percentage keeps semantic direction");

assert.equal(spokenForSemantic({ sourceText: "SU7", semanticType: "model_name", context: "xiaomi_model" }, dictionary), "S U 七");
assert.equal(spokenForSemantic({ sourceText: "YU7", semanticType: "model_name", context: "xiaomi_model" }, dictionary), "Y U 七");
console.log("PASS SU7 and YU7 use model dictionary pronunciations");

const displayText = "中国交付 14,501 辆，同比 -32%";
const narrationText = "中国交付14501辆，同比-32%。";
const ttsText = applyPronunciationTokens(narrationText, [
  { sourceText: "14501", semanticType: "quantity" },
  { sourceText: "-32%", semanticType: "percentage" },
], dictionary);
assert.equal(displayText, "中国交付 14,501 辆，同比 -32%");
assert.equal(ttsText, "中国交付一万四千五百零一辆，同比下降百分之三十二。");
assert.notEqual(displayText, ttsText);
console.log("PASS display_text, narration_text and tts_text remain separate");

const config = loadMinimaxConfig();
const request = buildMinimaxTtsRequest("测试语速。", { ...config, speed: 1.16 });
assert.equal(request.voice_setting.voice_id, "Chinese (Mandarin)_Gentleman");
assert.equal(request.voice_setting.speed, 1.16);
assert.equal(config.speed, 1.16);
const perShotRequest = buildMinimaxTtsRequest("数字钩子。", { ...config, speed: 1.12 });
assert.equal(perShotRequest.voice_setting.speed, 1.12);
assert.notEqual(perShotRequest.voice_setting.speed, config.speed);
console.log("PASS TTS request inherits per-shot calibrated speed");

console.log("PASS pronunciation and speed pipeline tests (7)");
