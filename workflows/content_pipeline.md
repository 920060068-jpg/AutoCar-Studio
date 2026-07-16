# Content Intelligence Pipeline

## 目标与边界

把小批量、本地可读取的汽车新闻材料转换为可审核的脚本和分镜，并在全部硬门禁通过后形成渲染交接包。

主流程：News → Scoring → Script → Storyboard → Render。

该流程不能缩短项目强制顺序。Scoring 只能产生候选排序；进入 Script 前必须完成事实核验、历史去重、Story Intelligence 和自动选题审核。禁止自动发布。

## 必读

- `../AGENTS.md`
- `../CONFIG.yaml`
- `../SOURCES.yaml`
- `../EXECUTION_CONTRACT.md`
- `../agents/news_intelligence.md`
- `../agents/trend_scorer.md`
- `../agents/script_generator.md`
- `../agents/storyboard_generator.md`
- `../rules/editorial.md`
- `../rules/fact_checking.md`
- `../rules/storyboard.md`
- `../rules/editorial_mode.md`
- `../rules/assets.md`
- `../rules/copyright.md`
- `story_intelligence_pipeline.md`

## 1. News

### Input

- 用户提供的本地新闻文件或人工整理的小批量候选。
- 来源元数据、采集时间和 `SOURCES.yaml`。

### Process

- News Intelligence 登记来源、分类新闻、拆分候选声明并生成历史匹配键。
- 只整理原材料，不补写因果，不自动抓取平台或账号数据。

### Output

- 符合 `agents/news_intelligence.md` 的 `news_item`。
- 待追加的 `data/news_history.json` candidate revision。

### Validation

- 至少一个可靠来源候选，原文和采集时间可追溯。
- 事故、召回、政策、伤亡和财务数据已标记升级核验。
- 本阶段状态不得高于 `candidate`；来源或原文不足时为 `blocked`。

## 2. Scoring

### Input

- `news_item`、历史匹配、初步素材可行性和风险标签。

### Process

- Trend Scorer 分别评估热度、讨论空间、视觉、商业和受众价值。
- 计算 0–100 总分，输出理由和排序建议。
- 排序后执行 Fact Checking、历史去重、自动选题审核和 `story_intelligence_pipeline.md`。

### Output

- `heat_score`、`controversy_score`、`visual_score`、`business_score`、`audience_score`、`total_score`。
- 候选建议、理由、事实报告、去重结论和自动选题决定。

### Validation

- 五项分数均为 0–20 整数，总分等于分项之和。
- 分数有本地依据；不得使用虚构平台指标。
- Fact Checking、历史去重和自动审核全部通过后，才可形成脚本输入。
- 高分不能覆盖来源、事实、版权、素材或安全失败。

## 3. Script

### Input

- 已核验事实、来源映射、自动批准选题、Story Intelligence 批准包和内容模板。

### Process

- Script Generator 使用 38–45 秒结构。
- 按 Hook、Facts、Analysis、Impact、CTA 组织脚本，每个事实绑定 `claim_id`。
- Script Editor 复核事实、口径、语气、时长和评论引导，随后进入自动审核。

### Output

- 符合 `templates/script_structure.yaml` 的脚本草稿。
- 待追加的 `data/script_history.json` revision 和审核记录。

### Validation

- 只包含已核验事实，事实、分析和预测明确分层。
- 总时长符合选定版本，Hook 与正文一致，CTA 中性。
- 自动审核状态必须为 `approved`，否则不得进入 Storyboard。

## 4. Storyboard

### Input

- 已批准脚本、品牌历史只读快照、平台配置、镜头规则和素材约束。

### Process

- Storyboard Generator 按叙事目的拆镜头，定义画面、景别、焦段、运动、音频和字幕。
- 绑定素材请求、版权状态、连续性和预览首帧计划。
- 当官方视频因访问或版权门禁无法合法取得时，按 `editorial_mode_pipeline.md` 停止受限视频搜索并创建 Editorial Storyboard 新 revision；不得等待 PR 素材或沿用旧视频分镜冒充通过。
- Asset Planner 复核素材可行性，系统自动审核分镜和预览首帧。

### Output

- 符合 `templates/storyboard.yaml` 的分镜。
- 素材请求、预览首帧路径和品牌历史待追加记录。

### Validation

- 镜头连续、总时长一致、每镜语义明确且有动态设计。
- 禁止 PPT、图片轮播和一句话一张图。
- 素材、版权或预览首帧未实际完成并批准时，必须保持 `blocked`，不得进入 Render。

## 5. Render

### Input

- 已批准分镜与预览首帧、完整素材清单、版权许可、音频计划和锁定配置。

### Process

- 先验证所有输入 revision 和校验和，再交给 `render_pipeline.md`。
- 渲染完成后必须执行完整 QC 和 Director Post-render Review；本工作流不能发布。

### Output

- 当前阶段：`render_handoff`、输入清单、校验和和 `ready_for_render_handoff` 状态。
- 获得未来明确授权后：渲染草稿、日志和 QC 输入包。

### Validation

- 事实、去重、脚本、分镜、素材、版权、音频和自动审核门禁全部通过。
- Render 输出不能进入发布；最终成片仍必须通过全部 QC 和严格大于 90 的质量评分。

## 失败与重放

任何阶段失败立即停止下游并记录 `job_id`、revision、输入、错误和状态。补充输入或修改规则后创建新 revision；禁止静默跳过、覆盖历史或降低事实标准。
