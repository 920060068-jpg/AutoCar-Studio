# Roadmap

## 已完成：Permanent Operating System & Daily Automation V1

- 永久文档、统一每日目标、自动审核门禁和严格评分模型。
- daily state、checkpoint、锁、12:00 检查、错过时间补偿和恢复入口。
- Codex App Scheduled task 配置说明与本地模拟测试。

## 当前稳定边界

- MiniMax 稳定配置为 `ready`；实际不可用时不得换声，必须保存 checkpoint 并从 narration 继续。
- 仓库中的热点发现、事实核验、素材取得和完整渲染仍由 Codex 工作流与现有阶段脚本协同执行；控制器不得伪造这些阶段已完成。

## 后续开发规则

V4.0 Stable 核心流程冻结。任何 adapter、校验器或供应商能力扩展都必须在 `feature/*` 分支进行，缺陷修复使用 `fix/*`，发布准备使用 `release/*`。变更必须明确版本号、更新变更记录并通过完整回归测试后才能合并；自动发布仍不在范围内。
