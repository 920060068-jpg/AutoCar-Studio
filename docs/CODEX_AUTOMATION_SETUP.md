# Codex Scheduled Task 设置

官方说明：<https://developers.openai.com/codex/app/automations>。

## 能力边界

本地项目 Scheduled task 需要电脑开机、ChatGPT/Codex 桌面 App 正在运行，且项目目录仍存在。仓库脚本不能唤醒关机电脑、关闭的 App 或断网设备。CLI 和 IDE 扩展不能管理 Scheduled；创建、暂停、恢复和查看记录应在桌面 App 的 Scheduled 中完成。

## 创建每日 12:00 任务

1. 在桌面 App 的 Codex 中打开 `/Users/yiqunzhou/AutoCar-Studio`。
2. 新建 Scheduled task，选择该本地项目并选择直接运行在本地项目目录；不要选择隔离 worktree，否则 daily state 与 checkpoint 不会写回主工作区。
3. 选择独立的每日任务，时间设为本地系统时区每天 12:00。保存后在 Scheduled 中核对 Next run 确实是本地 12:00。
4. 权限使用能完成任务的最小范围：项目可写；仅在热点发现、合法素材取得和 MiniMax 阶段按需要开放网络。保持发布平台不可用。
5. 使用下列提示词，先手动测试一次 `daily:check`，不要直接测试整条生产。

## 每日提示词

```text
确认当前项目是 /Users/yiqunzhou/AutoCar-Studio。严格依次读取 AGENTS.md、PROJECT_MEMORY.md、CONFIG.yaml、DAILY_PRODUCTION.md、QUALITY_STANDARD.md、FAILURE_RECOVERY.md、当前 checkpoint 和 database/daily_production_state.json。检查本地日期、系统时区和 Git 状态。执行 npm run daily:check：若今天任务已完成、时间早于12:00或存在其他运行实例则停止；若存在有效中断 checkpoint，则执行 npm run daily:resume，并按输出的 current_stage 继续 workflows/daily_pipeline.md；若当前本地时间已晚于12:00且今天尚未开始，则执行 npm run daily:run，并按输出的 current_stage 继续完整生产。每天最多生成一条 Release Candidate。Daily Auto Mode 中途不询问普通确认。任何硬门禁失败必须停止、保存 checkpoint、生成 failure report。不得发布，不得 Git add、commit 或 push。
```

## 重连/恢复提示词

```text
恢复 AutoCar Studio 当天任务。先读取 AGENTS.md、PROJECT_MEMORY.md、FAILURE_RECOVERY.md、database/daily_production_state.json 和当前 checkpoint，再执行 npm run daily:check。只恢复本地日期对应任务；不得补做昨天普通日更。若今日已完成或存在活动锁则停止；若 checkpoint 有效则执行 npm run daily:resume；若 checkpoint 损坏则标记 blocked_invalid_checkpoint 并生成 failure report。不得从头重做，不重复已成功的付费 API 或素材下载，不改变 Picture Lock，不得发布。
```

## 检查记录、暂停与恢复

- 在桌面 App 左侧 Scheduled 查看 Active、Paused、Completed 和 recent runs；失败项会出现在运行记录中。
- 暂停：打开该 Scheduled task，将状态设为 Paused。暂停调度不会修改项目 checkpoint。
- 恢复：将状态恢复为 Active；若恢复时已过 12:00，应先手动运行重连/恢复提示词完成当日补偿。
- 前几次运行必须检查输出、权限和 Next run；不要把 worktree 中的状态误认为主项目状态。

## 重要限制

Codex Scheduled task 提供 12:00 触发；项目脚本提供幂等检查、每日上限、锁、checkpoint 和补偿判断。二者缺一不可。
