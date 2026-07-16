# Transition Motion

本目录管理 `light_wipe`、`cinematic_blur` 和 `zoom_transition`。

- 转场只表达镜头关系，不能遮挡关键字幕或数字终值。
- 跨镜头时机由 Remotion 主时间线决定。
- React 适配实现：`../../remotion/components/Transition.tsx`。
- 参数权威来源：`../motion_registry.yaml`。
