# Changelog

本文件记录 AutoCar Studio V4 的阶段级变化。未发布版本按实施阶段维护。

## 4.0.0 Stable — 2026-07-16

- 冻结 Daily Auto Mode：每天 1 条、本地 12:00、错过启动补偿、重复任务锁和 checkpoint 恢复。
- 冻结严格质量门禁：Director Score 与 Final Quality Score 均必须 `> 90`，任一硬门禁失败不得输出 Release Candidate。
- 冻结 Editorial Mode 默认与 Press Kit Mode 的本地授权资产前提，禁止绕过 403、robots、DRM 或其他访问控制。
- 冻结 Picture Lock、Audio Timing Budget、Audio-Fit Script、数字语义、发音词典、三文本分离、沉曜男声原生 speed 校准、请求指纹缓存和变更段落最小重生。
- 以 Porsche 生产案例验证完整音频与最终 QC；以 Xiaomi 和 Toyota 生产经验固化原创编辑视觉与版权门禁 fixture。
- 增加 25 项本地回归测试、稳定运维、回滚和回归指南；测试不调用 MiniMax 或其他付费 API。
- 不包含自动发布；V4.0 Stable 核心流程冻结，后续变更必须在独立分支验证。

## Permanent Operating System & Daily Automation V1

- 全局目标统一为每天 1 条、本地时间 12:00、抖音 1080×1920/30fps/38–45 秒。
- Daily Auto Mode 改为自动审核，不等待中途人工确认；严格要求 Director Score 和 Final Quality Score 均大于 90。
- 新增永久文档、daily state、checkpoint、锁、错过时间补偿、恢复脚本和 Codex Scheduled task 配置说明。
- 默认 Original Editorial Visual Mode；Press Kit 仅允许本地已授权资产。
- MiniMax 问题保留为 `audio_blocked`，禁止换声；只产出 Release Candidate，绝不自动发布。
- 旁白时序改为自然表达优先：允许已标注的镜头间自然留白，不再要求 100% 旁白占用；Storyboard 与 QC 可区分有意留白和异常断音。

## V4 Foundation — Phase 6.1: Native MiniMax TTS

- 新增项目原生 MiniMax HTTP `t2a_v2` 客户端，固定支持 `speech-2.8-hd` 和真实 Voice ID。
- MiniMax 配置统一迁移到项目根目录 `.env`；移除活动代码对 Keychain、旧项目适配器和绝对路径的依赖。
- 新增安全配置初始化、本地脱敏检查、真实 TTS、原始音频、48 kHz WAV 母版和审计报告流程。
- Foundation 外部能力仅开放 `minimax_tts`，视频生成、其他供应商和自动发布继续关闭。

## V4 Foundation — Phase 6: Render Engine Implementation

- 将 Node 基线设为 24 LTS，新增 `.nvmrc`，并在不安装依赖的前提下声明 React、Remotion 和 TypeScript 工程依赖。
- 新增最小 Remotion 注册入口、测试 Composition、Scene、Shot、Caption 和 AudioTrack 组件。
- 新增 HyperFrames Motion Registry 契约与组件目录规范；未创建或调用 Motion Component。
- 新增纯合成 Storyboard、受阻 Render Config 和只读环境检查脚本。
- 系统环境仍缺少 PATH 可用的 Node、npm 和 FFmpeg，因此预览、类型检查与渲染保持阻断。

## V4 Foundation — Phase 5: Render Engine Architecture

- 升级 HyperFrames 与 Remotion 源码边界说明，定义 Motion Components 和 VideoProject 逻辑结构。
- 新增 HyperFrames Engine、Remotion Engine 和 Subtitle Engine 规则。
- 新增 Motion Plan 与 Render Config 数据契约。
- 新增 Storyboard 到 QC 的九阶段渲染架构工作流；所有引擎和 Render 状态保持未执行。
- 当前继续禁止 Node 依赖、Remotion、HyperFrames、正式视频、外部 API、自动发布和 Git 提交。

## V4 Foundation — Phase 4: Media Production Engine

- 新增 Asset Manager 和 Audio Director，建立素材登记、质量、版权、重复检查和音频规划职责。
- 新增 vehicle、factory、launch、interior、technology、highway、driving、comparison 八类镜头库说明。
- 新增 BMW、Mercedes-Benz、Tesla、BYD、Xiaomi Auto、Porsche 六套编辑视觉参考。
- 将素材清单升级为 schema v2，并同步本地样例和验证器。
- 新增从批准脚本到人工审核的生产规划工作流；Render Plan 明确保持未执行。
- 当前继续禁止真实素材 API、依赖安装、正式视频生成、HyperFrames、Remotion、自动发布和 Git 提交。

## V4 Foundation — Phase 3B: Production Engine - Story Intelligence

- 新增 Audience Analyst 与 Viral Strategist，分别负责受众判断和基于事实的传播策略。
- 升级价格战、新车发布和技术模板，新增行业冲突模板。
- 新增 topic、hook、style 三类追加式本地历史 schema，禁止伪造平台表现。
- 新增 Topic 到 Approval 的 Story Intelligence 强制工作流，并接入前期脚本阶段。
- 当前继续禁止外部 API、依赖安装、正式视频生成、HyperFrames、Remotion 和 Git 提交。

## V4 Foundation — Phase 3: Production Engine - Pre Production

- 新增 Topic Editor、Fact Checker、Script Editor、Visual Director 和 Asset Planner 五个前期生产角色规范。
- 新增选题分析、脚本结构和素材请求模板。
- 将分镜模板升级为结构化 `duration`、`visual`、`camera`、`movement`、`audio` 和 `asset` 字段。
- 新增从本地新闻输入到素材规划的强制前期生产工作流。
- 当前继续禁止外部 API、依赖安装、正式视频生成、HyperFrames、Remotion 和自动发布。

## V4 Foundation — Phase 2: Control Layer

- 将 `AGENTS.md` 收敛为最高级控制规则，增加执行优先级、读取顺序、工具原则、失败处理和人工审核节点。
- 将执行契约重构为九个明确阶段，并为每阶段定义 INPUT、OUTPUT、OWNER、VALIDATION、FAILURE CONDITION 和 RETRY RULE。
- 将 `CONFIG.yaml` 升级为分层配置，明确项目、视频、音频、供应商、denylist、发布和产物策略。
- 启用 HyperFrames 与 Remotion 的能力注册，同时保持正式视频生成关闭；固定两者职责边界。
- 将 HeyGen 限定为必要的 `host_segment`，并在 Foundation 阶段保持关闭。
- 新增 `VERSION.md`，记录当前阶段与下一阶段。
- 同步更新本地验证脚本和规则引用，以适配配置层级变化。

## V4 Foundation — Phase 1: Architecture Foundation

- 建立根级治理文档、来源分级、规则、工作流、模板和品牌样式。
- 建立 HyperFrames、Remotion、素材、数据、输出和日志目录边界。
- 建立配置、去重、分镜、素材与 QC 的本地 TypeScript 验证入口。
- 固定 Kling denylist、MiniMax 沉曜男声、禁止自动发布和强制人工审核。
- 建立 Foundation 合成样例，仅用于本地结构验证，不包含正式新闻或视频。
