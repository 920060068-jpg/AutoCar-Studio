# Motion Engine

`src/motion/` 是 AutoCar Studio 的局部运动能力层，不拥有整片时间线、音频或最终渲染。能力名称、用途、默认时长和参数以 `motion_registry.yaml` 为唯一注册源。

目录按职责分为 camera、text、data、transition 和 effects。Remotion 适配组件位于 `../remotion/components/`；未来 HyperFrames 实现必须使用相同能力名和参数语义，不能静默改变运动含义。

所有运动必须确定、可按帧重放，并遵守 `../../rules/motion_engine.md`。
