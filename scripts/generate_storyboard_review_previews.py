#!/usr/bin/env python3
"""Generate non-photorealistic storyboard review placeholders from JSON on stdin."""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


WIDTH = 1080
HEIGHT = 1920
BG = "#12151B"
PANEL = "#1C222C"
GRID = "#374151"
WHITE = "#F5F7FA"
MUTED = "#AAB4C3"
ORANGE = "#FF7A1A"
BLUE = "#42A5F5"
SAFE = "#57D39B"
FONT_CANDIDATES = [
    "/System/Library/Fonts/STHeiti Light.ttc",
    "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
    "/Library/Fonts/Arial Unicode.ttf",
]


def font(size: int) -> ImageFont.FreeTypeFont:
    for candidate in FONT_CANDIDATES:
        if Path(candidate).is_file():
            return ImageFont.truetype(candidate, size=size)
    return ImageFont.load_default()


FONTS = {
    "title": font(58),
    "h2": font(38),
    "body": font(31),
    "small": font(25),
    "tiny": font(21),
}


def text_width(draw: ImageDraw.ImageDraw, value: str, selected_font: ImageFont.ImageFont) -> float:
    box = draw.textbbox((0, 0), value, font=selected_font)
    return box[2] - box[0]


def wrap_text(draw: ImageDraw.ImageDraw, value: str, selected_font: ImageFont.ImageFont, max_width: int, max_lines: int) -> list[str]:
    value = " ".join(str(value).split())
    if not value:
        return [""]
    lines: list[str] = []
    current = ""
    for char in value:
        candidate = current + char
        if current and text_width(draw, candidate, selected_font) > max_width:
            lines.append(current)
            current = char
            if len(lines) == max_lines:
                break
        else:
            current = candidate
    if len(lines) < max_lines and current:
        lines.append(current)
    consumed = sum(len(line) for line in lines)
    if consumed < len(value) and lines:
        lines[-1] = lines[-1][:-1] + "…" if len(lines[-1]) > 1 else "…"
    return lines


def draw_multiline(draw: ImageDraw.ImageDraw, xy: tuple[int, int], value: str, selected_font: ImageFont.ImageFont, fill: str, max_width: int, max_lines: int, spacing: int = 10) -> int:
    x, y = xy
    lines = wrap_text(draw, value, selected_font, max_width, max_lines)
    line_height = selected_font.size + spacing
    for index, line in enumerate(lines):
        draw.text((x, y + index * line_height), line, font=selected_font, fill=fill)
    return y + len(lines) * line_height


def dashed_rect(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], fill: str, width: int = 4, dash: int = 18) -> None:
    x1, y1, x2, y2 = box
    for x in range(x1, x2, dash * 2):
        draw.line((x, y1, min(x + dash, x2), y1), fill=fill, width=width)
        draw.line((x, y2, min(x + dash, x2), y2), fill=fill, width=width)
    for y in range(y1, y2, dash * 2):
        draw.line((x1, y, x1, min(y + dash, y2)), fill=fill, width=width)
        draw.line((x2, y, x2, min(y + dash, y2)), fill=fill, width=width)


def arrow(draw: ImageDraw.ImageDraw, start: tuple[int, int], end: tuple[int, int], color: str) -> None:
    draw.line((*start, *end), fill=color, width=10)
    angle = math.atan2(end[1] - start[1], end[0] - start[0])
    length = 34
    for offset in (2.55, -2.55):
        point = (int(end[0] + length * math.cos(angle + offset)), int(end[1] + length * math.sin(angle + offset)))
        draw.line((*end, *point), fill=color, width=10)


def movement_points(direction: str) -> tuple[tuple[int, int], tuple[int, int]]:
    normalized = direction.lower()
    if "left" in normalized and "right" not in normalized:
        return (850, 1040), (230, 1040)
    if "right" in normalized:
        return (230, 1040), (850, 1040)
    if "back" in normalized or "rear" in normalized:
        return (540, 900), (540, 1120)
    if "none" in normalized:
        return (400, 1040), (680, 1040)
    return (540, 1120), (540, 900)


def render_preview(shot: dict, output_path: Path) -> Image.Image:
    image = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(image)

    for x in range(0, WIDTH, 90):
        draw.line((x, 0, x, HEIGHT), fill="#171C24", width=1)
    for y in range(0, HEIGHT, 90):
        draw.line((0, y, WIDTH, y), fill="#171C24", width=1)

    draw.rounded_rectangle((48, 42, 1032, 300), radius=24, fill=PANEL, outline=GRID, width=3)
    draw.text((78, 68), shot["shot_id"], font=FONTS["title"], fill=ORANGE)
    duration = f'{shot["duration_seconds"]}s'
    duration_width = text_width(draw, duration, FONTS["h2"])
    draw.text((990 - duration_width, 82), duration, font=FONTS["h2"], fill=WHITE)
    draw_multiline(draw, (78, 155), shot["purpose"], FONTS["body"], WHITE, 890, 3)

    draw.rounded_rectangle((70, 335, 1010, 1235), radius=30, fill="#151A22", outline=GRID, width=4)
    dashed_rect(draw, (135, 420, 945, 1135), BLUE, width=4)
    draw.rectangle((135, 420, 945, 478), fill="#17334A")
    draw.text((155, 434), "主体保护区 / SUBJECT PROTECTION", font=FONTS["small"], fill=BLUE)

    asset_label = f'素材类型：{shot["asset_type"]}'
    draw.text((165, 545), asset_label, font=FONTS["h2"], fill=WHITE)
    placeholder = "程序化审核占位框｜非真实车辆画面"
    draw_multiline(draw, (165, 630), placeholder, FONTS["h2"], ORANGE, 750, 2)
    draw_multiline(draw, (165, 745), shot["required_content"], FONTS["body"], MUTED, 750, 5)

    start, end = movement_points(str(shot.get("movement_direction", "none")))
    arrow(draw, start, end, ORANGE)
    movement_label = f'预计运镜：{shot["movement_type"]} / {shot["movement_direction"]}'
    draw_multiline(draw, (165, 1155), movement_label, FONTS["small"], ORANGE, 750, 2)

    dashed_rect(draw, (70, 1300, 1010, 1810), SAFE, width=4)
    draw.rectangle((70, 1300, 1010, 1360), fill="#173A31")
    draw.text((92, 1314), f'字幕安全区：{shot["subtitle_safe_area"]}', font=FONTS["small"], fill=SAFE)
    draw_multiline(draw, (115, 1430), shot["subtitle"], FONTS["h2"], WHITE, 850, 4, spacing=16)

    footer = f'Claims: {", ".join(shot.get("claim_ids", [])) or "editorial/no numeric claim"}'
    draw.text((78, 1850), footer, font=FONTS["tiny"], fill=MUTED)
    draw.text((760, 1850), "REVIEW ONLY", font=FONTS["tiny"], fill=ORANGE)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    if output_path.exists():
        raise FileExistsError(f"Refusing to overwrite {output_path}")
    image.save(output_path, format="PNG", optimize=True)
    return image


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--contact-sheet", required=True)
    args = parser.parse_args()

    spec = json.load(sys.stdin)
    shots = spec.get("shots", [])
    if len(shots) != 15:
        raise ValueError(f"Expected 15 shots, got {len(shots)}")

    output_dir = Path(args.output_dir)
    contact_path = Path(args.contact_sheet)
    targets = [output_dir / f'{shot["shot_id"]}.png' for shot in shots]
    existing = [str(path) for path in targets if path.exists()]
    if contact_path.exists():
        existing.append(str(contact_path))
    if existing:
        raise FileExistsError("Refusing to overwrite existing preview files: " + ", ".join(existing))

    images = [render_preview(shot, target) for shot, target in zip(shots, targets)]

    thumb_w, thumb_h = 216, 384
    gap, margin, title_h = 20, 40, 110
    columns = 5
    rows = math.ceil(len(images) / columns)
    sheet_w = margin * 2 + columns * thumb_w + (columns - 1) * gap
    sheet_h = title_h + margin + rows * thumb_h + (rows - 1) * gap + margin
    sheet = Image.new("RGB", (sheet_w, sheet_h), "#0D1117")
    sheet_draw = ImageDraw.Draw(sheet)
    sheet_draw.text((margin, 30), "Xiaomi SkyNomad｜Storyboard Review Contact Sheet｜程序化占位", font=font(34), fill=WHITE)
    for index, image in enumerate(images):
        row, column = divmod(index, columns)
        x = margin + column * (thumb_w + gap)
        y = title_h + row * (thumb_h + gap)
        sheet.paste(image.resize((thumb_w, thumb_h), Image.Resampling.LANCZOS), (x, y))
        sheet_draw.rectangle((x, y, x + thumb_w, y + thumb_h), outline=GRID, width=2)

    contact_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(contact_path, format="JPEG", quality=92, subsampling=0)
    print(json.dumps({
        "status": "PASS",
        "preview_count": len(images),
        "output_dir": str(output_dir),
        "contact_sheet": str(contact_path),
        "real_media_generated": False,
        "network_accessed": False,
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
