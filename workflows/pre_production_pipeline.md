# 前期生产工作流

## 目标与边界

把新闻材料转换为经过自动选题、事实、文案、视觉和素材审核的前期生产包。

执行链：新闻输入 → 选题评分 → 事实审核 → 脚本 → 视觉设计 → 素材规划。

任何一步失败必须停止下游并记录，禁止静默跳过；发布动作始终禁止。

## 必读

- `../AGENTS.md`
- `../CONFIG.yaml`
- `../SOURCES.yaml`
- `../EXECUTION_CONTRACT.md`
- `../agents/topic_editor.md`
- `../agents/fact_checker.md`
- `../agents/script_editor.md`
- `../agents/visual_director.md`
- `../agents/asset_planner.md`
- `../rules/editorial.md`
- `../rules/fact_checking.md`
- `../rules/storyboard.md`
- `../rules/camera.md`
- `../rules/assets.md`
- `../rules/copyright.md`

## 1. 新闻输入

### Input

- 用户提供的本地新闻原文、公告、数据或媒体材料。
- 来源元数据、采集时间和历史主题窗口。

### Process

- 创建 `job_id`、revision 和来源记录。
- 检查必需文件可读、来源类别存在、时间信息完整。
- 明确区分新闻材料与素材版权；此时不判断可商用。

### Output

- 规范化候选记录、来源记录和本地证据路径清单。

### Validation

- 至少一个符合 `SOURCES.yaml` 的可靠来源候选。
- 原文不可读、来源未知或缺少采集时间时状态为 `blocked`。

## 2. 选题评分

### Input

- 规范化候选、来源记录、历史去重结果和初步素材可行性。

### Process

- Topic Editor 按 100 分制评估时效、受众价值、汽车相关性、证据、视觉、素材和信息增量。
- 独立记录风险、版权和历史重复，不用高热度抵消硬风险。

### Output

- `../templates/topic_analysis.yaml` 实例和选题建议。

### Validation

- 所有分项有理由；完成历史去重；素材不足时降级或停止。
- 事实审核前状态只能是 `candidate`、`needs_review`、`deprioritized` 或 `blocked`。

## 3. 事实审核

### Input

- 选题分析、原始材料、来源记录和 `SOURCES.yaml`。

### Process

- Fact Checker 拆分 `claim_id` 并逐条核对主体、数字、时间、口径和上下文。
- 敏感主题执行升级核验；来源冲突直接阻断，不由自动系统猜测裁决。

### Output

- 事实报告、逐条证据映射、风险级别和冲突清单。

### Validation

- 只有 `verified` 声明可向下游传递。
- 任一关键声明为 `disputed`、`unverified` 或 `outdated`，或者高风险核验不足时停止。

## 4. 脚本

### Input

- 自动批准选题、只含已核验声明的事实报告、目标时长和已批准 Story Intelligence 脚本方向包。

### Process

- 先执行 `story_intelligence_pipeline.md`，完成受众、传播策略和脚本方向审核。
- Script Editor 按 Hook、事实、分析、比较、结论和评论引导组织内容。
- 每个事实段绑定 `claim_ids`，并估算各段时长和信息密度。

### Output

- `../templates/script_structure.yaml` 实例。
- 审核通过后可映射到 `../templates/script.yaml` 的生产脚本格式。

### Validation

- 不新增无证据事实；Hook 与正文一致；总时长为 38–45 秒。
- Story Intelligence 状态必须为 `approved_for_script_writing`。
- 数字有口径，事实与观点分离，评论引导具体且不煽动；自动文案审核通过后才能继续。

## 5. 视觉设计

### Input

- 已批准脚本、事实映射、品牌样式、平台参数和镜头规则。

### Process

- Visual Director 按叙事目的拆镜头。
- 为每镜定义 `duration`、`visual`、`camera`、`movement`、`audio` 和 `asset`。
- 检查景别、焦段、运镜、光线、连续性和视觉语义。

### Output

- `../templates/storyboard.yaml` 实例和预览首帧计划。

### Validation

- 时间线连续且总时长合规；每镜有明确目的和事实映射。
- 未生成并自动批准预览首帧，不得进入制作。
- 禁止 PPT、图片轮播、一句话一张图和无关素材填充。

## 6. 素材规划

### Input

- 已审核分镜、镜头素材请求、来源政策、版权规则和技术要求。

### Process

- Asset Planner 为每项素材确定类型、来源优先级、许可要求、技术规格和回退请求。
- 区分新闻证据来源与媒体使用权；AI 素材只作为解释性计划，不作为事实证据。

### Output

- 每项素材的 `../templates/asset_request.yaml` 实例。
- 素材缺口、版权风险和选题可执行性报告。

### Validation

- 每个分镜素材请求有来源、许可、状态和对应镜头。
- 权利未知、来源不清、技术规格不足或动态素材不足时状态为 `blocked`。
- 前期生产包完成后必须自动审核；通过后状态为 `ready_for_asset_acquisition`。

## 交付包

前期生产包至少包含：选题分析、事实报告、结构化脚本、分镜、素材请求、所有输入输出校验和、阶段状态和自动决定。任何缺项都不得标记完成。
