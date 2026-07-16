import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import {
  absolutePath,
  relativePath,
  type MediaType,
  type TechnicalInspection,
} from "./types.ts";

interface ProbeStream {
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
  avg_frame_rate?: string;
  r_frame_rate?: string;
  duration?: string;
}

interface ProbeData {
  streams?: ProbeStream[];
  format?: { duration?: string; format_name?: string };
}

function typeForExtension(path: string): MediaType {
  const extension = extname(path).slice(1).toLowerCase();
  if (["jpg", "jpeg", "png", "webp", "tif", "tiff"].includes(extension)) return "image";
  if (["mp4", "mov", "m4v", "webm"].includes(extension)) return "video";
  if (["pdf", "csv", "json", "yaml", "yml"].includes(extension)) return "data";
  return "unknown";
}

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function rational(value: string | undefined): number | null {
  if (!value) return null;
  if (value.includes("/")) {
    const [numerator, denominator] = value.split("/").map(Number);
    if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return null;
    return numerator / denominator;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function cropViability(width: number | null, height: number | null): TechnicalInspection["crop916Viability"] {
  if (!width || !height) return "poor";
  const availableCropWidth = Math.min(width, height * 9 / 16);
  if (height >= 1920 && availableCropWidth >= 1080) return "good";
  if (height >= 1280 && availableCropWidth >= 720) return "conditional";
  return "poor";
}

function inspectImage(path: string): Omit<TechnicalInspection, "localPath" | "fileSize" | "sha256"> {
  const reasons: string[] = [];
  let width: number | null = null;
  let height: number | null = null;
  let format: string | null = null;
  try {
    const output = execFileSync("sips", ["-g", "pixelWidth", "-g", "pixelHeight", "-g", "format", path], { encoding: "utf8", timeout: 20_000 });
    width = Number(output.match(/pixelWidth:\s*(\d+)/)?.[1] ?? "") || null;
    height = Number(output.match(/pixelHeight:\s*(\d+)/)?.[1] ?? "") || null;
    format = output.match(/format:\s*(\S+)/)?.[1] ?? extname(path).slice(1).toLowerCase();
  } catch (error) {
    reasons.push(`sips 无法读取图片：${error instanceof Error ? error.message : String(error)}`);
  }
  const crop = cropViability(width, height);
  if (width !== null && height !== null && (width < 2560 || height < 1920)) reasons.push("低于 2560x1920，拒绝作为官方高清静态图候选");
  if (crop === "poor") reasons.push("9:16 裁切后的有效分辨率不足");
  const failed = width === null || height === null || reasons.some((item) => item.includes("拒绝") || item.includes("无法读取"));
  if (!failed) reasons.push("水印、车型主体与主体保护区无法自动确认，必须阻断");
  return {
    mediaType: "image",
    width,
    height,
    resolution: width && height ? `${width}x${height}` : null,
    format,
    fps: null,
    duration: null,
    codec: format,
    audioCodec: null,
    watermarkStatus: "blocked",
    decodeStatus: failed ? "failed" : "not_applicable",
    crop916Viability: crop,
    subjectProtection: "blocked",
    fullScreenUsable: failed ? false : null,
    qualityGrade: failed ? "reject" : null,
    technicalStatus: failed ? "failed" : "blocked",
    reasons,
  };
}

function inspectVideo(path: string): Omit<TechnicalInspection, "localPath" | "fileSize" | "sha256"> {
  const reasons: string[] = [];
  let probe: ProbeData = {};
  try {
    probe = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", path], { encoding: "utf8", timeout: 30_000 })) as ProbeData;
  } catch (error) {
    reasons.push(`ffprobe 无法读取视频：${error instanceof Error ? error.message : String(error)}`);
  }
  const video = probe.streams?.find((stream) => stream.codec_type === "video");
  const audio = probe.streams?.find((stream) => stream.codec_type === "audio");
  const width = video?.width ?? null;
  const height = video?.height ?? null;
  const fps = rational(video?.avg_frame_rate ?? video?.r_frame_rate);
  const durationNumber = Number(video?.duration ?? probe.format?.duration ?? "");
  const duration = Number.isFinite(durationNumber) && durationNumber > 0 ? durationNumber : null;
  let decodeStatus: TechnicalInspection["decodeStatus"] = video ? "passed" : "failed";
  if (video) {
    try {
      execFileSync("ffmpeg", ["-v", "error", "-i", path, "-map", "0:v:0", "-f", "null", "-"], { encoding: "utf8", timeout: 120_000, stdio: ["ignore", "pipe", "pipe"] });
    } catch (error) {
      decodeStatus = "failed";
      reasons.push(`ffmpeg 完整解码失败：${error instanceof Error ? error.message : String(error)}`);
    }
  }
  const crop = cropViability(width, height);
  if (!video) reasons.push("未检测到视频轨");
  if (width !== null && height !== null && (width < 1920 || height < 1080)) reasons.push("低于 1920x1080 视频门禁");
  if (fps !== null && fps < 23) reasons.push("帧率低于 23 fps");
  if (duration === null) reasons.push("无法确认有效时长");
  if (crop === "poor") reasons.push("9:16 裁切后的有效分辨率不足");
  const failed = decodeStatus === "failed" || width === null || height === null || reasons.some((item) => /低于|不足|无法确认/.test(item));
  if (!failed) reasons.push("水印、车型主体与竖屏主体保护无法自动确认，必须阻断");
  return {
    mediaType: "video",
    width,
    height,
    resolution: width && height ? `${width}x${height}` : null,
    format: probe.format?.format_name ?? extname(path).slice(1).toLowerCase(),
    fps,
    duration,
    codec: video?.codec_name ?? null,
    audioCodec: audio?.codec_name ?? null,
    watermarkStatus: "blocked",
    decodeStatus,
    crop916Viability: crop,
    subjectProtection: "blocked",
    fullScreenUsable: failed ? false : null,
    qualityGrade: failed ? "reject" : null,
    technicalStatus: failed ? "failed" : "blocked",
    reasons,
  };
}

export function inspectFile(inputPath: string): TechnicalInspection {
  const path = absolutePath(inputPath);
  if (!existsSync(path) || !statSync(path).isFile()) throw new Error(`素材文件不存在：${inputPath}`);
  const mediaType = typeForExtension(path);
  const base = mediaType === "image"
    ? inspectImage(path)
    : mediaType === "video"
      ? inspectVideo(path)
      : {
        mediaType,
        width: null,
        height: null,
        resolution: null,
        format: extname(path).slice(1).toLowerCase(),
        fps: null,
        duration: null,
        codec: null,
        audioCodec: null,
        watermarkStatus: "blocked" as const,
        decodeStatus: "not_applicable" as const,
        crop916Viability: "blocked" as const,
        subjectProtection: "blocked" as const,
        fullScreenUsable: null,
        qualityGrade: null,
        technicalStatus: "blocked" as const,
        reasons: ["该文件类型无法自动确认，必须阻断"],
      };
  return {
    localPath: relativePath(path),
    fileSize: statSync(path).size,
    sha256: sha256(path),
    ...base,
  };
}

function listFiles(path: string): string[] {
  const absolute = absolutePath(path);
  if (!existsSync(absolute)) throw new Error(`检查路径不存在：${path}`);
  if (statSync(absolute).isFile()) return [relativePath(absolute)];
  const files: string[] = [];
  for (const entry of readdirSync(absolute, { withFileTypes: true })) {
    const child = join(absolute, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(relativePath(child)));
    if (entry.isFile() && typeForExtension(child) !== "unknown") files.push(relativePath(child));
  }
  return files;
}

export function inspectPath(path: string): TechnicalInspection[] {
  return listFiles(path).sort().map(inspectFile);
}
