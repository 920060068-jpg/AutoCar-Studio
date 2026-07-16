#!/usr/bin/env python3
"""Generate a review-only contact sheet for blocked asset candidates."""

from pathlib import Path
from textwrap import wrap

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output/xiaomi_skynomad_20260714_r1/asset_acquisition_r1/asset_candidate_contact_sheet_r2.jpg"
FONT_PATH = "/System/Library/Fonts/STHeiti Light.ttc"

ITEMS = [
    ("shot_01", "ar_xm_001", "前45度动态 Hero Shot", "官网/官方微博无获准下载原片"),
    ("shot_02", "ar_xm_002", "侧前/侧后名称揭示", "指定微博需 visitor 验证，身份与授权未核实"),
    ("shot_03", "ar_xm_003", "官方发布车辆动态", "事实来源已确认，但只有正文/静态附件"),
    ("shot_04", "ar_xm_004", "座舱广角连续运动", "官网 MP4 403；微博只有播放器"),
    ("shot_05", "ar_xm_005", "SU7/YU7 + 澎程双系列动态", "两组独立原始片段均缺失"),
    ("shot_07", "ar_xm_007", "昆仑架构/设计开发视频", "没有连续工程视频，禁止静态替代"),
    ("shot_08", "ar_xm_008", "纯平地板低机位横移", "无可下载原片，无法技术确认"),
    ("shot_09", "ar_xm_009", "长滑轨完整移动动作", "无法确认起点、过程、终点"),
    ("shot_10", "ar_xm_010", "多人/行李/驻车空间切换", "无原片；人物肖像范围未确认"),
    ("shot_11", "ar_xm_011", "整车与座舱机构细节", "技术、语义和版权三项均无文件证据"),
    ("shot_12", "ar_xm_012", "工程验证或装配动态", "官方播放器不可抓流，且不得伪装独立验证"),
    ("shot_14", "ar_xm_014", "独立结尾 Hero Shot", "无授权证明且无法核对独立时间段"),
    ("shot_15", "ar_xm_015", "车辆远离/摄影机后拉", "无合法下载远景视频"),
]


def font(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_PATH, size)


def draw_wrapped(draw: ImageDraw.ImageDraw, text: str, xy: tuple[int, int], width: int,
                 text_font: ImageFont.FreeTypeFont, fill: str, spacing: int = 8) -> int:
    x, y = xy
    lines = []
    for paragraph in text.splitlines() or [""]:
        lines.extend(wrap(paragraph, width=width, break_long_words=True) or [""])
    for line in lines:
        draw.text((x, y), line, font=text_font, fill=fill)
        bbox = draw.textbbox((x, y), line or "占", font=text_font)
        y += bbox[3] - bbox[1] + spacing
    return y


def main() -> None:
    width, height = 1920, 2000
    background = "#0B0F14"
    image = Image.new("RGB", (width, height), background)
    draw = ImageDraw.Draw(image)

    draw.text((70, 48), "Xiaomi SkyNomad｜真实媒体候选 Contact Sheet", font=font(46), fill="#F4F7FA")
    draw.text((72, 108), "13 项真实媒体请求｜本地文件 0｜版权通过 0｜Manifest BLOCKED", font=font(26), fill="#F0B85A")

    columns = 3
    gap = 24
    margin_x = 54
    top = 168
    tile_width = (width - margin_x * 2 - gap * (columns - 1)) // columns
    tile_height = 318

    for index, (shot_id, request_id, need, reason) in enumerate(ITEMS):
        row, column = divmod(index, columns)
        x0 = margin_x + column * (tile_width + gap)
        y0 = top + row * (tile_height + gap)
        x1 = x0 + tile_width
        y1 = y0 + tile_height

        draw.rounded_rectangle((x0, y0, x1, y1), radius=18, fill="#151B23", outline="#384352", width=2)
        draw.rounded_rectangle((x0 + 18, y0 + 18, x0 + 166, y0 + 60), radius=10, fill="#7D2630")
        draw.text((x0 + 32, y0 + 25), "BLOCKED", font=font(22), fill="#FFFFFF")
        draw.text((x0 + 190, y0 + 22), shot_id, font=font(30), fill="#FFFFFF")
        draw.text((x0 + 22, y0 + 78), request_id, font=font(20), fill="#8190A5")
        draw.text((x0 + 22, y0 + 112), "素材需求", font=font(20), fill="#F0B85A")
        next_y = draw_wrapped(draw, need, (x0 + 22, y0 + 142), 22, font(23), "#E7EDF5", 7)
        draw.text((x0 + 22, next_y + 8), "阻断原因", font=font(20), fill="#F0B85A")
        draw_wrapped(draw, reason, (x0 + 22, next_y + 38), 25, font(20), "#B9C4D2", 6)
        draw.text((x1 - 182, y1 - 34), "NO LOCAL FILE", font=font(18), fill="#D66A74")

    footer_y = height - 62
    draw.line((54, footer_y - 18, width - 54, footer_y - 18), fill="#384352", width=2)
    draw.text((58, footer_y), "禁止：登录/验证码绕过、抓流、改 UA 绕过 403、静态图凑镜头、放宽版权门禁", font=font(22), fill="#9BA8B8")

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    image.save(OUTPUT, format="JPEG", quality=92, subsampling=0)
    print(OUTPUT.relative_to(ROOT))


if __name__ == "__main__":
    main()
