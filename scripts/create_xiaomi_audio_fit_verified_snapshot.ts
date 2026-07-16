import {createHash} from "node:crypto";
import {existsSync, mkdirSync, readFileSync, writeFileSync} from "node:fs";
import {dirname, relative, resolve} from "node:path";

const root = process.cwd();
const projectId = "xiaomi_skynomad_20260714_r1";
const databasePath = resolve(root, "database/verified_data.json");
const lockRecordPath = resolve(
  root,
  `output/${projectId}/audio_post/picture_lock_v1/picture_lock_record.json`,
);
const snapshotPath = resolve(
  root,
  `output/${projectId}/locked/verified_data_snapshot_audio_fit_r1.json`,
);
const diffPath = resolve(
  root,
  `output/${projectId}/locked/verified_data_diff_audio_fit_r1.md`,
);

const sha256 = (value: string | Uint8Array): string => (
  createHash("sha256").update(value).digest("hex")
);

for (const output of [snapshotPath, diffPath]) {
  if (existsSync(output)) throw new Error(`拒绝覆盖：${relative(root, output)}`);
  mkdirSync(dirname(output), {recursive: true});
}

const currentText = readFileSync(databasePath, "utf8");
const currentHash = sha256(currentText);
const lockRecord = JSON.parse(readFileSync(lockRecordPath, "utf8")) as {
  locked_inputs: Array<{role: string; path: string; sha256: string}>;
};
const lockedVerifiedData = lockRecord.locked_inputs.find(
  (item) => item.role === "verified_data" && item.path === "database/verified_data.json",
);
if (!lockedVerifiedData) throw new Error("Picture Lock 未登记 verified_data.json");

const reconstructedLockedText = currentText
  .replace('"automatic_review_required": true', '"human_review_required": true')
  .replace('"automatic_review_status": "pending"', '"human_review_status": "pending"');
const reconstructedLockedHash = sha256(reconstructedLockedText);
if (reconstructedLockedHash !== lockedVerifiedData.sha256) {
  throw new Error("当前数据库无法仅通过两处已知元数据反向变换复现 Picture Lock 哈希");
}

const lockedDatabase = JSON.parse(reconstructedLockedText) as {
  records: Array<Record<string, unknown>>;
};
const currentDatabase = JSON.parse(currentText) as {
  records: Array<Record<string, unknown>>;
};
const isProjectRecord = (record: Record<string, unknown>): boolean => (
  typeof record.data_id === "string"
  && record.data_id.startsWith("data_xiaomi_skynomad_")
);
const lockedProjectRecords = lockedDatabase.records.filter(isProjectRecord);
const currentProjectRecords = currentDatabase.records.filter(isProjectRecord);
if (JSON.stringify(lockedProjectRecords) !== JSON.stringify(currentProjectRecords)) {
  throw new Error("小米澎程核心 verified data 记录发生变化，禁止继续");
}
if (currentProjectRecords.length !== 8) {
  throw new Error(`小米澎程记录数量必须为 8，实际 ${currentProjectRecords.length}`);
}

const createdAt = new Date().toISOString();
const snapshot = {
  schema_version: 1,
  project_id: projectId,
  snapshot_id: "verified_data_snapshot_audio_fit_r1",
  created_at: createdAt,
  source_database_path: "database/verified_data.json",
  source_database_locked_sha256: lockedVerifiedData.sha256,
  source_database_current_sha256: currentHash,
  reconstructed_locked_sha256: reconstructedLockedHash,
  reconstructed_locked_hash_matches_picture_lock: true,
  drift_classification: "global_review_metadata_only",
  core_verified_data_changed: false,
  exact_global_diff: [
    {
      json_path: "record_policy.human_review_required",
      before: true,
      after_path: "record_policy.automatic_review_required",
      after: true,
    },
    {
      json_path: "verification_run.human_review_status",
      before: "pending",
      after_path: "verification_run.automatic_review_status",
      after: "pending",
    },
  ],
  record_filter: "data_id starts with data_xiaomi_skynomad_",
  record_count: currentProjectRecords.length,
  records_sha256: sha256(`${JSON.stringify(currentProjectRecords, null, 2)}\n`),
  records: currentProjectRecords,
};
writeFileSync(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`, {
  encoding: "utf8",
  flag: "wx",
  mode: 0o644,
});
const snapshotHash = sha256(readFileSync(snapshotPath));

const diffReport = `# verified_data 哈希漂移精确报告\n\n`
  + `- 项目：\`${projectId}\`\n`
  + `- Picture Lock 哈希：\`${lockedVerifiedData.sha256}\`\n`
  + `- 当前全局数据库哈希：\`${currentHash}\`\n`
  + `- 反向复原哈希：\`${reconstructedLockedHash}\`（精确匹配 Picture Lock）\n`
  + `- 分类：全局审核元数据字段改名，不是格式变化，不是记录排序，也不是小米核心数据变化\n`
  + `- 小米记录：8 条，逐字段一致\n\n`
  + `## 精确 diff\n\n`
  + "```diff\n"
  + "@@ record_policy @@\n"
  + '-  "human_review_required": true\n'
  + '+  "automatic_review_required": true\n'
  + "@@ verification_run @@\n"
  + '-  "human_review_status": "pending"\n'
  + '+  "automatic_review_status": "pending"\n'
  + "```\n\n"
  + `## 项目快照\n\n`
  + `- 路径：\`${relative(root, snapshotPath)}\`\n`
  + `- SHA-256：\`${snapshotHash}\`\n`
  + `- 核心事实变化：否\n`
  + `- 全局数据库修改：无\n`;
writeFileSync(diffPath, diffReport, {
  encoding: "utf8",
  flag: "wx",
  mode: 0o644,
});

console.log(JSON.stringify({
  status: "passed",
  drift_classification: snapshot.drift_classification,
  core_verified_data_changed: false,
  record_count: currentProjectRecords.length,
  snapshot_path: relative(root, snapshotPath),
  snapshot_sha256: snapshotHash,
  diff_report_path: relative(root, diffPath),
}, null, 2));
