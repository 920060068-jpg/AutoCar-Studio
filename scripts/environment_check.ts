import {existsSync} from "node:fs";
import {dirname, resolve} from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";

type ToolCheck = {
  available: boolean;
  command: string;
  path: string;
  version: string;
};

const projectPath = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const checkTool = (command: string, versionArgs: string[]): ToolCheck => {
  const lookup = spawnSync("/usr/bin/which", [command], {
    encoding: "utf8",
  });
  const commandPath = lookup.status === 0 ? lookup.stdout.trim() : "";

  if (!commandPath) {
    return {available: false, command, path: "", version: ""};
  }

  const versionCheck = spawnSync(commandPath, versionArgs, {
    encoding: "utf8",
  });
  const versionOutput = `${versionCheck.stdout ?? ""}${versionCheck.stderr ?? ""}`
    .trim()
    .split("\n")[0] ?? "";

  return {
    available: versionCheck.status === 0,
    command,
    path: commandPath,
    version: versionOutput,
  };
};

const tools = {
  node: checkTool("node", ["--version"]),
  npm: checkTool("npm", ["--version"]),
  ffmpeg: checkTool("ffmpeg", ["-version"]),
};

const missing = Object.values(tools)
  .filter((tool) => !tool.available)
  .map((tool) => tool.command);

const report = {
  platform: {
    isMacOS: process.platform === "darwin",
    name: process.platform,
  },
  currentRuntime: {
    executable: process.execPath,
    nodeVersion: process.version,
  },
  project: {
    path: projectPath,
    exists: existsSync(projectPath),
    packageJsonExists: existsSync(resolve(projectPath, "package.json")),
    nvmrcExists: existsSync(resolve(projectPath, ".nvmrc")),
  },
  tools,
  missing,
};

console.log(JSON.stringify(report, null, 2));

if (process.argv.includes("--strict") && (!report.platform.isMacOS || missing.length > 0)) {
  process.exitCode = 1;
}
