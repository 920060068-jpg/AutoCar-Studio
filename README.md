# AutoCar-Studio
AI-powered Automotive News Video Studio

# AutoCar Studio V4.0 Stable

AutoCar Studio 是面向抖音竖屏内容的 AI 汽车编辑工作室。V4.0 Stable 每天本地时间 12:00 最多生产 1 条 38–45 秒 Release Candidate，支持自动门禁、checkpoint 和错过时间后的当天恢复。版本状态见 [VERSION.md](VERSION.md)。

## 默认生产参数

- 平台：抖音
- 画布：1080 × 1920，9:16，30 fps
- 时长：38–45 秒
- 产量目标：每天 1 条，本地时间 12:00
- 默认旁白：MiniMax 沉曜男声
- 发布：只生成 Release Candidate，禁止自动发布
- 数字人：HeyGen 仅用于必要的主持镜头

权威默认值见 [CONFIG.yaml](CONFIG.yaml)，新闻来源要求见 [SOURCES.yaml](SOURCES.yaml)。

## 必读顺序

1. [AGENTS.md](AGENTS.md)
2. [PROJECT_MEMORY.md](PROJECT_MEMORY.md)
3. [CONFIG.yaml](CONFIG.yaml)
4. [DAILY_PRODUCTION.md](DAILY_PRODUCTION.md)
5. [QUALITY_STANDARD.md](QUALITY_STANDARD.md)
6. [FAILURE_RECOVERY.md](FAILURE_RECOVERY.md)
7. 当前 checkpoint 与 `database/daily_production_state.json`
8. [EXECUTION_CONTRACT.md](EXECUTION_CONTRACT.md)、[SOURCES.yaml](SOURCES.yaml) 及匹配工作流

## Foundation 已包含

- 精炼的代理治理入口和阶段执行契约
- 编辑、事实、素材、版权、音频、渲染、发布与质量规则
- 日常、突发、审核和发布工作流
- 选题、脚本、分镜、素材清单和 QC 模板
- 不访问外部网络的 TypeScript 本地验证脚本
- HyperFrames 与 Remotion 的源码边界说明
- 八类本地镜头库规划和六套品牌编辑视觉参考
- 素材 schema v2、Audio Director 和媒体生产规划工作流
- Motion Plan、Render Config 和九阶段渲染架构工作流
- 最小 Remotion Composition、Scene、Shot、Caption、AudioTrack 代码结构
- HyperFrames Motion Registry 契约、纯合成测试输入和环境检查脚本

## 本地验证

脚本要求 Node.js 24 LTS。

```bash
node --experimental-strip-types scripts/validate_config.ts
node --experimental-strip-types scripts/environment_check.ts
node --experimental-strip-types scripts/deduplicate_topics.ts
node --experimental-strip-types scripts/validate_storyboard.ts
node --experimental-strip-types scripts/validate_assets.ts
node --experimental-strip-types scripts/qc.ts data/qc.sample.yaml --schema-only
npm run daily:status
npm run daily:check
npm run test:regression
npm run validate:baseline
```

这些脚本只读取本地 YAML 和文件。`scripts/deduplicate_topics.ts` 默认把结果输出到标准输出；只有显式传入 `--output` 时才新建文件，且拒绝覆盖已有文件。

## 原生 MiniMax TTS

MiniMax 参数只从项目根目录 `.env` 读取，不再使用 Keychain、旧项目适配器或外部 `work/minimax.env`。`.env` 已被 Git 忽略且必须使用 `0600` 权限。

```bash
npm run minimax:check
npm run minimax:tts -- --text "测试文本" --out output/audio/test.mp3 --wav-out output/audio/test.wav --audit output/audio/test.json
```

## 调度边界

- 仓库负责状态、锁、checkpoint、检查和恢复入口。
- 真正的 12:00 触发依赖 Codex App Scheduled task 或系统调度器。
- 电脑关机、App 关闭或网络不可用时，仓库不能自行唤醒；重连后由 `daily:check` 补偿。
- 发布平台连接仍不存在，也不得自动发布。

任何成片未通过全部自动质量门禁不得成为 Release Candidate；Release Candidate 不等于已发布。

## Stable 分支规则

`main` 只接受已验证的稳定变更。新功能从 `feature/*` 开始，缺陷修复从 `fix/*` 开始，发布准备从 `release/*` 开始；所有合并必须明确版本号并通过完整回归测试。
