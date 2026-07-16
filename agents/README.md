# Agent Responsibilities

本目录描述逻辑角色，不自动创建后台代理，也不授权并行外部调用。

## 角色

| 角色 | 职责 | 不得执行 |
|---|---|---|
| Lead | 读取治理文件、选择工作流、锁定配置、协调阶段状态 | 跳过失败、替代人工终审 |
| Researcher | 整理本地来源、建立 claim-source 映射、识别冲突 | 编造来源、把摘要当原文 |
| Deduplicator | 标准化主题、聚类重复、记录合并理由 | 仅凭标题相似自动删除主题 |
| Editor | 使用已核验事实写文案和屏幕文字 | 添加无 claim 的事实 |
| Storyboarder | 定义视觉意图、镜头、首帧和素材需求 | 在预览图前启动视频生成 |
| Asset Auditor | 检查文件、校验和、血缘和版权 | 接受来源或版权未知的素材 |
| Producer | 按批准分镜生成局部视觉并提交 Remotion 合成 | 自动发布、让 HeyGen 主导整片 |
| QC | 执行自动检查、保存证据、生成 QC 报告 | 删除失败记录或静默豁免 |
| Automatic Reviewer | 审核最终 revision 并给出明确决定 | 缺少证据仍标记通过 |

## 交接契约

每次交接必须包含 `job_id`、revision、输入路径、输出路径、校验和、规则版本、状态和未解决问题。接收方只处理状态为 `passed` 或明确 `needs_review` 的输入。

## Phase 3 前期生产角色

- `topic_editor.md`：候选筛选、热点评分、历史去重和选题建议。
- `fact_checker.md`：逐条事实核验、来源等级和风险分类。
- `script_editor.md`：短视频结构、Hook、信息密度和评论引导。
- `visual_director.md`：文案转镜头、景别、焦段、运镜、光线和镜头目的。
- `asset_planner.md`：素材分类、来源优先级、版权记录和 AI 素材限制。

这些角色是现有 Editor、Researcher、Storyboarder 和 Asset Auditor 职责的明确分工，不创建后台进程，也不扩大外部调用权限。

## Phase 3 Story Intelligence 角色

- `audience_analyst.md`：分析买车用户、汽车爱好者和普通流量用户的兴趣、痛点与预期反应。
- `viral_strategist.md`：设计基于事实的前三秒 Hook、冲突、情绪曲线、受众触发点和留存策略。

Story Intelligence 角色只能读取已核验事实和本地聚合历史，不能读取外部平台数据或替代人工策略审核。

## Phase 4 媒体生产角色

- `asset_manager.md`：登记本地素材、评估质量、记录来源与版权、执行完全重复检查。
- `audio_director.md`：规划旁白、BGM、环境音、汽车声音和混音规则。

Asset Planner 负责提出素材需求；Asset Manager 负责把已取得的本地文件登记为资产。两者不得合并来源可靠性与媒体版权判断。
