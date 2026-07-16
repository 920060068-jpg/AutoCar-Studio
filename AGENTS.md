# AutoCar Studio Agent Contract

## 使命与优先级

每天只生产 1 条可审计的汽车新闻 Release Candidate。事实、版权和硬性质量门禁高于速度。

冲突优先级：系统/法律约束 → 用户当前明确指令 → 本文件 → 永久文档与配置 → 工作流、规则和模板。

## 每个新任务的强制启动顺序

1. 确认当前仓库是 `AutoCar-Studio`。
2. 依次读取 `AGENTS.md`、`PROJECT_MEMORY.md`、`CONFIG.yaml`、`DAILY_PRODUCTION.md`、`QUALITY_STANDARD.md`、`FAILURE_RECOVERY.md`。
3. 读取当前 checkpoint 与 `database/daily_production_state.json`。
4. 检查本地日期、系统时区和 Git 状态。
5. 执行 `npm run daily:check`。
6. 再处理用户的新任务，并读取匹配的 `EXECUTION_CONTRACT.md`、`SOURCES.yaml`、`workflows/`、`rules/` 和模板。

用户明确要求不启动当日生产时，只执行检查，不运行 `daily:run` 或 `daily:resume`。

## Daily Auto Mode

- 默认模式为 Daily Auto Mode；中途不等待人工确认，系统只能决定 `approved`、`revise`、`retry`、`blocked` 或 `failed`。
- 每日最多 1 条，本地时间 12:00 启动；错过时间后只补做当天任务，从最后成功 checkpoint 恢复。
- Director Score 与 Final Quality Score 都必须严格大于 90；任一硬门禁失败不得用总分抵消。
- Picture Lock 前禁止调用 MiniMax；Picture Lock 后画面冻结，音频适配画面。
- Picture Lock 前必须完成 Narration Timing Budget、Audio-Fit Script、静态时长估算、字幕时间草案与 Audio Preflight；正式 MiniMax TTS 只能在 `audio_preflight_pass: true` 后调用。
- 只允许生成 `release_candidate.mp4`，禁止自动发布。

## 不可放宽的停止条件

核心事实无法核验、来源冲突、高风险事实证据不足、版权为 prohibited、需要绕过访问控制、素材或音频缺失、渲染损坏、Director/质量分不达标时立即停止并保存 checkpoint 与 failure report。

## 工具与文件纪律

- 禁止删除用户文件、覆盖已批准 revision、泄露密钥、绕过 403/登录/robots/DRM/签名或移除水印。
- Kling 永久在 denylist；HeyGen 仅可用于必要 `host_segment`。
- MiniMax 默认且唯一旁白为沉曜男声，真实 `voice_id` 不得使用显示名称或相似声音冒充。
- 旁白过长时，Daily Auto Mode 必须自动精简和重新估算，最多 2 轮；只重新生成变化段落，每镜最多 2 次正式 MiniMax 请求。不得用机械加速、截断句子或填充废话解决时长。
- HyperFrames 只负责动态图形包装；Remotion 负责主时间线、字幕、音频和最终渲染。
- 未获明确授权，禁止 Git add、commit、push 和任何平台发布。

详细规则只保存在永久文档、`EXECUTION_CONTRACT.md`、`rules/`、`workflows/` 和 `templates/`。
