# 质量控制规则

## 状态模型

每项检查只能是 `passed`、`failed`、`blocked`、`needs_review`。Daily Auto Mode 不允许人工豁免硬门禁；自动决定必须记录 reviewer、原因、时间和适用 revision。

## 必检门禁

以下 16 项必须在 QC 报告中逐项出现并附证据：

1. `resolution`：成片分辨率符合配置。
2. `frame_rate`：帧率符合配置且为恒定帧率。
3. `duration`：时长在配置范围内并与时间线一致。
4. `black_frames`：无非预期黑帧或空帧。
5. `missing_assets`：无缺失、损坏或未落地素材。
6. `subtitle_bounds`：字幕不越界、不被平台 UI 或人物嘴部遮挡。
7. `audio_clipping`：无削波、爆音、未声明的异常静音或不可接受底噪；已标注的自然留白允许存在。
8. `av_sync`：旁白、字幕、口型和画面事件同步。
9. `duplicate_assets`：无未说明的重复素材和重复镜头填充。
10. `low_resolution_assets`：无被放大使用的低分辨率主素材。
11. `watermark_and_copyright`：水印状态、授权和版权证明合格。
12. `news_facts`：标题、口播、字幕和画面中的新闻事实一致。
13. `data_sources`：每项事实和数据都可回溯到合格来源。
14. `historical_duplication`：已完成规定历史窗口去重。
15. `visual_semantic_match`：画面语义与当前口播一致，不以无关素材填充。
16. `automatic_review_status`：最终 revision 已通过 Daily Auto 自动审核。

此外必须保留配置与 denylist、MiniMax 音色、HyperFrames lint/validate/inspect、Remotion 代表帧和最终渲染的框架证据。

## 失败处理

- 任一必检项失败，整体状态不得为 `passed`。
- 修复只重放受影响阶段及其下游阶段。
- 禁止降低阈值、删除失败记录或更换供应商来掩盖问题。
- QC 报告使用 `../templates/qc_report.yaml`；Director Score 与 Final Quality Score 都必须严格大于 90。
- PPT、纯图片轮播或“一句话一张图”视为 `visual_semantic_match` 失败，不接受人工静默放行。
