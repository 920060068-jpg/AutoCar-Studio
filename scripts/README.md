# Local Validation Scripts

除明确标注的 MiniMax TTS 命令外，这些 TypeScript 脚本只访问仓库本地文件，不连接网络、不调用供应商、不发布内容，也不覆盖已有输出。

| 脚本 | 作用 |
|---|---|
| `scripts/environment_check.ts` | 只读检查 macOS、Node、npm、FFmpeg 和项目路径；`--strict` 模式在缺项时返回失败。 |
| `scripts/init_minimax_env.ts` | 从标准输入接收 API Key，新建权限为 `0600` 的项目根目录 `.env`；拒绝覆盖。 |
| `scripts/minimax_connection_check.ts` | 只读验证项目 `.env` 中的 MiniMax 原生配置并脱敏输出。 |
| `scripts/minimax_tts.ts` | 经明确授权后调用 MiniMax `t2a_v2`，保存原始音频、48 kHz WAV 母版和审计报告。 |
| `scripts/audio_fit_pipeline.ts` | 生成 Timing Budget、Audio-Fit Script、Audio Preflight、最小化 MiniMax 重生成、Measured Fit、有声审核版和 Audio QC。 |
| `scripts/validate_audio_pipeline.ts` | 验证旁白过长先预估压缩、自然留白、变化段落重生成、checkpoint 复用和 verified data 保护。 |
| `scripts/validate_config.ts` | 验证每日目标、画布、旁白、denylist、自动审核和发布边界。 |
| `scripts/deduplicate_topics.ts` | 对本地主题做标准化和二元字符相似度聚类。 |
| `scripts/validate_storyboard.ts` | 验证镜头字段、连续时间线、首帧、引擎和 HeyGen 限制。 |
| `scripts/validate_assets.ts` | 验证素材存在性、SHA-256、版权证明和供应商限制。 |
| `scripts/check_asset_cache.ts` | 只读检查本地文件 SHA-256 和来源 URL 是否已在缓存或资产库登记；不下载、不写缓存。 |
| `scripts/generate_asset_manifest.ts` | 从已批准 Storyboard、本地资产库和缓存索引确定性生成 Manifest；可用 `--brand <brand>` 限定审计范围，缺素材或占比不合格时输出 `blocked`。 |
| `scripts/qc.ts` | 验证 16 项必检 QC 及报告结构；非 `--schema-only` 模式执行发布硬门禁。 |

运行要求为 Node.js 24 LTS。控制层脚本使用 Node 原生 TypeScript 类型剥离；YAML 检查使用仓库内受限解析器。受限解析器只支持本项目使用的映射、列表和标量，不支持 YAML anchors、tags 或 block scalars。
