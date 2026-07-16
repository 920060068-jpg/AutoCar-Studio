import {existsSync, readFileSync, statSync} from "node:fs";
import {dirname, resolve} from "node:path";
import {fileURLToPath} from "node:url";

export type MinimaxConfig = {
  apiKey: string;
  apiBaseUrl: string;
  endpointName: "t2a_v2";
  requestUrl: string;
  groupId: string;
  model: "speech-2.8-hd";
  voiceId: string;
  voiceName: string;
  speed: number;
  volume: number;
  pitch: number;
  languageBoost: string;
  audioFormat: "mp3";
  sampleRate: number;
  bitrate: number;
  channels: 1 | 2;
  timeoutMs: number;
  envFile: string;
};

export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
export const minimaxEnvPath = resolve(projectRoot, ".env");

const parseEnv = (contents: string): Map<string, string> => {
  const values = new Map<string, string>();

  for (const [index, originalLine] of contents.split(/\r?\n/u).entries()) {
    const line = originalLine.trim();
    if (!line || line.startsWith("#")) continue;

    const match = /^(?:export\s+)?([A-Z][A-Z0-9_]*)=(.*)$/u.exec(line);
    if (!match) throw new Error(`.env 第 ${index + 1} 行格式无效`);

    const [, key, rawValue] = match;
    if (values.has(key)) throw new Error(`.env 重复定义 ${key}`);

    let value = rawValue.trim();
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values.set(key, value);
  }

  return values;
};

const requireValue = (values: Map<string, string>, name: string): string => {
  const value = values.get(name)?.trim() ?? "";
  if (!value) throw new Error(`.env 缺少 ${name}`);
  return value;
};

const parseNumber = (values: Map<string, string>, name: string): number => {
  const value = Number(requireValue(values, name));
  if (!Number.isFinite(value)) throw new Error(`${name} 必须是数字`);
  return value;
};

const assertRange = (name: string, value: number, minimum: number, maximum: number): void => {
  if (value < minimum || value > maximum) {
    throw new Error(`${name} 必须在 ${minimum} 到 ${maximum} 之间`);
  }
};

export const maskApiKey = (apiKey: string): string => (
  apiKey.length > 10 ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}` : "<invalid>"
);

export const loadMinimaxConfig = (): MinimaxConfig => {
  if (!existsSync(minimaxEnvPath)) {
    throw new Error(`未找到 ${minimaxEnvPath}；请先运行 npm run minimax:init`);
  }

  const mode = statSync(minimaxEnvPath).mode & 0o777;
  if ((mode & 0o077) !== 0) {
    throw new Error(`.env 权限过宽：当前 ${mode.toString(8)}，必须为 600`);
  }

  // MiniMax 配置只读项目根目录 .env，不读取 process.env，防止旧会话变量覆盖。
  const values = parseEnv(readFileSync(minimaxEnvPath, "utf8"));
  const apiKey = requireValue(values, "MINIMAX_API_KEY");
  if (!apiKey.startsWith("sk-") || apiKey.length < 40) {
    throw new Error("MINIMAX_API_KEY 格式无效");
  }

  const apiBaseUrl = requireValue(values, "MINIMAX_API_BASE_URL").replace(/\/+$/u, "");
  const endpointName = requireValue(values, "MINIMAX_TTS_ENDPOINT");
  if (endpointName !== "t2a_v2") throw new Error("MINIMAX_TTS_ENDPOINT 必须为 t2a_v2");

  const baseUrl = new URL(apiBaseUrl);
  const allowedHosts = new Set(["api.minimax.io", "api-uw.minimax.io"]);
  if (baseUrl.protocol !== "https:" || !allowedHosts.has(baseUrl.hostname)) {
    throw new Error(`拒绝非官方 MiniMax 地址：${baseUrl.origin}`);
  }
  if (baseUrl.search || baseUrl.hash) throw new Error("MINIMAX_API_BASE_URL 不得包含查询参数或片段");

  const model = requireValue(values, "MINIMAX_TTS_MODEL");
  if (model !== "speech-2.8-hd") throw new Error("MINIMAX_TTS_MODEL 必须为 speech-2.8-hd");

  const voiceId = requireValue(values, "MINIMAX_VOICE_ID");
  const voiceName = requireValue(values, "MINIMAX_VOICE_NAME");
  if (voiceId === voiceName || voiceId === "沉曜男声") {
    throw new Error("MINIMAX_VOICE_ID 必须是真实供应商 ID，不能使用逻辑别名");
  }

  const speed = parseNumber(values, "MINIMAX_SPEED");
  const volume = parseNumber(values, "MINIMAX_VOLUME");
  const pitch = parseNumber(values, "MINIMAX_PITCH");
  const sampleRate = parseNumber(values, "MINIMAX_SAMPLE_RATE");
  const bitrate = parseNumber(values, "MINIMAX_BITRATE");
  const channels = parseNumber(values, "MINIMAX_CHANNELS");
  const timeoutMs = parseNumber(values, "MINIMAX_TIMEOUT_MS");

  assertRange("MINIMAX_SPEED", speed, 0.5, 2);
  assertRange("MINIMAX_VOLUME", volume, 0.1, 10);
  assertRange("MINIMAX_PITCH", pitch, -12, 12);
  if (![8000, 16000, 22050, 24000, 32000, 44100].includes(sampleRate)) {
    throw new Error("MINIMAX_SAMPLE_RATE 不受支持");
  }
  if (![32000, 64000, 128000, 256000].includes(bitrate)) {
    throw new Error("MINIMAX_BITRATE 不受支持");
  }
  if (channels !== 1 && channels !== 2) throw new Error("MINIMAX_CHANNELS 只能为 1 或 2");
  assertRange("MINIMAX_TIMEOUT_MS", timeoutMs, 1000, 300000);

  const audioFormat = requireValue(values, "MINIMAX_AUDIO_FORMAT");
  if (audioFormat !== "mp3") throw new Error("当前原生实现要求 MINIMAX_AUDIO_FORMAT=mp3");

  const requestUrl = new URL(`${apiBaseUrl}/${endpointName}`);
  const groupId = values.get("MINIMAX_GROUP_ID")?.trim() ?? "";
  if (groupId) requestUrl.searchParams.set("GroupId", groupId);

  return {
    apiKey,
    apiBaseUrl,
    endpointName,
    requestUrl: requestUrl.toString(),
    groupId,
    model,
    voiceId,
    voiceName,
    speed,
    volume,
    pitch,
    languageBoost: requireValue(values, "MINIMAX_LANGUAGE_BOOST"),
    audioFormat,
    sampleRate,
    bitrate,
    channels,
    timeoutMs,
    envFile: minimaxEnvPath,
  };
};

export const publicMinimaxConfig = (config: MinimaxConfig) => ({
  provider: "minimax",
  configSource: ".env",
  apiKey: maskApiKey(config.apiKey),
  apiBaseUrl: config.apiBaseUrl,
  endpoint: config.endpointName,
  requestUrl: config.requestUrl,
  groupIdConfigured: Boolean(config.groupId),
  model: config.model,
  voiceName: config.voiceName,
  voiceId: config.voiceId,
  speed: config.speed,
  volume: config.volume,
  pitch: config.pitch,
  languageBoost: config.languageBoost,
  audioFormat: config.audioFormat,
  sampleRate: config.sampleRate,
  bitrate: config.bitrate,
  channels: config.channels,
  timeoutMs: config.timeoutMs,
});
