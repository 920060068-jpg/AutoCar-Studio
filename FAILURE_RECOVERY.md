# Failure Recovery

## 原则

任何失败都保存 checkpoint 和 failure report，停止依赖链。恢复只处理本地日期的任务，从最后成功阶段继续；除 checkpoint 损坏外不得从头重启。

## 状态

`not_started`、`running`、`blocked`、`audio_blocked`、`interrupted`、`failed`、`completed`、`release_candidate`。每日状态至少记录 production_date、timezone、scheduled_start_at、actual_start_at、current_stage、last_successful_stage、checkpoint_path、retry_count、blocked_reason、service_status、final_status、output_path、completed_at。

音频 checkpoint 还必须记录 timing budget、audio-fit script、narration cue sheet、字幕时间草案、成功音频路径、请求指纹、请求参数、实际时长、失败镜头、剩余请求次数和 MiniMax 请求总数。

## 恢复顺序

1. 读取本地日期和 `database/daily_production_state.json`。
2. 今日已 `completed` 或 `release_candidate`：停止。
3. 今日为 running/blocked/audio_blocked/interrupted：校验 checkpoint 与校验和，从最后成功阶段恢复。
4. 今日未开始且已过 12:00：启动今天任务。
5. 12:00 前：等待；昨日未完成任务默认不补做。
6. 检查 `database/.daily-production.lock`，禁止同日并行实例。

## 重试

Script 2 轮、Audio-Fit Script 2 轮、Director 3 轮、Render 3 轮、Audio 每镜 2 次正式请求。额度或服务故障不得无限重试。达到上限后保持 `blocked`，条件恢复再续作。

## 幂等与损坏

恢复不得重复已成功付费 API、重复下载已有 SHA-256 素材、覆盖已批准 revision 或改变 Picture Lock。checkpoint 缺失、JSON 损坏、日期/阶段/校验和不匹配时标记 `blocked` 并生成报告，不得猜测恢复点。

Audio 恢复必须先查请求指纹缓存；文案、voice_id、speed、pitch、volume 和标点模式完全相同且输出 SHA-256 存在时必须复用，不得重新请求 MiniMax。

数字语义、发音词典、`tts_text` 或 Voice Registry 变化时必须建立新音频 revision，保留旧 WAV 和失败报告。请求指纹只由真实供应商请求体决定；若校准小样与正式镜头的文本和参数完全一致，正式阶段必须复用该小样。

## Lock

锁使用原子创建，记录日期、run_id、时间和 owner。正常释放与陈旧回收必须归档锁记录，不删除审计证据。重复实例只能返回 `locked`。
