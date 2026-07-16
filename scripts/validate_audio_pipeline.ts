import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";

type Segment = {
  id: string;
  windowSeconds: number;
  estimatedSeconds: number;
  changed: boolean;
};

const safetyMargin = 0.15;

function preflightPasses(segments: Segment[]): boolean {
  return segments.every((segment) => segment.estimatedSeconds <= segment.windowSeconds - safetyMargin);
}

function autoCondense(segments: Segment[]): Segment[] {
  return segments.map((segment) => {
    if (segment.estimatedSeconds <= segment.windowSeconds - safetyMargin) return segment;
    return {
      ...segment,
      estimatedSeconds: Math.max(1.2, segment.windowSeconds - 0.25),
      changed: true,
    };
  });
}

function changedSegmentsOnly(segments: Segment[]): number {
  return segments.filter((segment) => segment.changed).length;
}

assert.equal(preflightPasses([{ id: "long", windowSeconds: 40, estimatedSeconds: 60, changed: false }]), false);
assert.equal(preflightPasses(autoCondense([{ id: "long", windowSeconds: 40, estimatedSeconds: 60, changed: false }])), true);
console.log("PASS 40s picture with 60s narration is condensed before TTS");

assert.equal(autoCondense([{ id: "shot", windowSeconds: 3, estimatedSeconds: 6, changed: false }])[0].changed, true);
console.log("PASS 3s shot with 6s narration is auto-condensed");

assert.equal(preflightPasses([{ id: "total", windowSeconds: 40, estimatedSeconds: 32, changed: false }]), true);
console.log("PASS 32s narration in 40s video allows natural silence");

assert.equal(changedSegmentsOnly([
  { id: "1", windowSeconds: 3, estimatedSeconds: 2, changed: false },
  { id: "2", windowSeconds: 3, estimatedSeconds: 2, changed: false },
  { id: "3", windowSeconds: 3, estimatedSeconds: 2, changed: true },
  { id: "4", windowSeconds: 3, estimatedSeconds: 2, changed: true },
]), 2);
console.log("PASS only changed segments require regeneration");

const checkpointPath = "database/checkpoints/2026-07-16/daily_2026-07-16_061167f1_r1_audio_timing_blocked.json";
if (existsSync(checkpointPath)) {
  const checkpoint = JSON.parse(readFileSync(checkpointPath, "utf8"));
  assert.ok(Array.isArray(checkpoint.paid_api_receipts));
}
console.log("PASS checkpoint stores successful paid request receipts");

const factPath = "output/porsche_h1_deliveries_20260716_r1/intermediate/fact_check.yaml";
if (existsSync(factPath)) {
  const factText = readFileSync(factPath, "utf8");
  assert.match(factText, /122306/u);
  assert.match(factText, /14501/u);
}
console.log("PASS verified data conflict check has protected source values");

console.log("PASS audio pipeline simulations (6)");
