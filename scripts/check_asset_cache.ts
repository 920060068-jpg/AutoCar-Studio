import {createHash} from "node:crypto";
import {existsSync, readFileSync, statSync} from "node:fs";
import {resolve} from "node:path";

type JsonRecord = Record<string, unknown>;

const args = process.argv.slice(2);
let filePath = "";
let sourceUrl = "";

for (let index = 0; index < args.length; index += 1) {
  const value = args[index];
  if (value === "--source-url") {
    sourceUrl = args[index + 1] ?? "";
    index += 1;
  } else if (!value.startsWith("--") && !filePath) {
    filePath = value;
  }
}

if (!filePath && !sourceUrl) {
  console.error("Usage: check_asset_cache.ts [local-file] [--source-url <url>]");
  process.exit(1);
}

const loadJson = (path: string): JsonRecord => {
  return JSON.parse(readFileSync(resolve(process.cwd(), path), "utf8")) as JsonRecord;
};

const recordsOf = (document: JsonRecord): JsonRecord[] => {
  return Array.isArray(document.records)
    ? document.records.filter((value): value is JsonRecord => typeof value === "object" && value !== null)
    : [];
};

const normalizeUrl = (value: string): string => {
  if (!value) return "";
  const url = new URL(value);
  url.hash = "";
  url.hostname = url.hostname.toLowerCase();
  for (const key of [...url.searchParams.keys()]) {
    if (/^(utm_|spm$|from$|source$)/i.test(key)) url.searchParams.delete(key);
  }
  url.searchParams.sort();
  return url.toString();
};

let sha256 = "";
let size = 0;

if (filePath) {
  const absolutePath = resolve(process.cwd(), filePath);
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }
  const content = readFileSync(absolutePath);
  sha256 = createHash("sha256").update(content).digest("hex");
  size = content.byteLength;
}

let normalizedSourceUrl = "";
try {
  normalizedSourceUrl = normalizeUrl(sourceUrl);
} catch {
  console.error(`Invalid source URL: ${sourceUrl}`);
  process.exit(1);
}

const cacheRecords = recordsOf(loadJson("database/asset_cache.json"));
const assetRecords = recordsOf(loadJson("database/assets.json"));
const hits: Array<{asset_id: string; matched_by: string; local_path: string; source: string}> = [];

for (const record of cacheRecords) {
  const hashHit = sha256 && record.sha256 === sha256;
  const urlHit = normalizedSourceUrl && record.normalized_source_url === normalizedSourceUrl;
  if (hashHit || urlHit) {
    hits.push({
      asset_id: String(record.asset_id ?? ""),
      local_path: String(record.local_path ?? ""),
      matched_by: hashHit && urlHit ? "sha256+source_url" : hashHit ? "sha256" : "source_url",
      source: "database/asset_cache.json",
    });
  }
}

for (const record of assetRecords) {
  const source = typeof record.source === "object" && record.source !== null ? record.source as JsonRecord : {};
  let recordUrl = "";
  try {
    recordUrl = normalizeUrl(String(source.url ?? ""));
  } catch {
    recordUrl = "";
  }
  const hashHit = sha256 && source.sha256 === sha256;
  const urlHit = normalizedSourceUrl && recordUrl === normalizedSourceUrl;
  if (hashHit || urlHit) {
    hits.push({
      asset_id: String(record.asset_id ?? ""),
      local_path: String(record.local_path ?? source.local_path ?? ""),
      matched_by: hashHit && urlHit ? "sha256+source_url" : hashHit ? "sha256" : "source_url",
      source: "database/assets.json",
    });
  }
}

const uniqueHits = [...new Map(hits.map((hit) => [`${hit.asset_id}|${hit.local_path}`, hit])).values()];
const status = uniqueHits.length > 0 ? "HIT_REUSE_EXISTING_ASSET" : "MISS_MANUAL_INGEST_ALLOWED";

console.log(JSON.stringify({
  file: filePath,
  file_size_bytes: size,
  sha256,
  normalized_source_url: normalizedSourceUrl,
  status,
  hits: uniqueHits,
  writes_performed: false,
  network_accessed: false,
}, null, 2));
