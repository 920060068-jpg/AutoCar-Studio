# 发布准备工作流

## 当前能力

本工作流当前只准备发布包，不连接抖音，不执行上传、定时、点击或发布动作。

## 硬门禁

开始前必须确认：

- `CONFIG.yaml` 中 `publishing.auto_publish: false`。
- `publishing.release_candidate_only: true`。
- `publishing.release_candidate_review_mode: automatic`。
- 最终 QC 为 `passed`。
- 自动审核为 `approved`，Director 与 Final Quality Score 均严格大于 90。
- 待发布文件校验和与审核文件一致。

任一条件不满足即停止，禁止静默跳过。

## 发布包内容

- 最终视频文件路径和校验和。
- 封面与第 0 帧校验和。
- 标题、简介、话题标签和来源说明。
- 字幕文件。
- 事实、版权、QC 和自动审核摘要。
- 建议发布时间，但不创建任何外部计划任务。

## 输出状态

当前最高状态只能是 `release_candidate` 或 `ready_for_manual_publish`。不得产生 `published` 状态。

真实发布能力必须在后续阶段单独设计、审查并获得明确授权。
