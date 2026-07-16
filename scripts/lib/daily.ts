import { createHash, randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { asRecord } from "./yaml.ts";
import {
  booleanValue,
  loadYamlRecord,
  numberValue,
  projectPath,
  stringValue,
} from "./common.ts";

export const DAILY_STAGES = [
  "daily_startup_check",
  "hotspot_discovery",
  "historical_deduplication",
  "fact_check",
  "topic_scoring",
  "script",
  "storyboard",
  "narration_timing_budget",
  "audio_fit_script",
  "number_semantic_classification",
  "pronunciation_resolution",
  "tts_text_generation",
  "voice_speed_calibration",
  "static_audio_duration_estimate",
  "audio_preflight",
  "director_review",
  "asset_acquisition",
  "editorial_fallback",
  "picture_render",
  "picture_review",
  "picture_lock",
  "minimax_live_probe",
  "minimax_tts",
  "measured_audio_fit",
  "narration",
  "bgm_sfx",
  "audio_mix",
  "final_render",
  "technical_qc",
  "content_qc",
  "director_post_render_review",
  "release_candidate",
] as const;

export type DailyStage = (typeof DAILY_STAGES)[number];
export type FinalStatus =
  | "not_started"
  | "running"
  | "blocked"
  | "audio_blocked"
  | "interrupted"
  | "failed"
  | "completed"
  | "release_candidate";

export type DailyProductionRecord = {
  production_date: string;
  timezone: string;
  scheduled_start_at: string;
  actual_start_at: string | null;
  current_stage: DailyStage | null;
  last_successful_stage: DailyStage | null;
  checkpoint_path: string | null;
  checkpoint_sha256: string | null;
  retry_count: number;
  blocked_reason: string | null;
  service_status: Record<string, string>;
  final_status: FinalStatus;
  output_path: string | null;
  completed_at: string | null;
  job_id: string;
  revision: number;
  updated_at: string;
};

export type DailyStateFile = {
  schema_version: 1;
  productions: DailyProductionRecord[];
};

export type DailyRuntimeConfig = {
  startTimeLocal: string;
  timezoneMode: string;
  maxDailyProductions: number;
  catchUpAfterMissedStart: boolean;
  resumeFromCheckpoint: boolean;
  allowParallelDailyRuns: boolean;
  backfillPreviousDates: boolean;
  statePath: string;
  checkpointDirectory: string;
  logDirectory: string;
  lockPath: string;
};

export type DailyAction =
  | "wait"
  | "start"
  | "resume"
  | "already_complete"
  | "locked"
  | "blocked_invalid_checkpoint"
  | "blocked_state_conflict"
  | "failed";

export type DailyEvaluation = {
  action: DailyAction;
  productionDate: string;
  timezone: string;
  now: string;
  scheduledStartAt: string;
  statePath: string;
  lockPath: string;
  record: DailyProductionRecord | null;
  reason: string;
};

export type DailyCliOptions = {
  now: Date;
  statePath?: string;
  lockPath?: string;
  json: boolean;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value) throw new Error(`${label} must be a non-empty string`);
  return value;
}

function nullableString(value: unknown, label: string): string | null {
  if (value === null) return null;
  if (typeof value !== "string") throw new Error(`${label} must be a string or null`);
  return value;
}

function isDailyStage(value: unknown): value is DailyStage {
  return typeof value === "string" && (DAILY_STAGES as readonly string[]).includes(value);
}

function nullableStage(value: unknown, label: string): DailyStage | null {
  if (value === null) return null;
  if (!isDailyStage(value)) throw new Error(`${label} has invalid stage: ${String(value)}`);
  return value;
}

function isFinalStatus(value: unknown): value is FinalStatus {
  return [
    "not_started",
    "running",
    "blocked",
    "audio_blocked",
    "interrupted",
    "failed",
    "completed",
    "release_candidate",
  ].includes(String(value));
}

function parseRecord(value: unknown, index: number): DailyProductionRecord {
  if (!isObject(value)) throw new Error(`productions[${index}] must be an object`);
  const finalStatus = value.final_status;
  if (!isFinalStatus(finalStatus)) throw new Error(`productions[${index}].final_status is invalid`);
  const serviceStatus = value.service_status;
  if (!isObject(serviceStatus)) throw new Error(`productions[${index}].service_status must be an object`);
  const normalizedServices: Record<string, string> = {};
  for (const [key, status] of Object.entries(serviceStatus)) {
    normalizedServices[key] = requireString(status, `service_status.${key}`);
  }
  if (typeof value.retry_count !== "number" || value.retry_count < 0) {
    throw new Error(`productions[${index}].retry_count must be a non-negative number`);
  }
  if (typeof value.revision !== "number" || value.revision < 1) {
    throw new Error(`productions[${index}].revision must be >= 1`);
  }
  return {
    production_date: requireString(value.production_date, `productions[${index}].production_date`),
    timezone: requireString(value.timezone, `productions[${index}].timezone`),
    scheduled_start_at: requireString(value.scheduled_start_at, `productions[${index}].scheduled_start_at`),
    actual_start_at: nullableString(value.actual_start_at, `productions[${index}].actual_start_at`),
    current_stage: nullableStage(value.current_stage, `productions[${index}].current_stage`),
    last_successful_stage: nullableStage(value.last_successful_stage, `productions[${index}].last_successful_stage`),
    checkpoint_path: nullableString(value.checkpoint_path, `productions[${index}].checkpoint_path`),
    checkpoint_sha256: nullableString(value.checkpoint_sha256, `productions[${index}].checkpoint_sha256`),
    retry_count: value.retry_count,
    blocked_reason: nullableString(value.blocked_reason, `productions[${index}].blocked_reason`),
    service_status: normalizedServices,
    final_status: finalStatus,
    output_path: nullableString(value.output_path, `productions[${index}].output_path`),
    completed_at: nullableString(value.completed_at, `productions[${index}].completed_at`),
    job_id: requireString(value.job_id, `productions[${index}].job_id`),
    revision: value.revision,
    updated_at: requireString(value.updated_at, `productions[${index}].updated_at`),
  };
}

export function loadDailyRuntimeConfig(configPath = "CONFIG.yaml"): DailyRuntimeConfig {
  const config = loadYamlRecord(configPath);
  const automation = asRecord(config.automation, "automation");
  const production = asRecord(config.production, "production");
  const result: DailyRuntimeConfig = {
    startTimeLocal: stringValue(automation.start_time_local),
    timezoneMode: stringValue(production.timezone_mode),
    maxDailyProductions: numberValue(automation.max_daily_productions),
    catchUpAfterMissedStart: booleanValue(automation.catch_up_after_missed_start) === true,
    resumeFromCheckpoint: booleanValue(automation.resume_from_checkpoint) === true,
    allowParallelDailyRuns: booleanValue(automation.allow_parallel_daily_runs) === true,
    backfillPreviousDates: booleanValue(automation.backfill_previous_dates) === true,
    statePath: stringValue(automation.state_path),
    checkpointDirectory: stringValue(automation.checkpoint_directory),
    logDirectory: stringValue(automation.log_directory),
    lockPath: stringValue(automation.lock_path),
  };
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(result.startTimeLocal)) {
    throw new Error("automation.start_time_local must use HH:MM");
  }
  if (result.timezoneMode !== "local_system_timezone") {
    throw new Error("production.timezone_mode must be local_system_timezone");
  }
  if (result.maxDailyProductions !== 1) throw new Error("automation.max_daily_productions must be 1");
  for (const [label, value] of Object.entries({
    state_path: result.statePath,
    checkpoint_directory: result.checkpointDirectory,
    log_directory: result.logDirectory,
    lock_path: result.lockPath,
  })) {
    if (!value) throw new Error(`automation.${label} is required`);
  }
  return result;
}

export function readDailyState(inputPath: string): DailyStateFile {
  const absolutePath = projectPath(inputPath);
  if (!existsSync(absolutePath)) throw new Error(`Daily state not found: ${inputPath}`);
  const parsed: unknown = JSON.parse(readFileSync(absolutePath, "utf8"));
  if (!isObject(parsed) || parsed.schema_version !== 1 || !Array.isArray(parsed.productions)) {
    throw new Error(`${inputPath} must contain schema_version 1 and productions[]`);
  }
  return { schema_version: 1, productions: parsed.productions.map(parseRecord) };
}

export function writeDailyState(inputPath: string, state: DailyStateFile): void {
  const absolutePath = projectPath(inputPath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, `${JSON.stringify(state, null, 2)}\n`, { encoding: "utf8" });
}

function localParts(now: Date): { date: string; minutes: number; timezone: string } {
  const pad = (value: number): string => String(value).padStart(2, "0");
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "local_system_timezone";
  return { date, minutes: now.getHours() * 60 + now.getMinutes(), timezone };
}

function scheduledIso(now: Date, startTime: string): string {
  const [hours, minutes] = startTime.split(":").map(Number);
  const scheduled = new Date(now);
  scheduled.setHours(hours, minutes, 0, 0);
  return scheduled.toISOString();
}

function sha256Absolute(inputPath: string): string {
  return createHash("sha256").update(readFileSync(inputPath)).digest("hex");
}

export function inspectCheckpoint(record: DailyProductionRecord): { valid: boolean; reason: string } {
  if (!record.checkpoint_path) return { valid: false, reason: "checkpoint_path is missing" };
  const absolutePath = projectPath(record.checkpoint_path);
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    return { valid: false, reason: `checkpoint not found: ${record.checkpoint_path}` };
  }
  try {
    const parsed: unknown = JSON.parse(readFileSync(absolutePath, "utf8"));
    if (!isObject(parsed)) return { valid: false, reason: "checkpoint root must be an object" };
    if (parsed.production_date !== record.production_date) {
      return { valid: false, reason: "checkpoint production_date mismatch" };
    }
    if (parsed.job_id !== record.job_id) return { valid: false, reason: "checkpoint job_id mismatch" };
    if (!isDailyStage(parsed.last_successful_stage)) {
      return { valid: false, reason: "checkpoint last_successful_stage is invalid" };
    }
    if (record.checkpoint_sha256 && sha256Absolute(absolutePath) !== record.checkpoint_sha256) {
      return { valid: false, reason: "checkpoint sha256 mismatch" };
    }
    return { valid: true, reason: "checkpoint is valid" };
  } catch (error) {
    return { valid: false, reason: error instanceof Error ? error.message : String(error) };
  }
}

export function parseDailyCliOptions(args: string[]): DailyCliOptions {
  let now = new Date();
  let statePath: string | undefined;
  let lockPath: string | undefined;
  let json = false;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--json") {
      json = true;
      continue;
    }
    if (["--now", "--state", "--lock"].includes(arg)) {
      const value = args[index + 1];
      if (!value) throw new Error(`${arg} requires a value`);
      index += 1;
      if (arg === "--now") {
        now = new Date(value);
        if (Number.isNaN(now.getTime())) throw new Error(`Invalid --now value: ${value}`);
      } else if (arg === "--state") statePath = value;
      else lockPath = value;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return { now, statePath, lockPath, json };
}

export function evaluateDailyAction(
  options: DailyCliOptions,
  runtime = loadDailyRuntimeConfig(),
  ignoreLock = false,
): DailyEvaluation {
  const parts = localParts(options.now);
  const statePath = options.statePath ?? runtime.statePath;
  const lockPath = options.lockPath ?? runtime.lockPath;
  const state = readDailyState(statePath);
  const todaysRecords = state.productions.filter((record) => record.production_date === parts.date);
  const base = {
    productionDate: parts.date,
    timezone: parts.timezone,
    now: options.now.toISOString(),
    scheduledStartAt: scheduledIso(options.now, runtime.startTimeLocal),
    statePath,
    lockPath,
  };
  if (todaysRecords.length > runtime.maxDailyProductions) {
    return { ...base, action: "blocked_state_conflict", record: null, reason: "more than one production exists for today" };
  }
  const record = todaysRecords[0] ?? null;
  if (record && ["completed", "release_candidate"].includes(record.final_status)) {
    return { ...base, action: "already_complete", record, reason: "today already has a completed production" };
  }
  if (!ignoreLock && existsSync(projectPath(lockPath))) {
    return { ...base, action: "locked", record, reason: `active lock exists: ${lockPath}` };
  }
  if (record) {
    if (["running", "blocked", "audio_blocked", "interrupted"].includes(record.final_status)) {
      if (!runtime.resumeFromCheckpoint) {
        return { ...base, action: "failed", record, reason: "resume_from_checkpoint is disabled" };
      }
      const checkpoint = inspectCheckpoint(record);
      if (!checkpoint.valid) {
        return { ...base, action: "blocked_invalid_checkpoint", record, reason: checkpoint.reason };
      }
      return { ...base, action: "resume", record, reason: checkpoint.reason };
    }
    if (record.final_status === "failed") {
      return { ...base, action: "failed", record, reason: record.blocked_reason ?? "today production failed" };
    }
  }
  const [hours, minutes] = runtime.startTimeLocal.split(":").map(Number);
  const startMinutes = hours * 60 + minutes;
  if (parts.minutes < startMinutes) {
    return { ...base, action: "wait", record, reason: `local time is before ${runtime.startTimeLocal}` };
  }
  if (!runtime.catchUpAfterMissedStart) {
    return { ...base, action: "failed", record, reason: "catch-up after missed start is disabled" };
  }
  return { ...base, action: "start", record, reason: "today is incomplete and scheduled start has passed" };
}

export function printEvaluation(evaluation: DailyEvaluation, jsonOnly = false): void {
  if (!jsonOnly) console.log(`DAILY_ACTION ${evaluation.action}: ${evaluation.reason}`);
  console.log(JSON.stringify(evaluation, null, 2));
}

function recordControllerFailure(
  runtime: DailyRuntimeConfig,
  evaluation: DailyEvaluation,
  timestamp: string,
): void {
  const failureId = randomUUID();
  const relativePath = `${runtime.logDirectory}/${evaluation.productionDate}/failure_${timestamp.replace(/[:.]/g, "-")}_${failureId}.json`;
  const absolutePath = projectPath(relativePath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, `${JSON.stringify({
    schema_version: 1,
    failure_id: failureId,
    production_date: evaluation.productionDate,
    job_id: evaluation.record?.job_id ?? null,
    stage: evaluation.record?.current_stage ?? "daily_startup_check",
    action: evaluation.action,
    reason: evaluation.reason,
    checkpoint_path: evaluation.record?.checkpoint_path ?? null,
    retry_count: evaluation.record?.retry_count ?? 0,
    created_at: timestamp,
  }, null, 2)}\n`, { encoding: "utf8", flag: "wx" });

  if (evaluation.record) {
    const state = readDailyState(evaluation.statePath);
    const index = state.productions.findIndex((record) => record.job_id === evaluation.record?.job_id);
    if (index >= 0) {
      state.productions[index] = {
        ...state.productions[index],
        blocked_reason: evaluation.reason,
        final_status: evaluation.action === "failed" ? "failed" : "blocked",
        retry_count: state.productions[index].retry_count + 1,
        updated_at: timestamp,
      };
      writeDailyState(evaluation.statePath, state);
    }
  }
}

function checkpointRelativePath(runtime: DailyRuntimeConfig, date: string, jobId: string): string {
  return `${runtime.checkpointDirectory}/${date}/${jobId}_r1_daily_startup_check.json`;
}

function createStartupCheckpoint(
  runtime: DailyRuntimeConfig,
  productionDate: string,
  jobId: string,
  timestamp: string,
): { path: string; sha256: string } {
  const relativePath = checkpointRelativePath(runtime, productionDate, jobId);
  const absolutePath = projectPath(relativePath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  const checkpoint = {
    schema_version: 1,
    production_date: productionDate,
    job_id: jobId,
    revision: 1,
    stage_run_id: randomUUID(),
    current_stage: "hotspot_discovery",
    last_successful_stage: "daily_startup_check",
    created_at: timestamp,
    updated_at: timestamp,
    input_paths: ["AGENTS.md", "PROJECT_MEMORY.md", "CONFIG.yaml", "DAILY_PRODUCTION.md"],
    output_paths: [],
    paid_api_receipts: [],
  };
  writeFileSync(absolutePath, `${JSON.stringify(checkpoint, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  return { path: relativePath, sha256: sha256Absolute(absolutePath) };
}

function acquireLock(lockPath: string, productionDate: string, runId: string, timestamp: string): void {
  const absolutePath = projectPath(lockPath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  mkdirSync(absolutePath);
  writeFileSync(resolve(absolutePath, "owner.json"), `${JSON.stringify({
    schema_version: 1,
    production_date: productionDate,
    run_id: runId,
    acquired_at: timestamp,
    controller_pid: process.pid,
  }, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
}

function archiveLock(runtime: DailyRuntimeConfig, lockPath: string, runId: string, timestamp: string): void {
  const source = projectPath(lockPath);
  if (!existsSync(source)) return;
  const safeTime = timestamp.replace(/[:.]/g, "-");
  const destination = projectPath(`${runtime.logDirectory}/locks/${safeTime}_${runId}_released.lock`);
  mkdirSync(dirname(destination), { recursive: true });
  renameSync(source, destination);
}

export function runDailyController(options: DailyCliOptions): DailyEvaluation {
  const runtime = loadDailyRuntimeConfig();
  const initial = evaluateDailyAction(options, runtime);
  if (!["start", "resume"].includes(initial.action)) {
    if (["blocked_invalid_checkpoint", "blocked_state_conflict", "failed"].includes(initial.action)) {
      recordControllerFailure(runtime, initial, options.now.toISOString());
    }
    printEvaluation(initial, options.json);
    return initial;
  }

  const runId = randomUUID();
  const timestamp = options.now.toISOString();
  acquireLock(initial.lockPath, initial.productionDate, runId, timestamp);
  try {
    const evaluation = evaluateDailyAction(options, runtime, true);
    const state = readDailyState(evaluation.statePath);
    if (evaluation.action === "start") {
      const jobId = `daily_${evaluation.productionDate}_${randomUUID().slice(0, 8)}`;
      const checkpoint = createStartupCheckpoint(runtime, evaluation.productionDate, jobId, timestamp);
      const newRecord: DailyProductionRecord = {
        production_date: evaluation.productionDate,
        timezone: evaluation.timezone,
        scheduled_start_at: evaluation.scheduledStartAt,
        actual_start_at: timestamp,
        current_stage: "hotspot_discovery",
        last_successful_stage: "daily_startup_check",
        checkpoint_path: checkpoint.path,
        checkpoint_sha256: checkpoint.sha256,
        retry_count: 0,
        blocked_reason: null,
        service_status: { minimax: "blocked" },
        final_status: "running",
        output_path: null,
        completed_at: null,
        job_id: jobId,
        revision: 1,
        updated_at: timestamp,
      };
      if (evaluation.record?.final_status === "not_started") {
        const existingIndex = state.productions.findIndex((record) => record.job_id === evaluation.record?.job_id);
        if (existingIndex < 0) throw new Error("not_started record disappeared during lock acquisition");
        state.productions[existingIndex] = newRecord;
      } else {
        state.productions.push(newRecord);
      }
    } else if (evaluation.action === "resume" && evaluation.record) {
      const index = state.productions.findIndex((record) => record.job_id === evaluation.record?.job_id);
      if (index < 0) throw new Error("resume record disappeared during lock acquisition");
      state.productions[index] = {
        ...state.productions[index],
        actual_start_at: state.productions[index].actual_start_at ?? timestamp,
        blocked_reason: null,
        final_status: "running",
        updated_at: timestamp,
      };
    } else {
      throw new Error(`daily action changed unexpectedly to ${evaluation.action}`);
    }
    writeDailyState(evaluation.statePath, state);
    const dispatched = evaluateDailyAction(options, runtime, true);
    const result: DailyEvaluation = {
      ...dispatched,
      action: initial.action,
      reason: `controller dispatched run_id=${runId}; continue from ${dispatched.record?.current_stage ?? "unknown"}`,
    };
    printEvaluation(result, options.json);
    return result;
  } finally {
    archiveLock(runtime, initial.lockPath, runId, timestamp);
  }
}
