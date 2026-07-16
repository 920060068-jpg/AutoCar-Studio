# Camera Motion

本目录管理 `push_in`、`pull_out`、`orbit`、`tracking` 和 `parallax` 的能力契约。

- 每个镜头只允许一个主要摄影运动。
- 强度必须受控，不能扭曲车辆比例或伪造速度。
- React 适配实现：`../../remotion/components/CinematicCamera.tsx`。
- 参数权威来源：`../motion_registry.yaml`。
