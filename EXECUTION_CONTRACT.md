# AutoCar Studio Execution Contract

## 1. 状态与审计

每个阶段必须使用唯一 `job_id`、`stage_run_id` 和 revision，记录输入/输出路径、校验和、规则版本、开始结束时间、重试关系与明确状态。允许状态为 `approved`、`revise`、`retry`、`blocked`、`failed`。禁止覆盖旧产物、空报告、默认值和 `skipped_success`。

Daily Auto Mode 的自动审核是正式门禁，不等于降低标准；Manual Review Mode 仅在用户明确覆盖时启用。

## 2. 强制阶段顺序

`daily_startup_check → hotspot_discovery → historical_deduplication → fact_check → topic_scoring → script → storyboard → narration_timing_budget → audio_fit_script → number_semantic_classification → pronunciation_resolution → tts_text_generation → voice_speed_calibration → static_audio_duration_estimate → audio_preflight → director_review → asset_acquisition → editorial_fallback → picture_render → picture_review → picture_lock → minimax_live_probe → minimax_tts → measured_audio_fit → narration → bgm_sfx → audio_mix → final_render → technical_qc → content_qc → director_post_render_review → release_candidate`

前一阶段未 `approved`，后一阶段不得开始。每阶段失败必须保存 checkpoint 和 failure report。

## 3. 阶段契约

### 3.1 Topic、去重与事实

- 候选至少有一个 `SOURCES.yaml` 允许的可靠核心来源，禁止使用搜索摘要作事实证据。
- 每条事实声明必须映射 `verified_data`；高风险事实必须满足增强核验。
- 核心事实无法核验、来源冲突、事故责任/伤亡/重大召回/监管处罚来源不足时直接 `blocked` 或 `failed`，不得请求普通步骤性确认。

### 3.2 Script 与 Storyboard

- Script 不得新增未核验事实，自动修订最多 2 轮。
- Storyboard 必须符合 `DIRECTOR_BIBLE.md`，每镜有存在理由、事实映射、预览首帧和本地素材/原创视觉计划。
- Storyboard 后必须生成 Narration Timing Budget、Audio-Fit Script 与静态旁白估算；未达到 100% 预计适配不得进入 Director Review。
- Director Review 在正式渲染前执行；Director Score 必须严格大于 90，自动修订最多 3 轮。

### 3.3 Asset 与 Editorial Fallback

- 只有本地、可读取、来源与权利状态可追溯的文件能进入 Manifest；URL 不是资产。
- 需要绕过访问控制或版权为 `prohibited` 时立即停止。
- 没有合法 Press Kit 时自动切换 Original Editorial Visual Mode，不得等待或伪造官方素材。

### 3.4 Picture Review 与 Picture Lock

- Picture Review 必须验证全部镜头、黑帧、字幕边界、未解析变量、重复构图、事实文本、示意标识和 Director Post-render Score。
- 全部通过后自动授予 Picture Lock。锁定后禁止修改 Script、Storyboard、镜头顺序/时长/构图、字幕、verified data 和 Ending。

### 3.5 Audio

- MiniMax 仅能在 Picture Lock 后调用；声音必须是 `chenyao_male` 对应的供应商真实 Voice ID。
- 正式 MiniMax TTS 前必须有 Audio Preflight PASS，包含 Timing Budget、Audio-Fit Script、narration cue sheet、字幕时间草案、Voice Registry、live probe 和静态估算。
- Audio Preflight 必须先完成数字语义分类、项目/全局发音词典解析、独立 `tts_text` 生成与沉曜男声原生 speed 校准；任一未通过不得调用正式 TTS。
- 禁止显示名称直接充当 `voice_id`，禁止相似声音或其他供应商冒充。
- 旁白不要求覆盖全片；允许镜头间有经过标注的自然留白。时序决策严格按自然表达、字幕同步、视觉节奏排序，禁止以 100% 旁白占用率为优化目标。
- 不得为填满时长而增加无信息口播、异常加速、删除必要语义停顿或修改已锁定画面；旁白只需落在批准的时间窗内并与对应字幕同步。
- MiniMax 不可用时保存 checkpoint，标记 `audio_blocked`，保留 Picture Lock，恢复后从 narration 继续。
- 文案相同且参数相同的 TTS 请求必须缓存复用；每镜最多 2 次正式请求。画面时序不得为适配旁白而改变。

### 3.6 Render、QC 与 Release Candidate

- Remotion 持有主时间线；HyperFrames 只提供动态图形包装。
- Render 修复最多 3 轮。损坏文件、缺音频、缺素材或版本不一致均失败。
- 技术 QC、内容 QC 和 Director Post-render Review 必须全部通过；Director Score 与 Final Quality Score 均严格大于 90。
- 仅在 `QUALITY_STANDARD.md` 全部硬门禁通过时生成 `release_candidate.mp4`。
- Release Candidate 不是发布状态；`publishing.auto_publish` 必须保持 `false`。

## 4. 重试与恢复

- 输入、规则或模板变化必须新建 revision；临时错误可使用同一输入增加 retry 序号。
- Script 最多 2 轮、Director 最多 3 轮、Render 最多 3 轮、Audio 最多 3 轮。
- 达到上限后标记 `blocked`，保留证据；条件恢复后从 checkpoint 继续，禁止降低阈值、更换声音或从头重做。

## 5. 日志最小字段

`job_id`、`production_date`、`revision`、`stage`、`stage_run_id`、`started_at`、`finished_at`、`actor`、`input_paths`、`input_checksums`、`rule_versions`、`output_paths`、`output_checksums`、`decision`、`errors`、`retry_of`。

日志不得包含密钥、访问令牌或未脱敏个人信息。
