import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";
import { asRecord, parseYaml, type YamlValue } from "./yaml.ts";

export const projectRoot = resolve(process.cwd());

export function projectPath(inputPath: string): string {
  return resolve(projectRoot, inputPath);
}

export function displayPath(inputPath: string): string {
  return relative(projectRoot, inputPath) || ".";
}

export function loadYaml(inputPath: string): YamlValue {
  const absolutePath = projectPath(inputPath);
  if (!existsSync(absolutePath)) throw new Error(`File not found: ${inputPath}`);
  if (!statSync(absolutePath).isFile()) throw new Error(`Not a file: ${inputPath}`);
  return parseYaml(readFileSync(absolutePath, "utf8"));
}

export function loadYamlRecord(inputPath: string): { [key: string]: YamlValue } {
  return asRecord(loadYaml(inputPath), inputPath);
}

export function sha256File(inputPath: string): string {
  const absolutePath = projectPath(inputPath);
  return createHash("sha256").update(readFileSync(absolutePath)).digest("hex");
}

export function stringValue(value: YamlValue | undefined): string {
  return typeof value === "string" ? value : "";
}

export function numberValue(value: YamlValue | undefined): number {
  return typeof value === "number" ? value : Number.NaN;
}

export function booleanValue(value: YamlValue | undefined): boolean | null {
  return typeof value === "boolean" ? value : null;
}

export function failIfIssues(scope: string, issues: string[]): void {
  if (issues.length === 0) {
    console.log(`PASS ${scope}`);
    return;
  }

  console.error(`FAIL ${scope}`);
  for (const issue of issues) console.error(`- ${issue}`);
  process.exitCode = 1;
}

export function positionalArgs(args: string[]): string[] {
  const result: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index].startsWith("--")) {
      if (args[index] === "--output") index += 1;
      continue;
    }
    result.push(args[index]);
  }
  return result;
}
