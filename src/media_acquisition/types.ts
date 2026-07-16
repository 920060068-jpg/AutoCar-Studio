import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { asArray, asRecord, parseYaml, type YamlValue } from "../../scripts/lib/yaml.ts";

export type LicenseStatus =
  | "owned_by_user"
  | "licensed_commercial"
  | "official_press_asset"
  | "editorial_use"
  | "unverified"
  | "prohibited";

export type CandidateStatus =
  | "candidate"
  | "blocked"
  | "quarantined"
  | "rejected";

export type MediaType = "image" | "video" | "logo" | "data" | "unknown";

export type SourceType =
  | "brand_official_site"
  | "official_newsroom"
  | "official_media_library"
  | "official_launch"
  | "official_investor_relations"
  | "government_regulator"
  | "stock_exchange_filing"
  | "licensed_pr_platform"
  | "licensed_automotive_media"
  | "user_licensed_stock_platform"
  | "official_social_source_only"
  | "unknown";

export type DiscoveryStatus =
  | "actual_page_verified"
  | "direct_file_verified"
  | "no_legal_download_entry"
  | "blocked_access"
  | "robots_disallowed"
  | "login_or_captcha"
  | "unsupported_source"
  | "fetch_error";

export interface ShotSearchTask {
  requestId: string;
  shotId: string;
  durationSeconds: number;
  brand: string;
  vehicle: string;
  requiredScene: string;
  requiredMediaType: MediaType;
  keywords: string[];
  purpose: string;
  requiredContent: string;
  verifiedDataReferences: string[];
  allowedSourceTiers: string[];
  candidateUrls: string[];
}

export interface SourceCandidate {
  sourceId: string;
  requestIds: string[];
  shotIds: string[];
  sourceUrl: string;
  sourceTitle: string | null;
  publisher: string | null;
  publishedAt: string | null;
  accessedAt: string;
  sourceDomain: string;
  sourceType: SourceType;
  sourceTier: "A" | "B" | null;
  downloadUrl: string | null;
  mediaRelationship: string;
  usageTermsUrl: string | null;
  discoveryStatus: DiscoveryStatus;
  httpStatus: number | null;
  explicitDownloadEntry: boolean;
  inferredMediaType: MediaType;
  evidence: string[];
  errors: string[];
}

export interface RightsDecision {
  sourceId: string;
  licenseStatus: LicenseStatus;
  permittedUse: string[];
  restrictions: string[];
  evidence: string[];
  automaticApprovalBlocked: boolean;
  decisionReason: string;
}

export interface DownloadResult {
  sourceId: string;
  requestIds: string[];
  shotIds: string[];
  downloadUrl: string | null;
  status: "downloaded" | "reused_duplicate" | "blocked" | "skipped" | "failed";
  localPath: string | null;
  fileName: string | null;
  mediaType: MediaType;
  bytes: number | null;
  sha256: string | null;
  httpStatus: number | null;
  reason: string;
  accessedAt: string;
}

export interface TechnicalInspection {
  localPath: string;
  mediaType: MediaType;
  width: number | null;
  height: number | null;
  resolution: string | null;
  format: string | null;
  fps: number | null;
  duration: number | null;
  codec: string | null;
  audioCodec: string | null;
  fileSize: number;
  sha256: string;
  watermarkStatus: "none_verified" | "detected" | "blocked";
  decodeStatus: "passed" | "failed" | "not_applicable";
  crop916Viability: "good" | "conditional" | "poor" | "blocked";
  subjectProtection: "passed" | "failed" | "blocked";
  fullScreenUsable: boolean | null;
  qualityGrade: "A" | "B" | "C" | "reject" | null;
  technicalStatus: "passed" | "blocked" | "failed";
  reasons: string[];
}

export interface SemanticMatch {
  localPath: string;
  requestId: string;
  shotId: string;
  brandMatch: boolean | null;
  vehicleMatch: boolean | null;
  sceneMatch: boolean | null;
  narrationSupport: boolean | null;
  misleadingRisk: "low" | "medium" | "high" | "unknown";
  genericBrandOnly: boolean | null;
  duplicateOf: string | null;
  score: number;
  status: "passed" | "blocked" | "rejected";
  rejectionReasons: string[];
}

export interface CandidateAssetRecord {
  assetId: string;
  brand: string;
  vehicle: string;
  shotIds: string[];
  localPath: string;
  sourceId: string;
  sourceUrl: string;
  sourceTitle: string | null;
  publisher: string | null;
  sourceType: SourceType;
  publishedAt: string | null;
  accessedAt: string;
  usageTermsUrl: string | null;
  licenseStatus: LicenseStatus;
  permittedUse: string[];
  restrictions: string[];
  sha256: string;
  mediaType: MediaType;
  resolution: string | null;
  fps: number | null;
  duration: number | null;
  codec: string | null;
  watermarkStatus: string;
  qualityGrade: string | null;
  semanticScore: number;
  usedCount: number;
  lastUsed: string | null;
  status: CandidateStatus;
}

export interface MediaSourcePolicy {
  requestTimeoutMs: number;
  maxPagesPerRun: number;
  maxDownloadBytes: number;
  maxRedirects: number;
  downloadUnverifiedCandidates: boolean;
  allowedProtocols: string[];
  signedQueryKeys: string[];
  forbiddenMediaExtensions: string[];
  loginMarkers: string[];
  prohibitedSourcePatterns: string[];
}

export interface BrandSourceConfig {
  canonicalName: string;
  aliases: string[];
  allowedDomains: string[];
  sourceOnlyDomains: string[];
  seedUrls: string[];
  usageTermsUrls: Record<string, string>;
}

export interface MediaSourcesConfig {
  schemaVersion: number;
  policy: MediaSourcePolicy;
  sourceTiers: Record<string, string[]>;
  brands: Record<string, BrandSourceConfig>;
}

export interface AcquisitionContext {
  root: string;
  assetRequestPath: string;
  outputDir: string;
  jobId: string;
  brandKey: string;
  brand: string;
  vehicle: string;
  storyboardPath: string | null;
  scriptPath: string | null;
  factCheckPath: string | null;
  verifiedDataPath: string | null;
  approvalRecordPath: string | null;
  requestRevision: number | string | null;
  storyboardRevision: number | string | null;
  acquisitionAllowed: boolean;
  approved: boolean;
  tasks: ShotSearchTask[];
}

export const ROOT = resolve(process.cwd());

export function absolutePath(path: string): string {
  return resolve(ROOT, path);
}

export function relativePath(path: string): string {
  return relative(ROOT, path) || ".";
}

export function ensureParent(path: string): void {
  mkdirSync(dirname(path), { recursive: true });
}

export function writeTextExclusive(path: string, contents: string): void {
  ensureParent(path);
  writeFileSync(path, contents, { encoding: "utf8", flag: "wx" });
}

export function writeBufferExclusive(path: string, contents: Uint8Array): void {
  ensureParent(path);
  writeFileSync(path, contents, { flag: "wx" });
}

export function loadYamlRecord(path: string): Record<string, YamlValue> {
  return asRecord(parseYaml(readFileSync(absolutePath(path), "utf8")), path);
}

function recordString(record: Record<string, YamlValue>, key: string, fallback = ""): string {
  const value = record[key];
  return typeof value === "string" ? value : fallback;
}

function recordNumber(record: Record<string, YamlValue>, key: string, fallback: number): number {
  const value = record[key];
  return typeof value === "number" ? value : fallback;
}

function recordBoolean(record: Record<string, YamlValue>, key: string, fallback: boolean): boolean {
  const value = record[key];
  return typeof value === "boolean" ? value : fallback;
}

function stringList(value: YamlValue | undefined): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function loadMediaSourcesConfig(path = "config/media_sources.yaml"): MediaSourcesConfig {
  const root = loadYamlRecord(path);
  const policy = asRecord(root.policy, `${path}.policy`);
  const tiers = asRecord(root.source_tiers, `${path}.source_tiers`);
  const brandsRecord = asRecord(root.brands, `${path}.brands`);
  const brands: Record<string, BrandSourceConfig> = {};
  for (const [key, raw] of Object.entries(brandsRecord)) {
    const value = asRecord(raw, `brands.${key}`);
    const termsRaw = asRecord(value.usage_terms_urls ?? {}, `brands.${key}.usage_terms_urls`);
    const usageTermsUrls: Record<string, string> = {};
    for (const [domain, url] of Object.entries(termsRaw)) {
      if (typeof url === "string") usageTermsUrls[domain] = url;
    }
    brands[key] = {
      canonicalName: recordString(value, "canonical_name", key),
      aliases: stringList(value.aliases),
      allowedDomains: stringList(value.allowed_domains),
      sourceOnlyDomains: stringList(value.source_only_domains),
      seedUrls: stringList(value.seed_urls),
      usageTermsUrls,
    };
  }
  const sourceTiers: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(tiers)) sourceTiers[key] = stringList(value);
  return {
    schemaVersion: recordNumber(root, "schema_version", 1),
    policy: {
      requestTimeoutMs: recordNumber(policy, "request_timeout_ms", 15_000),
      maxPagesPerRun: recordNumber(policy, "max_pages_per_run", 40),
      maxDownloadBytes: recordNumber(policy, "max_download_bytes", 268_435_456),
      maxRedirects: recordNumber(policy, "max_redirects", 5),
      downloadUnverifiedCandidates: recordBoolean(policy, "download_unverified_candidates", true),
      allowedProtocols: stringList(policy.allowed_protocols),
      signedQueryKeys: stringList(policy.signed_query_keys).map((value) => value.toLowerCase()),
      forbiddenMediaExtensions: stringList(policy.forbidden_media_extensions).map((value) => value.toLowerCase()),
      loginMarkers: stringList(policy.login_markers).map((value) => value.toLowerCase()),
      prohibitedSourcePatterns: stringList(policy.prohibited_source_patterns).map((value) => value.toLowerCase()),
    },
    sourceTiers,
    brands,
  };
}

export function stableId(prefix: string, value: string): string {
  return `${prefix}_${createHash("sha256").update(value).digest("hex").slice(0, 16)}`;
}

function quoteYaml(value: string): string {
  if (value === "" || /[:#\n\r\t]|^[-?]|^(?:null|true|false|~|\d+(?:\.\d+)?)$/i.test(value) || /^\s|\s$/.test(value)) {
    return JSON.stringify(value);
  }
  return value;
}

export function toYaml(value: unknown, indent = 0): string {
  const pad = " ".repeat(indent);
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return quoteYaml(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return value.map((item) => {
      if (item !== null && typeof item === "object") return `${pad}-\n${toYaml(item, indent + 2)}`;
      return `${pad}- ${toYaml(item, 0)}`;
    }).join("\n");
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return "{}";
    return entries.map(([key, item]) => {
      const safeKey = quoteYaml(key);
      if (item !== null && typeof item === "object" && ((Array.isArray(item) && item.length > 0) || (!Array.isArray(item) && Object.keys(item as object).length > 0))) {
        return `${pad}${safeKey}:\n${toYaml(item, indent + 2)}`;
      }
      return `${pad}${safeKey}: ${toYaml(item, 0)}`;
    }).join("\n");
  }
  throw new Error(`Unsupported YAML value: ${String(value)}`);
}

export function writeYamlExclusive(path: string, value: unknown): void {
  writeTextExclusive(path, `${toYaml(value)}\n`);
}

export function yamlArray(value: YamlValue | undefined, label: string): YamlValue[] {
  return value === undefined || value === null ? [] : asArray(value, label);
}

export function yamlRecord(value: YamlValue | undefined, label: string): Record<string, YamlValue> {
  return value === undefined || value === null ? {} : asRecord(value, label);
}
