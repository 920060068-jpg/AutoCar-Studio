import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  absolutePath,
  ensureParent,
  writeTextExclusive,
  type AcquisitionContext,
  type CandidateAssetRecord,
  type ShotSearchTask,
  type TechnicalInspection,
} from "./types.ts";

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function chunks(value: string, length: number, maxLines = 3): string[] {
  const chars = [...value.replace(/\s+/g, " ").trim()];
  const lines: string[] = [];
  for (let index = 0; index < chars.length && lines.length < maxLines; index += length) lines.push(chars.slice(index, index + length).join(""));
  if (chars.length > length * maxLines && lines.length > 0) lines[lines.length - 1] = `${lines[lines.length - 1].slice(0, -1)}…`;
  return lines;
}

function textLines(x: number, y: number, lines: string[], size: number, color: string, lineHeight: number, weight = 400): string {
  return lines.map((line, index) => `<text x="${x}" y="${y + index * lineHeight}" fill="${color}" font-size="${size}" font-weight="${weight}" font-family="Hiragino Sans GB, Helvetica Neue, sans-serif">${escapeXml(line)}</text>`).join("\n");
}

function previewPath(context: AcquisitionContext, candidate: CandidateAssetRecord): string {
  return absolutePath(join("assets", "brands", context.brandKey, "previews", `${candidate.assetId}_preview.jpg`));
}

export function createPreview(context: AcquisitionContext, candidate: CandidateAssetRecord): string | null {
  const input = absolutePath(candidate.localPath);
  if (!existsSync(input)) return null;
  const output = previewPath(context, candidate);
  if (existsSync(output)) return output;
  ensureParent(output);
  try {
    if (candidate.mediaType === "image") {
      execFileSync("sips", ["-Z", "720", "-s", "format", "jpeg", input, "--out", output], { encoding: "utf8", timeout: 30_000 });
    } else if (candidate.mediaType === "video") {
      execFileSync("ffmpeg", ["-v", "error", "-ss", "0", "-i", input, "-frames:v", "1", "-vf", "scale=720:-2", "-q:v", "2", output], { encoding: "utf8", timeout: 60_000 });
    } else {
      return null;
    }
    return existsSync(output) ? output : null;
  } catch {
    return null;
  }
}

function embeddedPreview(path: string | null): string | null {
  if (!path || !existsSync(path)) return null;
  return `data:image/jpeg;base64,${readFileSync(path).toString("base64")}`;
}

function card(
  context: AcquisitionContext,
  task: ShotSearchTask,
  candidate: CandidateAssetRecord | null,
  inspection: TechnicalInspection | null,
  index: number,
): string {
  const columns = 3;
  const cardWidth = 590;
  const cardHeight = 430;
  const gap = 24;
  const x = 52 + (index % columns) * (cardWidth + gap);
  const y = 210 + Math.floor(index / columns) * (cardHeight + gap);
  const status = candidate?.status ?? "missing_real_asset";
  const accent = candidate && !["blocked", "quarantined", "rejected"].includes(candidate.status) ? "#56D6A2" : "#E06C75";
  const preview = candidate ? embeddedPreview(createPreview(context, candidate)) : null;
  const clipId = `clip_${index}`;
  const parts = [
    `<defs><clipPath id="${clipId}"><rect x="${x + 20}" y="${y + 72}" width="550" height="150" rx="12"/></clipPath></defs>`,
    `<rect x="${x}" y="${y}" width="${cardWidth}" height="${cardHeight}" rx="20" fill="#101923" stroke="#2B3A4A" stroke-width="2"/>`,
    `<rect x="${x}" y="${y}" width="10" height="${cardHeight}" rx="5" fill="${accent}"/>`,
    `<text x="${x + 24}" y="${y + 45}" fill="#FFFFFF" font-size="28" font-weight="700" font-family="Hiragino Sans GB, Helvetica Neue, sans-serif">${escapeXml(task.shotId)}</text>`,
    `<text x="${x + cardWidth - 20}" y="${y + 43}" text-anchor="end" fill="${accent}" font-size="20" font-weight="700" font-family="Hiragino Sans GB, Helvetica Neue, sans-serif">${escapeXml(status)}</text>`,
  ];
  if (preview) {
    parts.push(`<image href="${preview}" x="${x + 20}" y="${y + 72}" width="550" height="150" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clipId})"/>`);
  } else {
    parts.push(`<rect x="${x + 20}" y="${y + 72}" width="550" height="150" rx="12" fill="#172433" stroke="#3A4B5E" stroke-dasharray="10 8"/>`);
    parts.push(`<text x="${x + 295}" y="${y + 155}" text-anchor="middle" fill="#8293A6" font-size="24" font-family="Hiragino Sans GB, Helvetica Neue, sans-serif">NO APPROVED LOCAL FILE</text>`);
  }
  parts.push(textLines(x + 22, y + 255, chunks(task.requestId, 34, 1), 19, "#91A5BB", 24));
  parts.push(textLines(x + 22, y + 290, chunks(task.requiredContent, 25, 2), 21, "#E7EDF4", 29));
  const technical = inspection ? `${inspection.resolution ?? "unknown"} · ${inspection.technicalStatus}` : "not inspected";
  const license = candidate?.licenseStatus ?? "no local candidate";
  const watermark = candidate?.watermarkStatus ?? "not applicable";
  parts.push(textLines(x + 22, y + 362, [`技术：${technical}`, `版权：${license}`, `水印：${watermark}`], 18, "#AFBDCA", 24));
  return parts.join("\n");
}

export function generateContactSheet(
  context: AcquisitionContext,
  candidates: CandidateAssetRecord[],
  inspections: TechnicalInspection[],
  outputPath: string,
): void {
  const absoluteOutput = absolutePath(outputPath);
  if (existsSync(absoluteOutput)) throw new Error(`禁止覆盖现有 Contact Sheet：${outputPath}`);
  const rows = Math.ceil(context.tasks.length / 3);
  const width = 1890;
  const height = 210 + rows * 454 + 90;
  const svgPath = absoluteOutput.replace(/\.jpe?g$/i, ".svg");
  const cards = context.tasks.map((task, index) => {
    const candidate = candidates.find((item) => item.shotIds.includes(task.shotId)) ?? null;
    const inspection = candidate ? inspections.find((item) => item.localPath === candidate.localPath) ?? null : null;
    return card(context, task, candidate, inspection, index);
  }).join("\n");
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<rect width="${width}" height="${height}" fill="#081019"/>
<text x="52" y="72" fill="#F5F7FA" font-size="44" font-weight="700" font-family="Hiragino Sans GB, Helvetica Neue, sans-serif">MEDIA ACQUISITION · CANDIDATE CONTACT SHEET</text>
<text x="52" y="120" fill="#91A5BB" font-size="25" font-family="Hiragino Sans GB, Helvetica Neue, sans-serif">${escapeXml(context.jobId)} · ${context.tasks.length} real media requests · no render</text>
<text x="52" y="162" fill="#F1B75B" font-size="22" font-family="Hiragino Sans GB, Helvetica Neue, sans-serif">Preview frames are review-only. Missing files are explicit gaps, not synthetic replacements.</text>
${cards}
<text x="52" y="${height - 36}" fill="#7F91A5" font-size="20" font-family="Hiragino Sans GB, Helvetica Neue, sans-serif">禁止绕过登录、验证码、403、签名 URL、DRM 或播放器流；版权无法自动确认时必须阻断。</text>
</svg>\n`;
  writeTextExclusive(svgPath, svg);
  execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "92", svgPath, "--out", absoluteOutput], { encoding: "utf8", timeout: 60_000 });
  if (!existsSync(absoluteOutput)) throw new Error(`Contact Sheet JPG 生成失败：${outputPath}`);
}
