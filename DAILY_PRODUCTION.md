# Daily Production

## 调度目标

本地系统时区每天 12:00 开始，38–45 秒、1080×1920、30fps，每天最多 1 条。12:00 前只返回 `wait`；12:00 后今日未完成则立即开始或恢复；昨天任务默认不补做。

## Daily Auto Mode 流程

Daily Startup Check → 今日完成检查 → checkpoint 检查 → 热点发现 → 历史去重 → 事实核验 → 选题评分 → Script Draft → Storyboard Draft → Narration Timing Budget → Audio-Fit Script → Static Audio Duration Estimate → Director Review → 素材采集 → 必要时 Editorial Fallback → Picture Render → 自动 Picture Review → Picture Lock → MiniMax Live Probe → MiniMax TTS → Measured Audio Fit → BGM/SFX → Audio Mix → Final Render → 技术 QC → 内容 QC → Director Post-render Review → Release Candidate。

中途不等待用户确认。系统必须自行决定 `approved`、`revise`、`retry`、`blocked` 或 `failed`。

## 自动批准条件

- Fact Check 仅使用允许来源且无冲突，所有事实映射到 `verified_data`。
- Script 不含未核验事实，Storyboard 与 Director 规则一致。
- Timing Budget、Audio-Fit Script、静态时长估算、字幕时间草案、Voice Registry 与 MiniMax live probe 全部通过，且 `audio_preflight_pass: true`。
- Director Score 严格大于 90。
- Manifest 的本地文件、权利状态和原创示意标识全部通过。
- Picture、Subtitle、Audio、Audio Sync、Render、技术/内容 QC 与版权门禁全部通过。
- Final Quality Score 严格大于 90。

## 自动停止条件

核心事实不可核验、来源冲突、高风险事件证据不足、需要绕过访问控制、版权为 `prohibited`、素材/音频必需但缺失、渲染损坏、Director 或 Final Quality Score 不达标时停止，保存 checkpoint 并生成 failure report。普通旁白过长必须先执行最多 2 轮自动精简和重新估算，不能直接阻断；只有核心事实无法自然表达、两轮后仍不适配、MiniMax/voice_id 不可用、音频损坏或 verified data 冲突时才允许 `audio_blocked`。

## 选题

每天最多批准 1 个题目。评分维度：时效、热度、用户相关性、行业影响、争议性、解释价值、视觉潜力、来源可信度、历史重复度和 38–45 秒可讲清性。至少一个可靠核心来源，关键数据可追溯，不与近期内容重复。禁止把搜索摘要当证据。

## Picture Lock

自动 Picture Review 通过全部镜头、黑帧、字幕边界、变量、重复、事实文本、示意标识和 Director Post-render Score 后授予。锁定后不得修改 Script、Storyboard、镜头顺序/时长/构图、字幕、verified data 和 Ending。

## 旁白时序

旁白不要求铺满全片，镜头间允许经过规划的自然留白。音频适配 Picture Lock 时按“自然表达 → 字幕同步 → 视觉节奏”排序；不得为追求 100% 旁白占用率而加速口播、增加填充句、压缩语义停顿或修改画面时序。

正式 MiniMax TTS 前必须已有项目专用 `narration_timing_budget`、`audio_fit_script`、`narration_cue_sheet`、字幕时间草案和静态适配结果。每镜至少保留 0.15 秒安全余量，后期变速超过 1.15 倍失败。文案和参数相同的请求必须复用缓存，每镜最多 2 次正式请求。

所有数字、日期、百分比、金额、范围、车型代号、产品名和缩写必须在 Audio Preflight 中先做语义分类，再查询项目覆盖与全局发音词典，最后生成独立 `tts_text`。屏幕继续使用 `display_text`，普通旁白使用 `narration_text`；三者不得混写。

沉曜男声必须读取 Voice Registry 的项目原生速度档案。安全范围 1.08–1.20，默认 1.16；若当前声音档案过期或句型差异显著，先生成最短必要小样校准。超出 1.20 前先精简文案，不允许对 WAV 做机械加速。

## 输出

只有 `QUALITY_STANDARD.md` 全部通过时才可生成 `release_candidate.mp4`。该文件只供审核和手动发布准备，不得自动上传。
