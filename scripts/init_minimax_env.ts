import {writeFileSync} from "node:fs";
import {minimaxEnvPath} from "../src/audio/minimax/config.ts";

let input = "";
process.stdin.setEncoding("utf8");
for await (const chunk of process.stdin) input += chunk;

const firstLine = input.trim().split(/\r?\n/u)[0] ?? "";
const apiKey = firstLine.startsWith("MINIMAX_API_KEY=")
  ? firstLine.slice("MINIMAX_API_KEY=".length).trim()
  : firstLine.trim();

if (!apiKey.startsWith("sk-") || apiKey.length < 40) {
  throw new Error("标准输入不是有效的 MiniMax API Key");
}

const contents = [
  `MINIMAX_API_KEY=${apiKey}`,
  "MINIMAX_API_BASE_URL=https://api.minimax.io/v1",
  "MINIMAX_TTS_ENDPOINT=t2a_v2",
  "MINIMAX_GROUP_ID=",
  "MINIMAX_TTS_MODEL=speech-2.8-hd",
  "MINIMAX_VOICE_ID=Chinese (Mandarin)_Gentleman",
  "MINIMAX_VOICE_NAME=沉曜男声",
  "MINIMAX_SPEED=1.16",
  "MINIMAX_VOLUME=1.0",
  "MINIMAX_PITCH=-1",
  "MINIMAX_LANGUAGE_BOOST=Chinese",
  "MINIMAX_AUDIO_FORMAT=mp3",
  "MINIMAX_SAMPLE_RATE=32000",
  "MINIMAX_BITRATE=128000",
  "MINIMAX_CHANNELS=1",
  "MINIMAX_TIMEOUT_MS=120000",
  "",
].join("\n");

writeFileSync(minimaxEnvPath, contents, {encoding: "utf8", flag: "wx", mode: 0o600});
console.log(`CREATED ${minimaxEnvPath} mode=600`);
