# HyperFrames Components

此目录未来存放经过登记的局部动态图形组件。允许的逻辑分类为：

```text
components/
├── titles/       # 标题与章节标识
├── data/         # 数据卡与图表
├── hud/          # 车辆参数和技术 HUD
├── annotations/  # 重点标注
└── transitions/  # 局部视觉转场
```

Phase 6 不创建空分类目录或伪组件。新增组件时先创建实际实现，再按 `../motion_registry.md` 登记；任何组件都必须遵守 `../../../rules/hyperframes_engine.md`。
