# Operations Runbook

## 日常命令

```bash
npm run daily:status
npm run daily:check
npm run daily:run
npm run daily:resume
```

`daily:run` 必须先执行同一套 startup check。12:00 前不启动；今日已完成不重复；存在有效 checkpoint 时只恢复。用户明确要求不制作当天视频时禁止执行 `daily:run` 和 `daily:resume`。

控制脚本负责创建/更新 state、startup checkpoint、锁和下一阶段指令，不会伪造内容阶段已完成。运行它的 Codex Scheduled task 必须根据输出的 `current_stage` 继续执行 `workflows/daily_pipeline.md`，并在每个真实阶段成功后写入新 checkpoint。

## 故障处理

- `locked`：停止，禁止第二实例。
- `blocked_invalid_checkpoint`：检查 checkpoint 文件、日期、阶段和 SHA-256，不得猜测。
- `audio_blocked`：保持 Picture Lock，MiniMax 恢复后执行 `daily:resume`。
- 磁盘不足、Remotion/FFmpeg 崩溃、文件损坏：保存 failure report，修复环境后从 checkpoint 恢复。

## 时间模拟

不得修改系统时间。使用：

```bash
npm run daily:check -- --now 2026-07-14T11:59:00+08:00 --state examples/daily_states/empty.json
npm run daily:check -- --now 2026-07-14T12:01:00+08:00 --state examples/daily_states/empty.json
npm run test:daily
```

## 发布

最高自动状态为 `release_candidate`。发布连接、上传、定时发布和模拟点击全部禁止；任何真实发布都需要新的明确任务。
