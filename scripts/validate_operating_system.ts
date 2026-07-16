import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, relative, resolve } from "node:path";
import { parseYaml } from "./lib/yaml.ts";
import { projectRoot } from "./lib/common.ts";

const issues: string[] = [];
const skipDirectories = new Set([".git", "node_modules", "output", "assets", "tmp", "dist"]);

function walk(directory: string): string[] {
  const result: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && skipDirectories.has(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) result.push(...walk(path));
    else if (entry.isFile()) result.push(path);
  }
  return result;
}

const requiredFiles = [
  "AGENTS.md",
  "PROJECT_MEMORY.md",
  "CONFIG.yaml",
  "DAILY_PRODUCTION.md",
  "QUALITY_STANDARD.md",
  "FAILURE_RECOVERY.md",
  "ENGINEERING_GUIDE.md",
  "DIRECTOR_BIBLE.md",
  "EDITORIAL_POLICY.md",
  "ASSET_POLICY.md",
  "ROADMAP.md",
  "OPERATIONS_RUNBOOK.md",
  "workflows/daily_pipeline.md",
  "workflows/daily_recovery_pipeline.md",
  "database/daily_production_state.json",
  "database/checkpoints/README.md",
  "logs/daily/README.md",
  "docs/CODEX_AUTOMATION_SETUP.md",
];
for (const path of requiredFiles) {
  if (!existsSync(resolve(projectRoot, path))) issues.push(`missing required file: ${path}`);
}

const files = walk(projectRoot);
let jsonCount = 0;
let yamlCount = 0;
for (const path of files) {
  const extension = extname(path).toLowerCase();
  try {
    if (extension === ".json") {
      JSON.parse(readFileSync(path, "utf8"));
      jsonCount += 1;
    } else if ([".yaml", ".yml"].includes(extension)) {
      parseYaml(readFileSync(path, "utf8"));
      yamlCount += 1;
    }
  } catch (error) {
    issues.push(`${relative(projectRoot, path)} parse failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

let referenceCount = 0;
for (const path of files.filter((file) => extname(file).toLowerCase() === ".md")) {
  const contents = readFileSync(path, "utf8");
  const links = contents.matchAll(/\[[^\]]+\]\(([^)]+)\)/g);
  for (const match of links) {
    const raw = match[1].trim().replace(/^<|>$/g, "");
    if (!raw || /^(?:https?:|mailto:|#)/.test(raw)) continue;
    const withoutAnchor = raw.split("#")[0];
    const target = resolve(dirname(path), withoutAnchor);
    referenceCount += 1;
    if (!existsSync(target)) issues.push(`${relative(projectRoot, path)} has missing link: ${raw}`);
  }
}

const activeTextFiles = files.filter((path) => {
  const rel = relative(projectRoot, path);
  if (rel === "CHANGELOG.md") return false;
  if (/^scripts\/(?:create_|prepare_)/.test(rel)) return false;
  return /^(?:AGENTS\.md|README\.md|PROJECT_MEMORY\.md|CONFIG\.yaml|EXECUTION_CONTRACT\.md|DAILY_PRODUCTION\.md|QUALITY_STANDARD\.md|FAILURE_RECOVERY\.md|ENGINEERING_GUIDE\.md|DIRECTOR_BIBLE\.md|EDITORIAL_POLICY\.md|ASSET_POLICY\.md|OPERATIONS_RUNBOOK\.md|workflows\/|rules\/|agents\/|templates\/|examples\/|src\/)/.test(rel);
});
const conflicts = [
  { label: "two videos per day", pattern: /每天\s*2\s*条|每天两条|2\s*videos\/day|videos_per_day:\s*2|daily_target:\s*2/i },
  { label: "old duration range", pattern: /25[–—-]60\s*秒/ },
  { label: "mandatory ordinary human production approval", pattern: /execution_requires_human_approval:\s*true|必须普通人工确认|人工审核不可豁免|ready_for_human_review|needs_human_review|##\s+Human Review/i },
  { label: "non-strict Director threshold", pattern: /Director Score\s*(?:≥|>=)\s*90/i },
  { label: "non-strict final threshold", pattern: /Final Quality Score\s*(?:≥|>=)\s*90/i },
];
for (const path of activeTextFiles) {
  const contents = readFileSync(path, "utf8");
  for (const conflict of conflicts) {
    if (conflict.pattern.test(contents)) issues.push(`${relative(projectRoot, path)} contains ${conflict.label}`);
  }
}

const packageJson = JSON.parse(readFileSync(resolve(projectRoot, "package.json"), "utf8")) as { scripts?: Record<string, string> };
for (const name of ["daily:status", "daily:check", "daily:run", "daily:resume", "typecheck", "test:regression", "validate:baseline"]) {
  if (!packageJson.scripts?.[name]) issues.push(`package.json missing script: ${name}`);
}

if (issues.length > 0) {
  console.error("FAIL operating system validation");
  for (const issue of issues) console.error(`- ${issue}`);
  process.exitCode = 1;
} else {
  console.log(`PASS operating system validation (${jsonCount} JSON, ${yamlCount} YAML, ${referenceCount} local links)`);
}
