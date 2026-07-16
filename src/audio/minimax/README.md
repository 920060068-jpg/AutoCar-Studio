# MiniMax 原生 TTS

本目录是 AutoCar Studio 自有的 MiniMax HTTP T2A 实现，不引用旧项目、外部适配器、Keychain 或 `work/minimax.env`。全部 MiniMax 调用参数只从项目根目录 `.env` 读取；代码主动忽略进程中的 `MINIMAX_*` 变量，防止旧会话覆盖。

## 请求字段

```dotenv
MINIMAX_API_BASE_URL=https://api.minimax.io/v1
MINIMAX_TTS_ENDPOINT=t2a_v2
MINIMAX_TTS_MODEL=speech-2.8-hd
MINIMAX_VOICE_ID=Chinese (Mandarin)_Gentleman
MINIMAX_VOICE_NAME=沉曜男声
MINIMAX_SPEED=1.16
```

- `.env` 必须为权限 `0600`，已由 `.gitignore` 排除。
- `MINIMAX_VOICE_NAME` 是项目逻辑名称；`MINIMAX_VOICE_ID` 是供应商真实 ID，两者不得混用。
- `MINIMAX_SPEED` 只是沉曜男声的本地默认值。正式旁白必须读取 Voice Registry 和项目 Audio Preflight 的逐镜速度，当前安全范围为 1.08–1.20，不得在请求构建时静默回退。
- `npm run minimax:check` 只验证本地配置，不联网、不输出完整 API Key。
- `npm run minimax:tts -- --text "文本" --out <raw.mp3> --wav-out <master.wav> --audit <report.json>` 执行一次真实调用，拒绝覆盖任何输出。

成功响应必须同时满足 HTTP 成功、`base_resp.status_code=0` 和非空十六进制音频。原始 MP3、48 kHz WAV 母版和不含密钥的审计报告必须同时保留。
