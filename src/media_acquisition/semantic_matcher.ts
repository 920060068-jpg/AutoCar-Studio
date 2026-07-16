import type {
  AcquisitionContext,
  DownloadResult,
  SemanticMatch,
  ShotSearchTask,
  SourceCandidate,
  TechnicalInspection,
} from "./types.ts";

const SCENE_TERMS: Record<string, string[]> = {
  interior: ["内饰", "座舱", "中控", "方向盘", "地板", "滑轨", "cabin", "interior", "seat"],
  factory: ["工厂", "制造", "装配", "工程", "验证", "factory", "manufacturing", "assembly"],
  driving: ["行驶", "驾驶", "动态", "道路", "跟车", "driving", "road", "motion"],
  launch: ["发布", "亮相", "发布会", "launch", "event", "reveal"],
  exterior: ["外观", "车身", "前45", "侧面", "尾部", "灯组", "exterior", "hero"],
};

function taskScene(task: ShotSearchTask): keyof typeof SCENE_TERMS {
  const text = `${task.requiredScene} ${task.purpose}`.toLowerCase();
  for (const [scene, terms] of Object.entries(SCENE_TERMS)) {
    if (terms.some((term) => text.includes(term.toLowerCase()))) return scene as keyof typeof SCENE_TERMS;
  }
  return "exterior";
}

export function matchSemantic(
  context: AcquisitionContext,
  task: ShotSearchTask,
  source: SourceCandidate,
  inspection: TechnicalInspection,
  duplicateOf: string | null,
): SemanticMatch {
  const text = [
    source.sourceTitle ?? "",
    source.sourceUrl,
    source.downloadUrl ?? "",
    inspection.localPath,
  ].join(" ").toLowerCase();
  const brandTerms = [context.brandKey, context.brand, "xiaomi", "小米"].map((item) => item.toLowerCase());
  const vehicleTerms = context.vehicle.split(/[\/，,]/).map((item) => item.trim().toLowerCase()).filter((item) => item.length > 2);
  const brandMatch = brandTerms.some((term) => text.includes(term)) ? true : null;
  const vehicleMatch = vehicleTerms.some((term) => text.includes(term)) || /skynomad|澎程/.test(text) ? true : null;
  const scene = taskScene(task);
  const sceneMatch = SCENE_TERMS[scene].some((term) => text.includes(term.toLowerCase())) ? true : null;
  let score = 0;
  if (brandMatch) score += 25;
  if (vehicleMatch) score += 30;
  if (sceneMatch) score += 20;
  if (source.sourceTier === "A") score += 10;
  if (inspection.technicalStatus === "passed") score += 15;
  else if (inspection.technicalStatus === "blocked") score += 0;
  const rejectionReasons: string[] = [];
  if (duplicateOf) rejectionReasons.push(`SHA-256 重复：${duplicateOf}`);
  if (brandMatch === null) rejectionReasons.push("无法仅从来源元数据确认画面品牌");
  if (vehicleMatch === null) rejectionReasons.push("无法仅从来源元数据确认目标车型");
  if (sceneMatch === null) rejectionReasons.push("无法仅从来源元数据确认镜头场景");
  if (inspection.technicalStatus === "failed") rejectionReasons.push("技术检测失败");
  const rejected = duplicateOf !== null || inspection.technicalStatus === "failed";
  return {
    localPath: inspection.localPath,
    requestId: task.requestId,
    shotId: task.shotId,
    brandMatch,
    vehicleMatch,
    sceneMatch,
    narrationSupport: null,
    misleadingRisk: "unknown",
    genericBrandOnly: brandMatch && !vehicleMatch ? true : null,
    duplicateOf,
    score,
    status: rejected ? "rejected" : brandMatch && vehicleMatch && sceneMatch && inspection.technicalStatus === "passed" ? "passed" : "blocked",
    rejectionReasons,
  };
}

export function matchAllSemantics(
  context: AcquisitionContext,
  sources: SourceCandidate[],
  downloads: DownloadResult[],
  inspections: TechnicalInspection[],
): SemanticMatch[] {
  const seen = new Map<string, string>();
  const results: SemanticMatch[] = [];
  for (const inspection of inspections) {
    const download = downloads.find((item) => item.localPath === inspection.localPath);
    const source = download ? sources.find((candidate) => candidate.sourceId === download.sourceId) ?? null : null;
    if (!source) continue;
    const duplicateOf = seen.get(inspection.sha256) ?? null;
    if (!duplicateOf) seen.set(inspection.sha256, inspection.localPath);
    for (const requestId of source.requestIds) {
      const task = context.tasks.find((item) => item.requestId === requestId);
      if (task) results.push(matchSemantic(context, task, source, inspection, duplicateOf));
    }
  }
  return results;
}
