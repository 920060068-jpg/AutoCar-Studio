# Daily Recovery Pipeline

## 入口

执行 `npm run daily:check`，只检查本地日期。今日已完成不动作；12:00 前等待；12:00 后未开始则补做；昨天普通日更不回填。

## 恢复

1. 读取 `database/daily_production_state.json`。
2. 校验当前记录唯一、checkpoint 存在、JSON 可解析、日期/job_id/阶段/SHA-256 一致。
3. 检查 `database/.daily-production.lock`，存在时禁止第二实例。
4. 从 `last_successful_stage` 的下一阶段继续；若为 `audio_blocked`，保持 Picture Lock 并从 narration 继续。
5. 复用付费 API 成功回执和素材 SHA-256，不重复调用或下载。
6. 写入新的 stage_run_id、retry 序号、checkpoint 和日志，不覆盖旧 revision。

Audio 恢复优先从 Audio Preflight、Measured Fit 或失败镜头继续。成功的 MiniMax 请求必须按请求指纹和输出 SHA-256 复用；只允许对文案或参数已变化的镜头重新请求，且保留剩余请求次数。

## 损坏

checkpoint 缺失、损坏或校验不一致时输出 `blocked_invalid_checkpoint` 和 failure report。只有确认数据损坏后才允许建立新 revision；不得默认从头重做。
