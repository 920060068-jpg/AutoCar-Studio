# HyperFrames 规则

## 职责边界

HyperFrames 只负责动态图形与视觉包装，例如数据卡片、标题、图表和参数说明。它不负责主时间线、剪辑、主字幕、音频混合或最终渲染，不生成旁白，也不直接发布成片。

## 制作前门禁

- 必须先读取已批准的 `brand_styles/*.yaml`。
- 必须先完成静态英雄帧布局，再添加 GSAP 动画。
- 每个镜头必须已有 `preview_frame`，并以其作为首帧和构图参考。

## 硬规则

- 根容器必须有 `data-composition-id`；剪辑必须有唯一 ID、`data-start`、`data-duration` 和 `data-track-index`。
- 时间线必须同步创建、`paused: true` 并注册到 `window.__timelines`。
- 禁止 `Math.random()`、`Date.now()`、异步构建时间线和 `repeat: -1`。
- 视频必须 `muted playsinline`，声音使用独立音轨；本项目禁止调用 HyperFrames TTS。
- 多场景必须有转场和逐元素入场；除最终场景外，不先做退场再转场。
- 文字和主要内容使用流式布局；绝对定位只用于装饰层。
- 禁止把 HyperFrames 当作 PPT、纯图片轮播或“一句话一张图”生成器。

## 质检顺序

在依赖获准安装后执行：

```text
npx hyperframes lint
npx hyperframes validate
npx hyperframes inspect --json
npx hyperframes preview
npx hyperframes render
```

任何 lint、对比度、溢出或动画冲突问题都必须修复或有记录的人工豁免。
