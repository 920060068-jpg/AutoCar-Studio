import type { RightsDecision, SourceCandidate } from "./types.ts";

function hasExplicitUseEvidence(source: SourceCandidate): boolean {
  return source.evidence.some((item) => /(editorial use|press use|media use|新闻报道|编辑用途|媒体使用)/i.test(item));
}

function hasExplicitProhibition(source: SourceCandidate): boolean {
  return source.discoveryStatus === "robots_disallowed"
    || source.discoveryStatus === "blocked_access"
    || source.discoveryStatus === "login_or_captcha"
    || source.errors.some((item) => /(禁止复制|不得复制|prohibit.*copy|no reproduction|DRM|签名 URL)/i.test(item));
}

export function classifyRights(source: SourceCandidate): RightsDecision {
  if (hasExplicitProhibition(source)) {
    return {
      sourceId: source.sourceId,
      licenseStatus: "prohibited",
      permittedUse: [],
      restrictions: ["禁止下载或访问限制不得绕过", ...source.errors],
      evidence: [...source.evidence, ...source.errors],
      automaticApprovalBlocked: true,
      decisionReason: "来源存在明确访问限制、robots 禁止或复制限制。",
    };
  }
  if (source.sourceType === "official_social_source_only") {
    return {
      sourceId: source.sourceId,
      licenseStatus: "unverified",
      permittedUse: ["仅登记为官方来源线索"],
      restrictions: ["社交平台展示不等于媒体下载或再发布授权", "不得抓取播放器流"],
      evidence: source.evidence,
      automaticApprovalBlocked: true,
      decisionReason: "官方社交账号可作为来源证据，但缺少明确媒体下载与使用许可。",
    };
  }
  if (source.explicitDownloadEntry && source.sourceType === "official_media_library" && hasExplicitUseEvidence(source)) {
    return {
      sourceId: source.sourceId,
      licenseStatus: "official_press_asset",
      permittedUse: ["按官方媒体资料页列明的新闻或编辑用途"],
      restrictions: ["不得改变事实含义", "不得暗示品牌背书", "只允许声明范围内的编辑用途"],
      evidence: source.evidence,
      automaticApprovalBlocked: false,
      decisionReason: "官方媒体资料页提供明确下载入口和用途证据。",
    };
  }
  if (source.explicitDownloadEntry && source.sourceType === "licensed_pr_platform" && hasExplicitUseEvidence(source)) {
    return {
      sourceId: source.sourceId,
      licenseStatus: "editorial_use",
      permittedUse: ["按 PR 平台明确列明的编辑用途"],
      restrictions: ["仅限编辑评论", "不得用于独立商业广告", "只允许声明范围内的编辑用途"],
      evidence: source.evidence,
      automaticApprovalBlocked: false,
      decisionReason: "PR 平台提供下载入口和明确编辑用途说明。",
    };
  }
  return {
    sourceId: source.sourceId,
    licenseStatus: "unverified",
    permittedUse: [],
    restrictions: [
      "官网公开展示不等于允许下载或再发布",
      "未发现足够用途说明，Daily Auto Mode 必须阻断",
    ],
    evidence: source.evidence,
    automaticApprovalBlocked: true,
    decisionReason: "没有足够证据支持 owned、licensed、press 或 editorial 权利状态。",
  };
}

export function classifyAllRights(sources: SourceCandidate[]): RightsDecision[] {
  return sources.map(classifyRights);
}
