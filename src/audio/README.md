# Audio Intelligence Engine

`src/audio/` 保存声音计划、时间线和混音契约，不保存密钥，也不在当前 Sprint 调用外部服务。

## 模块边界

- `voice/`：旁白文本、情绪、语速、停顿和发音计划。
- `music/`：音乐情绪、版权、段落和旁白避让计划。
- `sfx/`：车辆、环境、转场和界面音效提示点。
- `timeline/`：把声音事件映射到秒和 Remotion 帧。
- `mix/`：层级、响度、峰值和交付前检查。
- `minimax/`：MiniMax 旁白接口预留契约。

数据流为 `Picture Lock -> voice/music/sfx plans -> audio timeline -> Remotion AudioTrack -> audio QC -> automatic review`。任何缺少来源、许可或时间定位的音频都必须标记为 `blocked`。

旁白不需要覆盖整个视频。时间线允许记录 `intentional_silence`，优先保证自然表达，其次保证字幕同步，最后服从视觉节奏；禁止以 100% 语音占用率作为质量目标。
