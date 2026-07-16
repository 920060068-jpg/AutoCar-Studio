# Engineering Guide

## 架构边界

- 控制层：`scripts/daily_*.ts`、`database/daily_production_state.json`、`database/checkpoints/`、`logs/daily/`。
- 内容层：`agents/`、`workflows/`、`rules/`、`templates/`、`SOURCES.yaml`。
- 画面层：HyperFrames 仅做动态图形包装；Remotion 持有主时间线、字幕、音频和最终渲染。
- 音频层：`src/audio/minimax/`，只在 Picture Lock 后执行。

## 工程原则

1. 所有路径相对项目根目录；运行时输出不得写入源码目录。
2. 状态文件可更新，但不得覆盖已批准 revision；checkpoint 和失败报告只追加。
3. 外部调用前验证阶段、配置、denylist、幂等键和已有成功记录。
4. 所有本地验证可用 `--now` 或 fixture 模拟时间，禁止修改系统时间。
5. 任何错误都必须显式失败，不得用默认值伪造通过。
6. 未授权不得 Git add、commit、push；不得自动发布。

## 变更验证

运行 `npm run typecheck`、`npm run validate:config`、`npm run test:daily`、`npm run validate:qc`，再做 YAML/JSON、引用路径、冲突文本、`git diff --check` 和 `git status` 检查。

## Revision 与幂等

输入、规则或模板变化必须新建 revision。网络重试可以复用输入，但必须增加 retry 序号。付费 API 成功回执、素材 SHA-256、Picture Lock 校验和和 Final Render 校验和必须进入 checkpoint，恢复时先复用。
