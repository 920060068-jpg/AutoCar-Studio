# Motion Registry Contract

本注册表只定义未来 Motion Component 的登记规则，不安装、不调用 HyperFrames，也不登记虚假组件。

## 登记字段

| 字段 | 约束 |
|---|---|
| `component_id` | 仓库内唯一、不可复用。 |
| `component_path` | 必须位于 `src/hyperframes/components/`。 |
| `category` | 仅限 `title`、`data`、`hud`、`annotation`、`transition`。 |
| `input_schema` | 声明组件接受的文本、数据和素材字段。 |
| `duration_frames` | 正整数，并与 Motion Plan 一致。 |
| `first_frame_reference` | 已批准首帧的仓库相对路径与校验和。 |
| `brand_style` | 必须引用 `brand_styles/` 中已存在的样式文件。 |
| `status` | `draft`、`validated` 或 `approved`。 |
| `revision` | 从 1 开始递增；已批准版本不可原位覆盖。 |

## 注册规则

1. 只有通过 `rules/hyperframes_engine.md`、素材版权和首帧检查的组件才能标记为 `validated`。
2. `approved` 必须有自动作业记录；注册状态不能替代成片自动审核。
3. 注册组件只输出局部动态图形，不能拥有主时间线、字幕、音频或最终渲染。
4. 组件不得读取网络地址、调用外部 API 或使用禁止供应商。
5. 组件路径、输入和版本变更必须产生新 revision，并保留旧记录用于重放。

## 当前登记

无。Phase 6 只建立注册契约，不创建或调用 Motion Component。
