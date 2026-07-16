# AutoCar Studio V4.0 Stable Release Notes

发布日期：2026-07-16（Asia/Shanghai）

## 核心功能

- Daily Auto Mode 每天最多 1 条，本地时间 12:00 启动，错过后只补做当天任务。
- 同日重复任务锁、阶段 checkpoint、失败报告和断点续作。
- Editorial Mode 默认；Press Kit Mode 仅在本地资产权利状态明确时可用。
- Director Score 与 Final Quality Score 均严格 `> 90`，硬门禁失败不得用总分抵消。
- Picture Lock 后视觉冻结；Audio Timing Budget、Audio-Fit Script、数字语义、发音词典、三文本分离和 Audio Preflight 必须在正式 TTS 前完成。
- MiniMax 沉曜男声原生语速校准、请求指纹缓存、只重生变化段落、Measured Audio Fit、最终混音和全量 QC。
- 只生成 Release Candidate，不自动发布。

## 已验证生产案例

- Porsche H1 Deliveries：完成 38.058667 秒 Picture Lock、沉曜男声旁白、Audio/Sync/Subtitle/Technical/Content/Copyright 门禁和最终 Release Candidate；Director Score 93，Final Quality Score 95。
- Xiaomi SkyNomad：验证无外部受限视觉依赖的 Original Editorial Visual Mode。
- Toyota Land Cruiser FJ：验证官方素材的来源、技术质量和版权门禁。

稳定仓库只保留这些案例的精简 fixture，不提交正式 MP4、WAV、大图、缓存或运行 checkpoint。

## 当前限制

- 真正的 12:00 唤醒依赖 Codex Scheduled task 或系统调度器；仓库不能唤醒关机设备或恢复断网。
- 热点发现、来源访问和 MiniMax TTS 仍依赖网络与供应商可用性。
- MiniMax 是唯一旁白供应商，声音固定为 `Chinese (Mandarin)_Gentleman`；无合规替代声音。
- Release Candidate 仍需由人决定是否发布，项目不包含平台发布连接。

## MiniMax 依赖

正式 TTS 只能在 Picture Lock、Audio Preflight、voice_id 映射和 live probe 全部通过后调用。密钥仅从本地 `.env` 读取，禁止进入 Git、日志、manifest 或回复。中断后从 narration checkpoint 恢复，并优先复用请求指纹缓存。

## 默认生产模式

Editorial Mode 是默认模式。没有明确授权的本地 Press Kit 时，自动回退 Original Editorial Visual Mode；不得绕过 403、robots、登录、DRM、签名或水印。

## 已知风险

- 供应商 API、网络、额度或本地渲染环境变化可能阻断后续阶段。
- 车型读法、数字语义和声音速度档案需要随供应商模型变化重新校准。
- 官方素材的公开可见不等于可用授权，权利证据不足必须阻断。
- 运行数据库、checkpoint 和本地产物不进入 Git，恢复依赖本机保留这些文件。

## 后续修改要求

V4.0 Stable 核心流程冻结。新功能使用 `feature/*`，缺陷修复使用 `fix/*`，发布准备使用 `release/*`；必须明确版本号、更新变更记录并通过完整回归测试后才能合并到 `main`。
