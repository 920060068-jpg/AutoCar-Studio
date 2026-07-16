import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

type Finding = { scope: string; path: string; line: number; label: string };

const patterns = [
  { label: "OpenAI-style key", regex: /\bsk-[A-Za-z0-9_-]{20,}\b/gu },
  { label: "private key block", regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/gu },
  { label: "assigned secret", regex: /\b(?:OPENAI_API_KEY|MINIMAX_API_KEY|API_KEY|PASSWORD|TOKEN|SECRET)\b[ \t]*[:=][ \t]*["']?([^\s"'#]{16,})/gu },
] as const;
const placeholder = /^(?:<.*>|\$\{.*\}|your[_-]|example|placeholder|redacted|change[_-]?me|test[_-]?only)/iu;

function scan(scope: string, path: string, text: string): Finding[] {
  if (text.includes("\0")) return [];
  const findings: Finding[] = [];
  for (const { label, regex } of patterns) {
    regex.lastIndex = 0;
    for (const match of text.matchAll(regex)) {
      const value = match[1] ?? match[0];
      if (placeholder.test(value)) continue;
      const line = text.slice(0, match.index).split("\n").length;
      findings.push({ scope, path, line, label });
    }
  }
  return findings;
}

const candidateOutput = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"]);
const candidates = candidateOutput.toString("utf8").split("\0").filter(Boolean);
const findings: Finding[] = [];
for (const path of candidates) findings.push(...scan("current", path, readFileSync(path, "utf8")));

const commits = execFileSync("git", ["rev-list", "--all"], { encoding: "utf8" }).trim().split("\n").filter(Boolean);
for (const commit of commits) {
  const paths = execFileSync("git", ["ls-tree", "-r", "--name-only", "-z", commit])
    .toString("utf8").split("\0").filter(Boolean);
  for (const path of paths) {
    const contents = execFileSync("git", ["show", `${commit}:${path}`]);
    findings.push(...scan(`history:${commit.slice(0, 12)}`, path, contents.toString("utf8")));
  }
}

if (findings.length > 0) {
  console.error("FAIL secret scan");
  for (const finding of findings) {
    console.error(`- ${finding.scope} ${finding.path}:${finding.line} ${finding.label}`);
  }
  process.exitCode = 1;
} else {
  console.log(`PASS secret scan (${candidates.length} current files, ${commits.length} historical commits)`);
}
