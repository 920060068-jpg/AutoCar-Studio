# V4 Stable Rollback Guide

稳定基线标签：`v4.0.0-stable`。

## 安全回滚原则

先保存当前工作，不删除、不覆盖用户文件。禁止使用 `git reset --hard` 或强制推送。运行数据库、checkpoint、`.env`、输出媒体和日志不受 Git 标签管理，回滚代码前必须确认它们仍在本机。

## 建议流程

```bash
git status --short --branch
git fetch --tags origin
git switch -c fix/recover-v4-stable v4.0.0-stable
npm ci
npm run typecheck
npm run validate:config
npm run test:audio
npm run test:daily
npm run test:regression
npm run validate:baseline
```

这会从标签创建新修复分支，不改写 `main`，也不删除当前工作。若要恢复某个单文件，应在独立修复分支使用非破坏性提交，不要覆盖运行产物。

## 恢复每日任务

代码回滚后先执行 `npm run daily:check`。若返回 `resume`，确认 checkpoint 校验和后使用 `npm run daily:resume`；若返回 `already_complete`，不得重新生产当天视频。
