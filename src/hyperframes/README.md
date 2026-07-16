# HyperFrames Architecture Boundary

## 职责

HyperFrames 是局部动态图形与视觉包装层。它负责标题、数据卡、图表、HUD、标注、镜头内运动和转场组件，不负责整片剪辑、主字幕、音频、最终渲染或发布。

## Input

`Storyboard + Motion Plan`

- Storyboard 必须已批准，并包含 `shot_id`、时长、视觉目的、首帧参考和素材引用。
- Motion Plan 必须符合 `../../templates/motion_plan.yaml`，并通过品牌、安全区、数据和转场规则检查。
- 所有素材必须来自已清理的 Asset Manifest；任何禁用供应商或版权未知素材立即阻断。

## Output

`Motion Components`

每个 Motion Component 是确定性的局部镜头组件契约，至少描述：

- `component_id` 与对应 `shot_id`。
- 画布、帧率、持续帧数和首帧校验和。
- 输入素材 ID、文字、数据、图层和时间标记。
- 运动、效果、HUD、转场和无障碍说明。
- 组件状态、规则版本和输出校验和。

Motion Components 未来作为不可变视觉输入交给 Remotion。它们不能拥有整片主时间线，也不能改变脚本事实、字幕内容或音频。

## 架构边界

- 一镜一组件契约；跨镜头节奏和最终转场时机由 Remotion 主时间线裁决。
- 所有时间使用帧或可确定换算的秒数，禁止依赖真实时钟和随机数。
- 已批准预览图是组件第 0 帧构图参考；变化必须创建新 revision。
- 组件只输出视觉，不调用 TTS、不混音、不发布。

## 必读

- `../../rules/hyperframes.md`
- `../../rules/hyperframes_engine.md`
- `../../rules/storyboard.md`
- `../../rules/assets.md`
- 已批准的 `../../brand_styles/*.yaml`

## 当前状态

Phase 6 已新增 `motion_registry.md` 和 `components/README.md`，用于约束未来组件登记与目录分类。当前没有 `index.html`、composition、运行时代码、已登记组件或已安装依赖；没有调用 HyperFrames，也没有生成 Motion Component。
