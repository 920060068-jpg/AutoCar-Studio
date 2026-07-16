import { existsSync, writeFileSync } from "node:fs";
import { asArray, asRecord, type YamlValue } from "./lib/yaml.ts";
import { loadYamlRecord, positionalArgs, projectPath, stringValue } from "./lib/common.ts";

function normalized(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, "")
    .replace(/(最新|突发|重磅|官方|消息)/g, "");
}

function bigrams(value: string): Set<string> {
  const tokens = new Set<string>();
  if (value.length < 2) {
    if (value) tokens.add(value);
    return tokens;
  }
  for (let index = 0; index < value.length - 1; index += 1) {
    tokens.add(value.slice(index, index + 2));
  }
  return tokens;
}

function similarity(left: string, right: string): number {
  if (left === right) return 1;
  const a = bigrams(left);
  const b = bigrams(right);
  const union = new Set([...a, ...b]);
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection += 1;
  return union.size === 0 ? 0 : intersection / union.size;
}

const args = process.argv.slice(2);
const [inputPath = "data/topics.sample.yaml"] = positionalArgs(args);
const outputIndex = args.indexOf("--output");
const outputPath = outputIndex >= 0 ? args[outputIndex + 1] : "";

try {
  if (outputIndex >= 0 && (!outputPath || outputPath.startsWith("--"))) {
    throw new Error("--output requires a new file path");
  }
  const document = loadYamlRecord(inputPath);
  const scope = asRecord(document.deduplication_scope, "deduplication_scope");
  const historyStart = stringValue(scope.history_window_start);
  const historyEnd = stringValue(scope.history_window_end);
  if (!historyStart || !historyEnd) throw new Error("historical deduplication window is required");
  const topics = asArray(document.topics, "topics").map((value, index) => {
    const topic = asRecord(value, `topics[${index}]`);
    const topicId = stringValue(topic.topic_id);
    const title = stringValue(topic.normalized_title) || stringValue(topic.title);
    if (!topicId || !title) throw new Error(`topics[${index}] requires topic_id and title`);
    return { topic, topicId, title: normalized(title) };
  });

  const groups: { canonical_topic_id: string; duplicate_topic_ids: string[]; similarity: number[] }[] = [];
  const assigned = new Set<string>();

  for (let leftIndex = 0; leftIndex < topics.length; leftIndex += 1) {
    const left = topics[leftIndex];
    if (assigned.has(left.topicId)) continue;
    const duplicates: string[] = [];
    const scores: number[] = [];
    for (let rightIndex = leftIndex + 1; rightIndex < topics.length; rightIndex += 1) {
      const right = topics[rightIndex];
      if (assigned.has(right.topicId)) continue;
      const score = similarity(left.title, right.title);
      if (score >= 0.72) {
        duplicates.push(right.topicId);
        scores.push(Number(score.toFixed(3)));
        assigned.add(right.topicId);
      }
    }
    groups.push({ canonical_topic_id: left.topicId, duplicate_topic_ids: duplicates, similarity: scores });
  }

  const result: { [key: string]: YamlValue } = {
    schema_version: 1,
    source: inputPath,
    history_window_start: historyStart,
    history_window_end: historyEnd,
    threshold: 0.72,
    groups,
  };
  const payload = `${JSON.stringify(result, null, 2)}\n`;

  if (outputPath) {
    const absoluteOutput = projectPath(outputPath);
    if (existsSync(absoluteOutput)) throw new Error(`Refusing to overwrite existing file: ${outputPath}`);
    writeFileSync(absoluteOutput, payload, { encoding: "utf8", flag: "wx" });
    console.log(`PASS wrote ${outputPath}`);
  } else {
    console.log(payload.trimEnd());
  }
} catch (error) {
  console.error(`FAIL ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
