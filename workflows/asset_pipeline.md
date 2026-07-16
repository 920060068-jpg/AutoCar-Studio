# Asset Intelligence Pipeline

## 目标与边界

把已批准分镜与本地资产数据库匹配，经质量和版权硬门禁后生成可审计素材清单。

流程：Storyboard → Asset Search → Quality Check → License Check → Asset Manifest → Render。

当前工作流禁止自动下载网络素材、商业素材 API、真实账号、绕过版权、自动发布和实际渲染。没有合格素材时必须停止或返回选题阶段，不能用静态图片勉强填充。

## 必读

- `../AGENTS.md`
- `../CONFIG.yaml`
- `../EXECUTION_CONTRACT.md`
- `../agents/asset_database_manager.md`
- `../agents/asset_quality_scorer.md`
- `../agents/asset_matcher.md`
- `../agents/asset_manager.md`
- `../rules/assets.md`
- `../rules/asset_quality.md`
- `../rules/copyright.md`
- `../templates/storyboard.yaml`
- `../templates/asset_manifest.yaml`
- `../database/assets.json`
- `../database/asset_cache.json`
- `../scripts/generate_asset_manifest.ts`
- `../scripts/check_asset_cache.ts`

## 1. Storyboard

### Input

- 自动审核批准或显式人工覆盖的 `templates/storyboard.yaml` 实例、校验和和 revision。

### Process

- 锁定每个 `shot_id` 的视觉目的、事实映射、素材请求、品牌/车型、动作、时长、画幅和必要性。
- 确认分镜与预览首帧已通过自动门禁，且没有禁用表现形式。

### Output

- 不可变的镜头需求列表和数据库查询条件。

### Validation

- 镜头 ID 唯一、时间线连续、素材请求完整。
- 脚本、分镜或预览未批准时停止，不得开始搜索。

## 2. Asset Search

### Input

- 镜头需求和 `database/assets.json` 锁定 revision。

### Process

- Asset Matcher 只检索本地 `active` 记录。
- 按类型、分类、品牌/车型、场景、动作、光线、画幅和时长过滤。
- 记录候选 ID、排除原因和素材缺口，不访问网络。

### Output

- 每镜候选列表、数据库 revision、查询条件和缺口报告。

### Validation

- 候选文件真实存在、路径位于允许目录且 SHA-256 与数据库一致。
- 无候选时输出 `blocked` 或素材请求，不得自动下载或放宽条件。
- 匹配前必须完成 SHA-256 与来源 URL 缓存检查；命中记录时复用同一 `asset_id`。

## 3. Quality Check

### Input

- 本地候选、媒体元数据、目标镜头和 Asset Quality Scorer 规则。

### Process

- 评估 `quality_score`、`source_score`、`visual_score` 和 `commercial_risk`。
- 检查分辨率、清晰度、格式、时长、帧率、画幅、水印、语义和重复使用。

### Output

- 逐候选评分、证据、硬失败和质量状态。

### Validation

- 分数范围为 0–100 且有证据；未检测项目不能伪造得分。
- 低分辨率、水印异常、文件损坏、语义不匹配或重复滥用必须淘汰。

## 4. License Check

### Input

- 质量通过候选、来源记录、许可对象、证明文件和目标用途。

### Process

- 独立核对权利人、许可类型、商业用途、平台、地域、有效期、署名和证明路径。
- 来源可信度不能替代许可；商业风险分不能替代法律门禁。

### Output

- `cleared`、`project_owned` 或 `blocked` 的版权结论及证据路径。

### Validation

- 只有 `cleared` 或 `project_owned` 可进入 Manifest。
- `official_press_asset` 仅在官方来源、新闻报道用途限制、证明路径、无第三方水印及目标平台范围全部明确时可进入 Editorial Manifest；它不代表发布授权。
- `unknown`、`unverified`、`pending`、`disputed`、过期、超范围或证明缺失均为失败。
- 版权例外不能由 Matcher 自动批准；Daily Auto Mode 直接标记 `blocked`。

## 5. Asset Manifest

### Input

- 分镜、质量和版权均通过的候选，以及候选淘汰记录。

### Process

- Asset Matcher 为每个必需镜头选择主资产，检查当前清单重复和跨镜头连续性。
- 写入 `templates/asset_manifest.yaml` 的来源、许可、质量、匹配和状态字段。
- 按镜头实际时长计算 A+B 与 D 级占比；A+B 低于 70% 或 D 高于 30% 时清单为 `blocked`。

### Output

- 素材清单实例、素材缺口、选择理由和清单校验和。

### Validation

- 每个必需镜头都有唯一主资产；文件、SHA-256、来源、许可和数据库一致。
- 任一必需镜头缺失时整个 Manifest 为 `blocked`。
- 清单必须通过 `scripts/validate_assets.ts`，不得手工修改状态绕过检查。
- 生成器只读 Storyboard、资产数据库和缓存索引，不访问网络、不下载素材且拒绝覆盖已有输出。

## 6. Render

### Input

- 已批准 Manifest、分镜、预览首帧、音频计划和锁定配置。

### Process

- 将清单交给 `render_pipeline.md`；只有全部硬门禁通过才执行渲染。
- 渲染后必须重新执行素材、技术 QC 和自动审核。

### Output

- 状态为 `ready_for_render_handoff` 或 `blocked`。

### Validation

- 所有必需素材状态为 `cleared`、`project_owned`，或满足 `rules/copyright.md` 全部限制的 `official_press_asset`；数据库和 Manifest revision 一致。
- 自动发布必须保持关闭；实际渲染和发布不得由本工作流自动触发。

## 失败与重放

任何阶段失败立即停止下游，记录输入、数据库 revision、错误和证据。替换素材、更新许可或改变分镜必须新建 revision；禁止静默跳过、覆盖旧记录、降低质量或版权标准。
