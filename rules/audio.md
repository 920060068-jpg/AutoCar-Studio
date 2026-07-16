# 音频规则

## 旁白供应商

- 默认旁白为 MiniMax 沉曜男声。
- 需要其他声音时仍只能使用 MiniMax，并记录人工选择原因。
- 找不到指定音色时必须阻断，不得自动替换相似声音。
- 禁止使用 HyperFrames、Remotion 或 HeyGen 的 TTS 替代主旁白。
- MiniMax 只能通过项目原生 `src/audio/minimax/` 实现调用；所有调用参数只读项目根目录 `.env`，禁止 Keychain、旧项目代码、外部 `.env` 和绝对路径依赖。
- 正式 MiniMax TTS 前必须通过 Audio Preflight：项目专用 Timing Budget、Audio-Fit Script、字幕时间草案、Voice Registry、live probe 和静态估算都必须通过。
- 文案和参数相同的 MiniMax 请求必须按请求指纹复用缓存；每镜最多 2 次正式请求。
- 正式请求必须读取 `config/voice_registry.yaml` 与 `config/pronunciation_dictionary.yaml`，并保存数字语义分类、项目发音覆盖、最终 `tts_text` 和所选原生 speed。
- `display_text`、`narration_text`、`tts_text` 必须分离；只有 `tts_text` 可以替换成中文数字读法，严禁反写画面数字和 verified data。
- 沉曜男声 speed 默认 1.16，安全范围 1.08–1.20。正式请求构建器必须继承项目或逐镜 speed，不得恢复到 `.env` 的旧默认值。

## HeyGen 协作

必要的数字人主持镜头必须使用已生成的 MiniMax 音频驱动口型。HeyGen 不能改写稿件、重新配音或控制整片音频。

## 技术要求

- 保存原始生成文件和统一后的 48 kHz WAV 母版。
- 记录模型、voice ID、语速、音高、生成时间和文本校验和。
- 旁白不必覆盖全片；允许镜头间存在明确规划的自然留白。
- 时序优先级固定为：自然表达 → 字幕同步 → 视觉节奏。禁止把 100% 旁白占用率作为通过条件。
- 禁止为填满时间而增加空话、异常加速、删除语义停顿或修改 Picture Lock；每段旁白只需落入批准窗口。
- 检查削波、断裂、未声明的异常静音、底噪、响度和读音；已在 Audio Plan 标注的自然留白不得误报为异常静音。
- 建议交付目标为约 -16 LUFS、真峰值不高于 -1 dBTP；正式阈值需通过样片校准确认。
- 修改口播文字或音频后，字幕和时间线必须重新生成。
- 每镜至少保留 0.15 秒安全余量；后期音频变速超过 1.15 倍直接失败。普通旁白过长先自动精简，不得先用 MiniMax 试错。
- 所有声音事件与画面的对齐必须遵守 `rules/audio_sync.md`。
