# Story Intelligence 工作流

## 目标与边界

把已核验选题转换为明确的受众策略、传播策略和脚本方向，并通过自动审核形成可审计的本地内容记忆。

执行链：Topic → Audience Analysis → Viral Strategy → Script Direction → Automatic Review。

本工作流不替代事实核验。当前阶段禁止外部 API、依赖安装、图片或视频生成、HyperFrames、Remotion 和发布动作。所有传播结论都是策略预测，不是真实平台表现。

## 必读

- `../AGENTS.md`
- `../CONFIG.yaml`
- `../SOURCES.yaml`
- `../EXECUTION_CONTRACT.md`
- `../agents/audience_analyst.md`
- `../agents/viral_strategist.md`
- `../agents/fact_checker.md`
- `../agents/script_editor.md`
- `../rules/editorial.md`
- `../rules/fact_checking.md`
- `../rules/safety.md`
- `../data/topic_history.json`
- `../data/hook_history.json`
- `../data/style_history.json`

## 1. Topic

### Input

- 已完成事实核验、历史去重和自动选题审核的 `topic_analysis`。
- 逐条 `verified claim_id`、风险分类和本地证据路径。
- 三类历史数据的只读快照。

### Process

- 确认主题仍有信息增量且未被近期主题覆盖。
- 选择 `price_war`、`new_car_launch`、`technology`、`industry_conflict` 或其他适用方向。
- 提取不可改变的事实边界、敏感点和禁止传播角度。

### Output

- Story Intelligence 任务上下文：主题、类别、事实边界、风险、历史匹配和模板路径。

### Validation

- 所有可传播事实为 `verified`，选题已自动批准。
- 高风险争议未解决、历史重复无信息增量或模板不适用时状态为 `blocked`。

## 2. Audience Analysis

### Input

- Story Intelligence 任务上下文、事实影响范围和主题/风格历史。

### Process

- Audience Analyst 比较买车用户、汽车爱好者和普通流量用户的直接相关性。
- 选择一个主要受众，最多两个次要受众。
- 记录兴趣、痛点、预期反应和应排除角度。

### Output

- 包含 `audience_type`、`interest`、`pain_point`、`expected_reaction` 的受众分析。

### Validation

- 主要受众与新闻影响直接相关；预测有理由且明确标记为 `expected`。
- 禁止个人追踪、刻板印象、用户级数据和无证据人群推断。

## 3. Viral Strategy

### Input

- 已验证主题、事实边界、受众分析和 Hook/风格历史。

### Process

- Viral Strategist 设计前三秒 Hook、事实冲突、情绪曲线、受众触发点和留存顺序。
- 对照历史检查 Hook、情绪曲线和冲突类型的近期重复。
- 为评论引导设计具体、中性、可回答的问题。

### Output

- `hook`、`emotion`、`conflict`、`audience_trigger`、`retention_strategy`。

### Validation

- Hook 与结论一致；所有事实表达绑定 `verified claim_id`。
- 冲突有证据，情绪设计符合安全要求；不得承诺流量或编造平台数据。
- 历史高度相似时必须改写或记录可审计的自动保留理由。

## 4. Script Direction

### Input

- 已验证事实、受众分析、传播策略和匹配的内容模板。

### Process

- 将策略映射到内容模板的字段和揭示顺序。
- 定义 Hook、核心冲突、数据/技术/竞品顺序、消费者影响和结尾方向。
- 标明哪些内容是事实、编辑分析或有边界的未来判断。

### Output

- 脚本方向包：模板路径、目标受众、Hook、情绪曲线、事实顺序、冲突、留存策略和评论问题。
- 批准后交给 Script Editor 写入 `../templates/script_structure.yaml`。

### Validation

- 不新增事实、不改变来源口径；策略字段能映射到所选模板。
- 方向适合 38–45 秒，信息优先级清楚，评论问题不煽动对立。

## 5. Automatic Review

### Input

- 完整脚本方向包、事实报告、受众分析、传播策略和历史相似度结果。

### Process

- 自动审核事实一致性、Hook 准确性、冲突边界、情绪安全、受众适配和重复风险。
- 决定 `approved`、`revise`、`retry`、`blocked` 或 `failed`。
- 仅在批准后，按各历史文件的更新规则生成待追加记录和校验和。

### Output

- reviewer、时间、决定、备注和被审核文件校验和。
- `approved` 时输出历史追加记录；其他状态不得写入可复用记忆。

### Validation

- 批准记录必须包含 reviewer、时间和校验和。
- 历史更新只追加、不覆盖，revision 唯一；无真实证据时 outcome 保持 `unobserved`。
- 本阶段最高状态为 `approved_for_script_writing`，不得进入视觉制作或渲染。

## 失败与重放

任一步失败即停止下游。事实变化退回 Fact Checking；受众或策略变化创建新 revision。旧策略和自动决定必须保留，不得通过改写历史文件伪造首次通过。
