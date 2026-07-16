# Daily Auto 可执行工作流

权威目标和门禁见 `../DAILY_PRODUCTION.md`、`../QUALITY_STANDARD.md`、`../FAILURE_RECOVERY.md` 与 `../EXECUTION_CONTRACT.md`。

## 启动

1. 执行 `npm run daily:check`。
2. `wait`、`already_complete` 或 `locked`：停止。
3. `start`：执行 `npm run daily:run`。
4. `resume`：执行 `npm run daily:resume`，校验 checkpoint 后继续。
5. `blocked_invalid_checkpoint`、`failed`：生成 failure report，不猜测恢复点。

## 阶段

Daily Startup Check → 今日完成检查 → checkpoint 检查 → 热点发现 → 历史去重 → 事实核验 → 选题评分 → Script Draft → Storyboard Draft → Narration Timing Budget → Audio-Fit Script → 数字语义分类 → 发音词典解析 → TTS Text 生成 → Voice Speed Calibration → Static Audio Duration Estimate → Audio Preflight → Director Review → 素材采集 → Editorial Fallback（需要时）→ Picture Render → 自动 Picture Review → Picture Lock → MiniMax Live Probe → MiniMax TTS → Measured Audio Fit → BGM/SFX → Audio Mix → Final Render → 技术 QC → 内容 QC → Director Post-render Review → Release Candidate。

每个阶段输出 `approved`、`revise`、`retry`、`blocked` 或 `failed`，并写 checkpoint。Daily Auto Mode 不等待中途人工确认。

## 失败

核心事实、版权、访问控制、必需素材/音频、渲染、Director Score 或 Final Quality Score 任一门禁失败时停止。合理重试后仍失败则 `blocked`；禁止降低标准、换声、静态填充或覆盖历史。

普通旁白过长不属于立即人工阻断。Daily Auto Mode 必须先生成 Timing Budget，自动精简，最多修订 2 轮；正式 TTS 后只重新生成变化段落且每镜最多 2 次。
