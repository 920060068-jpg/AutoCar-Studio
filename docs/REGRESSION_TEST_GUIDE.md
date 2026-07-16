# V4 Stable Regression Test Guide

## 入口

```bash
npm run test:regression
```

测试只读取本地配置、规则和精简 fixture，不调用 MiniMax、外部 API、渲染器或发布平台。

## 覆盖范围

回归测试固定覆盖 25 项：永久规则一致性、每日 1 条、12:00、checkpoint 恢复、重复任务锁、两个严格 `> 90` 门禁、Timing Budget、Audio Preflight 顺序、自动精简、变化段落重生、TTS 缓存、自然留白、数量/车型/百分比语义、三文本分离、verified data 不变、MiniMax 中断恢复、原创编辑视觉、访问控制禁绕过、Picture Lock、最终 QC 和 Release Candidate 非发布。

Fixture 位于 `tests/fixtures/`，只能包含精简 YAML/JSON、文本、哈希和期望结果。禁止加入 MP4、WAV、大图、原始素材、密钥或私密授权文件。

## 失败处理

任何回归失败都不得降低阈值或跳过门禁。只修复与稳定基线直接相关的问题，更新版本号和 CHANGELOG；新功能必须在 `feature/*` 分支验证。
