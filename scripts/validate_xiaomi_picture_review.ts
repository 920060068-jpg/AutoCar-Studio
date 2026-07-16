import {readFileSync} from "node:fs";

import {XIAOMI_ORIGINAL_EDITORIAL_DURATION_IN_FRAMES, XIAOMI_ORIGINAL_EDITORIAL_SHOTS} from "../src/remotion/xiaomiOriginalEditorialData.ts";
import {loadYamlRecord, numberValue, sha256File, stringValue} from "./lib/common.ts";
import {asArray, asRecord} from "./lib/yaml.ts";

const PROJECT = "output/xiaomi_skynomad_20260714_r1";
const SCRIPT = `${PROJECT}/intermediate/script_r2_director_v3.yaml`;
const STORYBOARD = `${PROJECT}/intermediate/storyboard_r9_original_editorial.yaml`;
const MANIFEST = `${PROJECT}/intermediate/original_visual_manifest_r1.yaml`;
const COMPOSITION = "src/remotion/XiaomiOriginalEditorialProject.tsx";

const expectedHashes: Record<string, string> = {
  [SCRIPT]: "e908dd385f129e0656d8848bbbdbd04a0833b4b6bb0d1b4f18668006bb9e1634",
  [STORYBOARD]: "31ffa734611c1eec3dc59ba391bbeea0e30a8a6f7d534af56a42f254847d055a",
  [MANIFEST]: "9ced95b549972d0e5a8d26c6b065d4176403f3141d614c1ef2ab7bfd54659bee",
};

const issues: string[] = [];

for (const [path, expected] of Object.entries(expectedHashes)) {
  const actual = sha256File(path);
  if (actual !== expected) issues.push(`${path} hash changed: ${actual}`);
}

const script = asRecord(loadYamlRecord(SCRIPT).script, "script");
const storyboard = asRecord(loadYamlRecord(STORYBOARD).storyboard, "storyboard");
const segments = asArray(script.segments, "script.segments");
const shots = asArray(storyboard.shots, "storyboard.shots");

if (segments.length !== 15) issues.push(`script has ${segments.length} segments, expected 15`);
if (shots.length !== 15) issues.push(`storyboard has ${shots.length} shots, expected 15`);
if (XIAOMI_ORIGINAL_EDITORIAL_SHOTS.length !== 15) issues.push("composition data does not contain 15 shots");
if (XIAOMI_ORIGINAL_EDITORIAL_DURATION_IN_FRAMES !== 1245) issues.push("composition duration is not 1245 frames");

let expectedFrame = 0;
for (let index = 0; index < XIAOMI_ORIGINAL_EDITORIAL_SHOTS.length; index += 1) {
  const renderShot = XIAOMI_ORIGINAL_EDITORIAL_SHOTS[index];
  const storyboardShot = asRecord(shots[index], `storyboard.shots[${index}]`);
  const segment = asRecord(segments[index], `script.segments[${index}]`);
  const shotId = stringValue(storyboardShot.shot_id);
  const segmentId = stringValue(segment.segment_id);
  const storyboardNarration = stringValue(storyboardShot.narration);
  const scriptNarration = stringValue(segment.narration);
  const startFrame = Math.round(numberValue(storyboardShot.start_seconds) * 30);
  const durationFrames = Math.round(numberValue(storyboardShot.duration) * 30);

  if (renderShot.shotId !== shotId) issues.push(`${renderShot.shotId}: storyboard id mismatch (${shotId})`);
  if (segmentId !== `segment_${String(index + 1).padStart(2, "0")}`) issues.push(`${renderShot.shotId}: script segment order mismatch`);
  if (renderShot.caption !== scriptNarration || renderShot.caption !== storyboardNarration) {
    issues.push(`${renderShot.shotId}: caption differs from approved narration`);
  }
  if (renderShot.from !== startFrame || renderShot.from !== expectedFrame) issues.push(`${renderShot.shotId}: start frame mismatch`);
  if (renderShot.durationInFrames !== durationFrames) issues.push(`${renderShot.shotId}: duration mismatch`);
  expectedFrame += renderShot.durationInFrames;
}

if (expectedFrame !== 1245) issues.push(`shot timeline ends at ${expectedFrame}, expected 1245`);

for (const id of ["shot_07", "shot_08", "shot_09"]) {
  const shot = XIAOMI_ORIGINAL_EDITORIAL_SHOTS.find((candidate) => candidate.shotId === id);
  if (shot?.disclosure !== "原创示意｜非官方结构图｜非实拍") {
    issues.push(`${id}: required persistent disclosure is missing`);
  }
}

const shot12 = XIAOMI_ORIGINAL_EDITORIAL_SHOTS.find((shot) => shot.shotId === "shot_12");
const shot13 = XIAOMI_ORIGINAL_EDITORIAL_SHOTS.find((shot) => shot.shotId === "shot_13");
if (!shot12?.disclosure.includes("非验证结论") || !shot12.disclosure.includes("待实车")) {
  issues.push("shot_12 does not clearly state that the conclusion is unverified");
}
if (!shot13?.disclosure.includes("编辑分析") || !shot13.disclosure.includes("关系示意")) {
  issues.push("shot_13 does not clearly state editorial analysis / relationship illustration");
}

const source = readFileSync(COMPOSITION, "utf8");
for (const forbidden of ["<Audio", "<Video", "<Img", "staticFile(", "http://", "https://", "Math.random", "Date("]) {
  if (source.includes(forbidden)) issues.push(`composition contains forbidden token: ${forbidden}`);
}
for (const unresolved of ["{{variable}}", "{{placeholder}}", "<required>", "<missing>", "TODO_TEMPLATE"]) {
  if (source.includes(unresolved)) issues.push(`composition contains unresolved template token: ${unresolved}`);
}

if (issues.length > 0) {
  console.error("FAIL picture review lock validation");
  for (const issue of issues) console.error(`- ${issue}`);
  process.exitCode = 1;
} else {
  console.log("PASS picture review lock validation");
  console.log("- locked input hashes: 3/3 unchanged");
  console.log("- timeline: 15 shots / 1245 frames / 41.5 seconds");
  console.log("- approved captions: 15/15 exact match");
  console.log("- external visual and audio references: 0");
  console.log("- disclosure requirements: present in render data");
}
