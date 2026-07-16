# Assets

本目录用于项目自有、品牌官方授权、专业媒体授权或公开可授权的真实素材。目录位置不能代替 `database/assets.json` 登记、版权证明和自动质量/版权门禁；权利状态不明确时必须阻断。

当前已登记 28 张本地图片：14 张 Tesla 图片均为 `unverified`；14 张 Toyota 图片中，11 张可追溯到 Toyota 官方域名并标记为受限 `official_press_asset`，其余 3 张为不可用的 Google 缩略图。Toyota 官方 rendition 当前只有 480×320，仍不能进入目标竖屏 Render Manifest。当前没有已入库视频素材。本阶段不下载、不连接 API，也不得把 README、URL 或素材需求冒充为可用媒体。

## 品牌目录

真实汽车素材进入 `brands/<brand>/`，每个品牌固定包含：

- `exterior/`：外观、静态展示、车身细节。
- `interior/`：座舱、屏幕、空间和内饰细节。
- `driving/`：道路行驶、动态跟拍和车辆运动。
- `factory/`：制造、装配、检测和工厂环境。
- `launch/`：发布会、展台和官方揭幕。
- `logo/`：经许可的品牌标识和片尾署名素材。

文件名统一为 `<brand>_<vehicle>_<scene>_<camera>_<yyyymmdd>_rNN.<ext>`。禁止使用 `final`、`new` 或无车型含义的名称。

## 真实素材入库流程

1. 人工取得本地原始文件和授权证明；不得由本项目自动下载。
2. 先运行 `scripts/check_asset_cache.ts <file> [--source-url <url>]`。命中 SHA-256 或来源 URL 时必须复用已有 `asset_id`，不得再次复制或下载。
3. 确认未命中后，把文件放入正确品牌和场景目录；同名文件不得覆盖，修订使用新的 `_rNN`。
4. 使用 `ffprobe` 或等价工具记录编码、分辨率、帧率、时长和音轨；图片生成审核预览，视频生成首帧预览和低分辨率代理。派生文件不得再次作为原始素材登记。
5. 在 `database/assets.json` 追加记录，填写来源、授权、质量等级、标签、SHA-256、`used_count` 和 `last_used`。
6. 在 `database/asset_cache.json` 追加 SHA-256 与规范化来源 URL 映射。缓存只用于去重，不代表版权已通过。
7. 质量与版权审核通过后，才把 `lifecycle_status` 设为 `active`；否则保持 `registered` 或 `quarantined`。
8. 使用 `scripts/generate_asset_manifest.ts` 从已批准 Storyboard 生成 Manifest；任一镜头无合格素材时结果必须为 `blocked`。

## 硬门禁

- 质量等级按 `../rules/asset_quality.md` 执行；最终成片 A+B 级素材时长占比必须至少 70%，D 级 AI 补充不得超过 30%。
- 版权状态只有 `cleared` 或 `project_owned` 才能进入 Manifest。
- 同一 SHA-256 只能对应同一稳定 `asset_id`；跨镜头复用必须记录理由。
- 不得覆盖、删除、裁水印、扩大授权范围或把新闻可引用性当成媒体使用权。

原有通用分类目录继续保留用于非品牌资产和历史兼容；停用记录进入 `archive/`，但不得自动删除。
