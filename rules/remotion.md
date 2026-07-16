# Remotion 规则

## 职责边界

Remotion 是最终合成和主时间线的唯一权威，负责时间线、剪辑、字幕、音频混合和最终渲染，并组合 MiniMax 音频、新闻素材、HyperFrames 镜头和必要的 HeyGen 主持镜头。

## 时间与素材

- 默认主时间线为 1080 × 1920、30 fps。
- 时长由已批准的 MiniMax 音频和 `TimelineManifest` 决定。
- 所有秒数必须按统一舍入策略转换成整数帧。
- 静态素材使用 Remotion `Img`，视频和音频使用当前 `@remotion/media` 组件。
- 资产必须通过 `staticFile()` 或经过资产管理器批准的固定 URL 引用。

## 动画

- 动画由 `useCurrentFrame()`、`interpolate()` 或明确需要时的 `spring()` 驱动。
- 禁止 CSS transition、CSS animation 和 Tailwind 动画类。
- 时间范围使用 `Sequence` 明确表达，不得依赖浏览器实际时间。
- 视频结果必须确定性渲染。
- 禁止把 Remotion 用于拼接 PPT、纯图片轮播或“一句话一张图”；素材不足时必须阻断上游任务。

## 首帧与检查

- 成片第 0 帧必须使用已批准的预览图。
- 先渲染代表性 still 检查布局，再执行全片渲染。
- 最终检查尺寸、帧率、时长、黑帧、字幕越界、音频爆音、音画同步和素材血缘。

当前 `src/remotion/` 只有边界说明，未建立可渲染工程，也未安装 Remotion。
