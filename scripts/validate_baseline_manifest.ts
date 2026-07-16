import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { sha256File } from "./lib/common.ts";

type Manifest = {
  version: string;
  channel: string;
  status: string;
  git_commit: string;
  environment: Record<string, string>;
  files: Record<string, string>;
  tests: Record<string, string>;
};

const manifest = JSON.parse(readFileSync("BASELINE_MANIFEST.json", "utf8")) as Manifest;
assert.equal(manifest.version, "4.0.0");
assert.equal(manifest.channel, "stable");
assert.equal(manifest.status, "frozen");
assert.equal(manifest.git_commit, "refs/tags/v4.0.0-stable");
for (const [name, value] of Object.entries(manifest.environment)) {
  assert.ok(value.length > 0, `environment.${name} is empty`);
}
for (const [path, expected] of Object.entries(manifest.files)) {
  assert.equal(sha256File(path), expected, `${path} SHA-256 mismatch`);
}
for (const [name, result] of Object.entries(manifest.tests)) {
  assert.equal(result, "pass", `${name} must be pass`);
}
console.log(`PASS BASELINE_MANIFEST.json (${Object.keys(manifest.files).length} hashes)`);
