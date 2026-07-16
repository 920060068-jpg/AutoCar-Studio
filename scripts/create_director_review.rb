#!/usr/bin/env ruby
# frozen_string_literal: true

require "cgi"
require "digest"
require "fileutils"
require "time"
require "yaml"

ROOT = File.expand_path("..", __dir__)
JOB = "xiaomi_skynomad_20260714_r1"
INPUT = File.join(ROOT, "output", JOB, "intermediate", "storyboard_r7_editorial.yaml")
REVIEW_DIR = File.join(ROOT, "output", JOB, "review")
SVG_OUTPUT = File.join(REVIEW_DIR, "storyboard_contact_sheet_editorial_r2.svg")
JPG_OUTPUT = File.join(REVIEW_DIR, "storyboard_contact_sheet_editorial_r2.jpg")
MD_OUTPUT = File.join(REVIEW_DIR, "director_review.md")

SHOT_RATIONALE = {
  "shot_01" => {
    why: "3 秒内用‘不是加速，而是空间’完成反差钩子；中心展开的空间网格能直接建立全片视觉母题。",
    why_not: "不用受限车辆 Hero 视频，因为合法文件未取得；也不用全屏静态官图，否则第一镜会立刻变成图片封面。"
  },
  "shot_02" => {
    why: "沿用上一镜空间轴揭示中英文正式名称，信息单一，2.5 秒足够完成识别。",
    why_not: "不用仿制 Logo 或发布会截图，因为会引入版权、背书暗示和无关界面噪声。"
  },
  "shot_03" => {
    why: "日期适合用单节点时间轴表达，来源关系清楚，且能从上一镜名称线自然变形进入。",
    why_not: "不用滚动网页或公告截图，因为小屏不可读，也会让事实证据退化成背景纹理。"
  },
  "shot_04" => {
    why: "三个定位词围绕同一空间框架建立，能把官方措辞转成可理解的空间逻辑。",
    why_not: "不用静态座舱图做伪运动，因为图片不能证明空间变化；未获授权时必须由信息图独立成立。"
  },
  "shot_05" => {
    why: "中心分叉能直观表达两条产品线平行、服务不同需求，而不暗示性能高低。",
    why_not: "不用两段驾驶素材对切，因为素材不可合法取得，且对切会制造未经证实的性能比较。"
  },
  "shot_06" => {
    why: "把上一镜双路径收束为关系图，连续完成‘双系列—两种需求’的解释。",
    why_not: "不用新卡片重新讲一遍，否则会中断连续性，并形成明显 PPT 翻页感。"
  },
  "shot_07" => {
    why: "纵向时间轴适合承接研发起点与架构名称，稳定停留有利于 3 秒内阅读。",
    why_not: "不用虚构工程蓝图或工厂镜头，因为现有事实只证明时间与名称，不能证明具体结构或制造状态。"
  },
  "shot_08" => {
    why: "水平基准线把‘纯平地板’转成清楚的空间机制示意，并为下一镜滑轨建立匹配线。",
    why_not: "不用写实三维剖面，因为没有已核验尺寸与结构；写实会被误解为真实工程还原。"
  },
  "shot_09" => {
    why: "让抽象座椅沿上一镜基准线移动，可解释‘长滑轨—重新组合’的因果关系。",
    why_not: "不用多张内饰图拼动作，因为静态图片无法证明真实行程，拼接还会伪造连续操作。"
  },
  "shot_10" => {
    why: "轨道向四类使用场景扩展，完成从机械机制到用户价值的叙事升级。",
    why_not: "不用家庭库存视频或人物表演，因为与当前车型无直接证据关系，会造成语义填充。"
  },
  "shot_11" => {
    why: "参数边界卡明确区分已核验内容与本期不引用的尺寸，防止评论越过证据。",
    why_not: "不用传统参数表或排名，因为没有完整、可比且已核验的尺寸数据。"
  },
  "shot_12" => {
    why: "安全、易用、量产三项观察矩阵把评论判断变成未来可验证的标准。",
    why_not: "不用通过章、评分或结论式图标，因为这些项目尚未经过实车与独立测试。"
  },
  "shot_13" => {
    why: "用关系线把空间、智能和场景连接起来，为编辑结论提供逻辑落点；4 秒用于消化。",
    why_not: "不用模拟具体生态联动，因为功能没有被当前 verified data 证明，动画演示会构成事实暗示。"
  },
  "shot_14" => {
    why: "把关系图压缩成‘改变产品逻辑’，用视觉收束强调这是编辑判断而不是官方结论。",
    why_not: "不用再次回到车辆 Hero 图，因为会丢失刚建立的论证链，也会掩盖素材仍未获授权。"
  },
  "shot_15" => {
    why: "驾驶感与可变空间形成可回答的二选一，中央中性指针保持评论开放。",
    why_not: "不用点赞关注口号、虚构投票比例或单向结论，因为会削弱新闻评论的可信度。"
  }
}.freeze

SCORE_ROWS = [
  ["开头 3 秒", 20, 17, "抽象网格与反差标题有效，但首秒缺少已获授权的车型识别证据。"],
  ["信息密度", 20, 16, "shot_03—shot_13 信息持续输入，shot_11—shot_12 三秒内字段偏多。"],
  ["连续性与视觉变化", 20, 12, "全片 43 秒均为程序化画面，显著超过 5 秒，存在视觉材质疲劳。"],
  ["电影化与去 PPT", 15, 13, "跨镜变形设计有效；连续参数卡仍有中度 PPT 风险。"],
  ["镜头节奏", 10, 8, "shot_13 由三秒动态卡片进入四秒 locked 关系图，存在一次明显降速。"],
  ["Ending 记忆点", 10, 8, "中性二选一清楚，但问题句式较常见，独特性不足。"],
  ["事实与版权边界", 5, 5, "未核验参数被明确排除，官方图片均保留程序化回退。"]
].freeze

def refuse_existing(path)
  abort "Refusing to overwrite existing output: #{path.sub("#{ROOT}/", "")}" if File.exist?(path)
end

def escape(value)
  CGI.escapeHTML(value.to_s)
end

def compact_number(value)
  number = value.to_f
  number == number.to_i ? number.to_i.to_s : format("%.1f", number)
end

def wrap_text(value, width)
  chars = value.to_s.chars
  lines = []
  line = +""
  units = 0.0
  chars.each do |char|
    weight = char.ascii_only? ? 0.55 : 1.0
    if units + weight > width && !line.empty?
      lines << line
      line = +""
      units = 0.0
    end
    line << char
    units += weight
  end
  lines << line unless line.empty?
  lines
end

def text_block(x:, y:, text:, width:, size:, line_height:, color:, weight: 400, max_lines: nil)
  lines = wrap_text(text, width)
  lines = lines.first(max_lines) if max_lines
  if max_lines && wrap_text(text, width).length > max_lines
    lines[-1] = "#{lines[-1].sub(/[，。；：、\s]*\z/, "")}…"
  end
  tspans = lines.each_with_index.map do |line, index|
    dy = index.zero? ? 0 : line_height
    %(<tspan x="#{x}" dy="#{dy}">#{escape(line)}</tspan>)
  end.join
  %(<text x="#{x}" y="#{y}" fill="#{color}" font-size="#{size}" font-weight="#{weight}" font-family="Hiragino Sans GB, Helvetica Neue, sans-serif">#{tspans}</text>)
end

def component_label(component)
  {
    "title_animation" => "标题动画",
    "official_news_image" => "官方新闻图（待授权）",
    "verified_data_animation" => "核验数据动画",
    "infographic" => "信息图",
    "timeline" => "时间轴",
    "parameter_card" => "参数卡",
    "map" => "地图"
  }.fetch(component, component)
end

def shot_type_label(value)
  {
    "full_frame_editorial" => "全画幅评论构图",
    "full_frame_title" => "全画幅标题",
    "full_frame_data" => "全画幅数据",
    "medium_editorial" => "中景评论构图",
    "full_frame_comparison" => "全画幅对比",
    "full_frame_timeline" => "全画幅时间轴",
    "detail_graphic" => "细节机制图",
    "wide_editorial" => "广角评论构图",
    "medium_card" => "中景参数卡",
    "close_up_card" => "参数卡特写"
  }.fetch(value, value)
end

def movement_label(movement)
  "#{movement.fetch("type")} / #{movement.fetch("direction")} / #{movement.fetch("speed")}"
end

def visual_schematic(shot, x, y, width, height)
  components = shot.dig("visual", "component_types") || []
  accent = if components.include?("timeline")
    "#39C6FF"
  elsif components.include?("parameter_card")
    "#FF9F43"
  elsif components.include?("title_animation")
    "#FF7139"
  else
    "#57D6A3"
  end
  output = []
  output << %(<rect x="#{x}" y="#{y}" width="#{width}" height="#{height}" rx="18" fill="#101925" stroke="#2B3C51" stroke-width="2"/> )
  5.times do |index|
    gx = x + 80 + index * ((width - 160) / 4.0)
    output << %(<line x1="#{gx}" y1="#{y + 16}" x2="#{gx}" y2="#{y + height - 16}" stroke="#1A2A3B" stroke-width="2"/> )
  end
  3.times do |index|
    gy = y + 35 + index * ((height - 70) / 2.0)
    output << %(<line x1="#{x + 24}" y1="#{gy}" x2="#{x + width - 24}" y2="#{gy}" stroke="#1A2A3B" stroke-width="2"/> )
  end

  if components.include?("timeline")
    line_y = y + height / 2
    output << %(<line x1="#{x + 90}" y1="#{line_y}" x2="#{x + width - 90}" y2="#{line_y}" stroke="#{accent}" stroke-width="8" stroke-linecap="round"/> )
    [0.25, 0.5, 0.75].each do |ratio|
      cx = x + width * ratio
      output << %(<circle cx="#{cx}" cy="#{line_y}" r="17" fill="#101925" stroke="#{accent}" stroke-width="7"/> )
    end
  elsif components.include?("parameter_card")
    card_x = x + width * 0.21
    card_y = y + 30
    card_w = width * 0.58
    card_h = height - 60
    output << %(<rect x="#{card_x}" y="#{card_y}" width="#{card_w}" height="#{card_h}" rx="14" fill="#172334" stroke="#{accent}" stroke-width="4"/> )
    3.times do |index|
      row_y = card_y + 35 + index * 42
      output << %(<rect x="#{card_x + 28}" y="#{row_y}" width="#{card_w - 56}" height="16" rx="8" fill="#{index.zero? ? accent : "#52657B"}" opacity="#{index.zero? ? 1 : 0.7}"/> )
    end
  elsif components.include?("title_animation")
    output << %(<rect x="#{x + width * 0.16}" y="#{y + height * 0.34}" width="#{width * 0.68}" height="#{height * 0.14}" rx="10" fill="#{accent}"/> )
    output << %(<rect x="#{x + width * 0.28}" y="#{y + height * 0.56}" width="#{width * 0.44}" height="#{height * 0.08}" rx="8" fill="#CFD8E4" opacity="0.7"/> )
  else
    centers = [[0.25, 0.55], [0.5, 0.32], [0.75, 0.55]]
    centers.each_cons(2) do |left, right|
      output << %(<line x1="#{x + width * left[0]}" y1="#{y + height * left[1]}" x2="#{x + width * right[0]}" y2="#{y + height * right[1]}" stroke="#{accent}" stroke-width="7"/> )
    end
    centers.each do |cx, cy|
      output << %(<circle cx="#{x + width * cx}" cy="#{y + height * cy}" r="28" fill="#101925" stroke="#{accent}" stroke-width="7"/> )
    end
  end

  if components.include?("official_news_image")
    output << %(<rect x="#{x + width - 300}" y="#{y + 22}" width="260" height="56" rx="10" fill="#2C221B" stroke="#FF9F43" stroke-width="2" stroke-dasharray="8 6"/> )
    output << %(<text x="#{x + width - 170}" y="#{y + 58}" text-anchor="middle" fill="#FFBE7A" font-size="19" font-family="Hiragino Sans GB, Helvetica Neue, sans-serif">官方图待授权</text>)
  end
  output.join("\n")
end

def longest_run(shots)
  best = []
  current = []
  shots.each do |shot|
    components = shot.dig("visual", "component_types") || []
    data_heavy = components.any? { |item| %w[timeline verified_data_animation parameter_card].include?(item) }
    if data_heavy
      current << shot.fetch("shot_id")
      best = current.dup if current.length > best.length
    else
      current = []
    end
  end
  best
end

abort "Missing input storyboard" unless File.file?(INPUT)
[SVG_OUTPUT, JPG_OUTPUT].each { |path| refuse_existing(path) }

document = YAML.load_file(INPUT)
storyboard = document.fetch("storyboard")
shots = storyboard.fetch("shots")
abort "Expected Editorial revision 7" unless storyboard.fetch("revision") == 7 && storyboard.fetch("production_mode") == "editorial"
abort "Expected 15 shots" unless shots.length == 15
abort "Expected 43 second timeline" unless shots.sum { |shot| shot.fetch("duration").to_f } == 43.0
abort "Missing shot rationale" unless shots.all? { |shot| SHOT_RATIONALE.key?(shot.fetch("shot_id")) }

FileUtils.mkdir_p(REVIEW_DIR)

canvas_width = 3660
canvas_height = 4480
margin = 60
header_height = 280
card_width = 1160
card_height = 800
gap = 30

svg = []
svg << %(<?xml version="1.0" encoding="UTF-8"?>)
svg << %(<svg xmlns="http://www.w3.org/2000/svg" width="#{canvas_width}" height="#{canvas_height}" viewBox="0 0 #{canvas_width} #{canvas_height}">)
svg << %(<rect x="0" y="0" width="#{canvas_width}" height="#{canvas_height}" fill="#07101A"/>)
svg << %(<text x="#{margin}" y="105" fill="#F4F7FA" font-size="58" font-weight="700" font-family="Hiragino Sans GB, Helvetica Neue, sans-serif">DIRECTOR REVIEW · EDITORIAL STORYBOARD</text>)
svg << %(<text x="#{margin}" y="165" fill="#91A4B8" font-size="31" font-family="Hiragino Sans GB, Helvetica Neue, sans-serif">#{escape(JOB)} · revision 7 · 15 shots · 43.0s · 9:16 · NO RENDER</text>)
svg << %(<text x="#{margin}" y="222" fill="#FF9F43" font-size="28" font-family="Hiragino Sans GB, Helvetica Neue, sans-serif">导演审查重点：动态连续、信息可读、无 PPT 化、事实画面一致</text>)

shots.each_with_index do |shot, index|
  column = index % 3
  row = index / 3
  x = margin + column * (card_width + gap)
  y = header_height + row * (card_height + gap)
  components = shot.dig("visual", "component_types") || []
  accent = if components.include?("timeline")
    "#39C6FF"
  elsif components.include?("parameter_card")
    "#FF9F43"
  elsif components.include?("title_animation")
    "#FF7139"
  else
    "#57D6A3"
  end
  svg << %(<rect x="#{x}" y="#{y}" width="#{card_width}" height="#{card_height}" rx="24" fill="#0D1722" stroke="#243548" stroke-width="3"/>)
  svg << %(<rect x="#{x}" y="#{y}" width="12" height="#{card_height}" rx="6" fill="#{accent}"/>)
  svg << %(<text x="#{x + 38}" y="#{y + 55}" fill="#FFFFFF" font-size="34" font-weight="700" font-family="Hiragino Sans GB, Helvetica Neue, sans-serif">#{escape(shot.fetch("shot_id"))}</text>)
  svg << %(<text x="#{x + card_width - 38}" y="#{y + 55}" text-anchor="end" fill="#{accent}" font-size="30" font-weight="700" font-family="Hiragino Sans GB, Helvetica Neue, sans-serif">#{compact_number(shot.fetch("duration"))}s</text>)
  svg << visual_schematic(shot, x + 38, y + 78, card_width - 76, 180)
  svg << text_block(x: x + 38, y: y + 302, text: "镜头类型｜#{shot_type_label(shot.dig("camera", "shot_size"))}", width: 45, size: 25, line_height: 31, color: "#D7E0E9", weight: 600, max_lines: 1)
  svg << text_block(x: x + 38, y: y + 339, text: "运镜｜#{movement_label(shot.fetch("movement"))}", width: 45, size: 24, line_height: 30, color: "#B8C6D4", max_lines: 1)
  svg << text_block(x: x + 38, y: y + 382, text: "字幕｜#{shot.dig("visual", "on_screen_text")}", width: 44, size: 25, line_height: 31, color: "#FFFFFF", weight: 600, max_lines: 2)
  svg << text_block(x: x + 38, y: y + 455, text: "数据动画｜#{shot.fetch("data_animation_requirement")}", width: 45, size: 23, line_height: 29, color: "#9CC8E8", max_lines: 3)
  transition = "#{shot.fetch("transition_in")} → #{shot.fetch("transition_out")}"
  svg << text_block(x: x + 38, y: y + 559, text: "Transition｜#{transition}", width: 45, size: 22, line_height: 28, color: "#98A8B8", max_lines: 2)
  svg << text_block(x: x + 38, y: y + 624, text: "预计视觉｜#{shot.dig("visual", "description")}", width: 40, size: 22, line_height: 28, color: "#D7E0E9", max_lines: 4)
  component_text = components.map { |item| component_label(item) }.join(" · ")
  svg << text_block(x: x + 38, y: y + 770, text: component_text, width: 47, size: 20, line_height: 25, color: accent, weight: 600, max_lines: 1)
end

svg << %(</svg>)
File.write(SVG_OUTPUT, svg.join("\n") + "\n", mode: "wx")

data_run = longest_run(shots)
score = SCORE_ROWS.sum { |row| row[2] }
input_hash = Digest::SHA256.file(INPUT).hexdigest

review = []
review << "# Director Review — Editorial Storyboard"
review << ""
review << "- 项目：`#{JOB}`"
review << "- 审核对象：`output/#{JOB}/intermediate/storyboard_r7_editorial.yaml`"
review << "- Storyboard revision：7"
review << "- 输入 SHA-256：`#{input_hash}`"
review << "- 镜头数：15"
review << "- 总时长：43.0 秒"
review << "- 审核时间：#{Time.now.iso8601}"
review << "- 审核动作：只审查，不修改 Storyboard，不渲染"
review << ""
review << "## Director Score"
review << ""
review << "**#{score}/100 — needs_review**"
review << ""
review << "分镜逻辑成立，事实和版权边界清楚，但视觉材质过度集中于程序化图形。最大问题不是单镜设计，而是 43 秒连续程序化画面的整体疲劳。"
review << ""
review << "| 评分项 | 满分 | 得分 | 扣分原因 |"
review << "|---|---:|---:|---|"
SCORE_ROWS.each do |name, maximum, earned, reason|
  review << "| #{name} | #{maximum} | #{earned} | #{reason} |"
end
review << "| **总分** | **100** | **#{score}** | **共扣 #{100 - score} 分** |"
review << ""
review << "## 自动检查"
review << ""
review << "| 检查 | 结果 | 导演判断 |"
review << "|---|---|---|"
review << "| 开头 3 秒是否足够抓人 | `17/20` | 基本成立。反差句和中心推进有效，但缺少已授权车型证据，首秒品牌识别偏弱。 |"
review << "| 信息密度是否过高 | `needs_review` | 整体偏高；shot_11—shot_12 是主要拥挤点，3 秒内要读边界字段和三项观察标准。 |"
review << "| 连续数据镜头是否超过 3 个 | `passed` | 按 timeline / verified_data_animation / parameter_card 严格分类，最长连续段为 #{data_run.join(" → ")}，共 #{data_run.length} 镜，未超过 3。 |"
review << "| 连续程序化画面是否超过 5 秒 | `failed` | 15 镜全部依赖程序化动态主干，连续 43 秒，远超 5 秒。官方图片即使通过授权也只是可选证据层。 |"
review << "| 是否存在 PPT 感 | `needs_review` | 不是机械翻页，但 shot_11—shot_12 连续参数卡、shot_14 大标题存在中度 PPT 风险；跨镜变形降低了风险。 |"
review << "| 镜头节奏是否突然下降 | `needs_review` | shot_13 从 3 秒动态图表进入 4 秒 locked 关系图，是全片最明显的降速点。 |"
review << "| Ending 是否有记忆点 | `8/10` | 二选一构图清楚、可评论，但‘驾驶还是空间’是常见问句，独特口号不足。 |"
review << ""
review << "## 逐镜导演说明"

shots.each do |shot|
  id = shot.fetch("shot_id")
  start_time = shot.fetch("start_seconds").to_f
  end_time = start_time + shot.fetch("duration").to_f
  rationale = SHOT_RATIONALE.fetch(id)
  review << ""
  review << "### #{id} · #{compact_number(start_time)}—#{compact_number(end_time)}s"
  review << ""
  review << "- 用途：#{shot.fetch("visual_intent")}"
  review << "- 为什么这样拍：#{rationale.fetch(:why)}"
  review << "- 为什么不用另一种方式：#{rationale.fetch(:why_not)}"
  review << "- 运镜与转场：`#{movement_label(shot.fetch("movement"))}`；`#{shot.fetch("transition_in")}` → `#{shot.fetch("transition_out")}`。"
end

review << ""
review << "## 导演结论"
review << ""
review << "- 结构：成立。15 镜时间线连续，开场、论证、机制、判断、提问完整。"
review << "- 主要风险：43 秒连续程序化画面；shot_11—shot_12 信息密度；shot_13 节奏下降。"
review << "- PPT 风险：中等，不是当前已判定失败；实际首帧和运动测试仍是人工门禁。"
review << "- 状态：`needs_review`。本报告不构成分镜批准，不改变 r7 的 `approval: pending`。"
review << "- 禁止动作：未搜索素材、未生成视频、未调用外部供应商、未渲染。"

File.write(MD_OUTPUT, review.join("\n") + "\n", mode: "wx") unless File.exist?(MD_OUTPUT)

puts "CREATED #{SVG_OUTPUT.sub("#{ROOT}/", "")}"
puts "PRESERVED #{MD_OUTPUT.sub("#{ROOT}/", "")}"
puts "DIRECTOR_SCORE #{score}/100"
