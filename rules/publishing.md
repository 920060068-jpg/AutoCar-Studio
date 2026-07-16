# 发布规则

## 当前状态

- `publishing.auto_publish` 必须为 `false`。
- `publishing.release_candidate_only` 必须为 `true`。
- `publishing.release_candidate_review_mode` 必须为 `automatic`。
- 没有发布平台连接，`publish_pipeline` 只能生成手动发布准备清单。

## 发布前条件

- 事实、去重、脚本、分镜、素材、版权、音频和全部 QC 通过。
- Director Score 与 Final Quality Score 均严格大于 90，自动审核为 `approved`。
- 标题、封面、字幕、来源说明和平台元数据完整。
- 发布包不得包含密钥、内部提示词、临时 URL 或未授权素材。

## 禁止行为

- 禁止自动发布、定时发布或模拟点击发布按钮。
- 禁止把“已渲染”当作“已审核”。
- 禁止在 QC 失败、版权未知、素材缺失或自动审核未通过时生成 Release Candidate。

真实发布能力必须在后续阶段获得独立明确授权后才能设计和接入；手动发布仍需人执行。
