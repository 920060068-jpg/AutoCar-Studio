import { strict as assert } from "node:assert";
import {
  evaluateDailyAction,
  loadDailyRuntimeConfig,
  type DailyCliOptions,
} from "./lib/daily.ts";

const runtime = loadDailyRuntimeConfig();

function options(now: string, statePath: string, lockPath?: string): DailyCliOptions {
  return { now: new Date(now), statePath, lockPath, json: true };
}

const cases = [
  {
    name: "before 12:00 waits",
    actual: evaluateDailyAction(options("2026-07-14T11:59:00+08:00", "examples/daily_states/empty.json"), runtime).action,
    expected: "wait",
  },
  {
    name: "after 12:00 starts today's incomplete production",
    actual: evaluateDailyAction(options("2026-07-14T12:01:00+08:00", "examples/daily_states/empty.json"), runtime).action,
    expected: "start",
  },
  {
    name: "completed production does nothing",
    actual: evaluateDailyAction(options("2026-07-14T13:00:00+08:00", "examples/daily_states/completed.json"), runtime).action,
    expected: "already_complete",
  },
  {
    name: "interrupted production resumes from checkpoint",
    actual: evaluateDailyAction(options("2026-07-14T13:00:00+08:00", "examples/daily_states/interrupted.json"), runtime).action,
    expected: "resume",
  },
  {
    name: "active lock blocks duplicate instance",
    actual: evaluateDailyAction(options(
      "2026-07-14T13:00:00+08:00",
      "examples/daily_states/empty.json",
      "examples/daily_states/active.lock",
    ), runtime).action,
    expected: "locked",
  },
  {
    name: "missed previous date is not backfilled",
    actual: evaluateDailyAction(options("2026-07-15T13:00:00+08:00", "examples/daily_states/interrupted.json"), runtime).action,
    expected: "start",
  },
] as const;

for (const testCase of cases) {
  assert.equal(testCase.actual, testCase.expected, testCase.name);
  console.log(`PASS ${testCase.name}`);
}

console.log(`PASS daily automation simulations (${cases.length})`);
