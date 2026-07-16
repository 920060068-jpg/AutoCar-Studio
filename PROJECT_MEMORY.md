# AutoCar Studio Project Memory

## 永久目标

AutoCar Studio 是汽车编辑工作室，不是单纯视频生成器。稳定目标是每天产出 1 条可发布质量的汽车新闻 Release Candidate，同时保持事实可追溯、版权合规、流程可恢复。

## 永久默认值

- 本地系统时区，每天 12:00，最多 1 条。
- 抖音竖屏 1080×1920、30fps、38–45 秒。
- Daily Auto Mode 默认开启；中途自动审核，不等待普通人工确认。
- Director Score 和 Final Quality Score 均必须严格大于 90。
- 只生成 Release Candidate，绝不自动发布。
- 默认为 Editorial Mode；只有本地存在明确授权资产时才能进入 Press Kit Mode，合法媒体不足时自动回退 Original Editorial Visual Mode。
- 任何图片或视频制作前先生成预览图，预览图作为首帧参考。

## MiniMax 永久约束

- 旁白供应商必须是 MiniMax，逻辑声音 `chenyao_male`，显示名称“沉曜男声”。
- 供应商 `voice_id=Chinese (Mandarin)_Gentleman`；显示名称不得直接作为 Voice ID，不得用其他声音冒充。
- 旁白不必覆盖全片；允许镜头间存在有意图的自然留白。时间分配优先级固定为：自然表达 → 字幕同步 → 视觉节奏，禁止以 100% 旁白占用率作为目标或通过加速、填词消灭留白。
- Picture Lock 前必须生成项目专用 Narration Timing Budget、Audio-Fit Script、静态时长估算、字幕时间草案和 Audio Preflight 记录。正式 MiniMax TTS 只能在 `audio_preflight_pass: true` 后执行。
- Daily Auto Mode 可在不改变 verified data、核心事实和结论方向的前提下自动精简旁白、调整标点和更新字幕；最多自动修订 2 轮。普通旁白过长不得直接等待人工授权。
- 正式 TTS 必须按请求指纹缓存复用；文案和参数相同不得重复调用。每镜最多 2 次正式请求，只重新生成文案发生变化或缓存不可复用的段落。
- 后期音频变速超过 1.15 倍直接失败；每镜保留至少 0.15 秒安全余量。
- 正式 TTS 前必须把全部数字按语义分类，并分别维护 `display_text`、`narration_text`、`tts_text`。发音优化只允许写入 `tts_text`，不得反写 verified data 或画面数字。
- 全局发音词典为 `config/pronunciation_dictionary.yaml`，声音与语速档案为 `config/voice_registry.yaml`。车型代号必须按品牌语境匹配；保时捷 `911` 读作“九一一”，普通数量 `911` 仍读作“九百一十一”。
- 沉曜男声的项目原生速度安全范围为 1.08–1.20，默认校准值为 1.16；每条视频按句长、窗口、标点、数字密度和语义复杂度校准。禁止用后期机械变速代替正式 TTS 速度参数。
- 稳定配置的 MiniMax 服务状态为 `ready`，实际运行状态仍必须以当天 state、Audio Preflight 和 live probe 为准。不得在 Picture Lock 前调用；不可用时保持 Picture Lock，状态设为 `audio_blocked`，从 narration checkpoint 恢复。
- 项目当前原生实现从根目录 `.env` 读取配置；`.env` 和密钥不得进入 Git、日志或回复。

## 恢复原则

电脑、Codex、网络、API、渲染或进程异常后，只检查当天任务。今天未完成则从最后成功 checkpoint 继续；不补做昨天的普通日更，不并行启动同一天的第二个任务，不重复已成功的付费 API 或素材下载。

Audio Preflight 或 Measured Audio Fit 失败时，checkpoint 必须记录 timing budget、audio-fit script、已生成音频、每段请求参数、实际时长、失败镜头和剩余重试次数；恢复从 audio-fit 阶段继续，不从选题或画面重做。

## 能力边界

项目脚本负责状态、锁、checkpoint、补偿判断和恢复入口。真正的 12:00 唤醒依赖 Codex App Scheduled task 或系统调度器；仓库文件不能唤醒关机电脑、关闭的 App 或断网设备。

## 权威入口

配置以 `CONFIG.yaml` 为准，流程以 `DAILY_PRODUCTION.md` 与 `EXECUTION_CONTRACT.md` 为准，质量以 `QUALITY_STANDARD.md` 为准，恢复以 `FAILURE_RECOVERY.md` 为准。旧任务对话不得成为唯一规则来源。

## V4.0 Stable 冻结规则

V4.0 Stable 核心流程冻结。禁止直接在 `main` 上试验新功能；后续开发必须使用 `feature/*`、`fix/*` 或 `release/*` 分支，明确版本号并通过 `npm run test:regression` 后才能合并。稳定基线只生成 Release Candidate，不包含自动发布。
