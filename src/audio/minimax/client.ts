import {Buffer} from "node:buffer";
import type {MinimaxConfig} from "./config.ts";

type T2AResponse = {
  data?: {
    audio?: string;
    status?: number;
  };
  extra_info?: {
    audio_length?: number;
    audio_sample_rate?: number;
    audio_size?: number;
    bitrate?: number;
    usage_characters?: number;
    audio_format?: string;
    audio_channel?: number;
  };
  trace_id?: string;
  base_resp?: {
    status_code?: number;
    status_msg?: string;
  };
};

export type MinimaxTtsResult = {
  audio: Buffer;
  httpStatus: number;
  providerStatusCode: number;
  providerStatusMessage: string;
  traceId: string;
  durationMs: number;
  usageCharacters: number;
  audioSampleRate: number;
  audioSize: number;
  audioFormat: string;
  audioChannels: number;
};

export const buildMinimaxTtsRequest = (text: string, config: MinimaxConfig) => ({
  model: config.model,
  text,
  stream: false,
  language_boost: config.languageBoost,
  output_format: "hex",
  voice_setting: {
    voice_id: config.voiceId,
    speed: config.speed,
    vol: config.volume,
    pitch: config.pitch,
  },
  audio_setting: {
    sample_rate: config.sampleRate,
    bitrate: config.bitrate,
    format: config.audioFormat,
    channel: config.channels,
  },
  subtitle_enable: false,
});

export const synthesizeMinimaxTts = async (
  text: string,
  config: MinimaxConfig,
): Promise<MinimaxTtsResult> => {
  const normalizedText = text.trim();
  if (!normalizedText) throw new Error("TTS 文本不能为空");
  if (normalizedText.length >= 10_000) throw new Error("TTS 文本必须少于 10000 个字符");

  const response = await fetch(config.requestUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildMinimaxTtsRequest(normalizedText, config)),
    signal: AbortSignal.timeout(config.timeoutMs),
  });

  let body: T2AResponse;
  try {
    body = await response.json() as T2AResponse;
  } catch {
    throw new Error(`MiniMax 返回非 JSON 响应：HTTP ${response.status}`);
  }

  const providerStatusCode = body.base_resp?.status_code ?? -1;
  const providerStatusMessage = body.base_resp?.status_msg ?? "missing base_resp";
  if (!response.ok || providerStatusCode !== 0) {
    throw new Error(
      `MiniMax t2a_v2 失败：HTTP ${response.status}，provider ${providerStatusCode} ${providerStatusMessage}`,
    );
  }

  const audioHex = body.data?.audio ?? "";
  if (!audioHex || audioHex.length % 2 !== 0 || !/^[0-9a-f]+$/iu.test(audioHex)) {
    throw new Error("MiniMax t2a_v2 成功响应缺少有效十六进制音频");
  }

  const audio = Buffer.from(audioHex, "hex");
  if (audio.length === 0) throw new Error("MiniMax 返回空音频");

  return {
    audio,
    httpStatus: response.status,
    providerStatusCode,
    providerStatusMessage,
    traceId: body.trace_id ?? "",
    durationMs: body.extra_info?.audio_length ?? 0,
    usageCharacters: body.extra_info?.usage_characters ?? normalizedText.length,
    audioSampleRate: body.extra_info?.audio_sample_rate ?? config.sampleRate,
    audioSize: body.extra_info?.audio_size ?? audio.length,
    audioFormat: body.extra_info?.audio_format ?? config.audioFormat,
    audioChannels: body.extra_info?.audio_channel ?? config.channels,
  };
};
