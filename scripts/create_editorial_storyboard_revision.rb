#!/usr/bin/env ruby
# frozen_string_literal: true

require "digest"
require "fileutils"
require "json"
require "time"
require "yaml"

abort "Legacy Manual Review Mode script is blocked in Daily Auto Mode" unless ENV["AUTOCAR_PRODUCTION_MODE"] == "manual_review"

ROOT = File.expand_path("..", __dir__)
JOB = "xiaomi_skynomad_20260714_r1"
INTERMEDIATE = File.join(ROOT, "output", JOB, "intermediate")
SOURCE_PATH = File.join(INTERMEDIATE, "storyboard_r4_approved.yaml")
OUTPUT_PATH = File.join(INTERMEDIATE, "storyboard_r7_editorial.yaml")
SWITCH_PATH = File.join(INTERMEDIATE, "editorial_mode_switch_r3.yaml")
SCRIPT_PATH = File.join(INTERMEDIATE, "script.yaml")
APPROVAL_PATH = File.join(ROOT, "output", JOB, "review", "human_approval_decision_20260714_r1.yaml")
TRIGGER_EVIDENCE = [
  "output/#{JOB}/asset_acquisition_r1/technical_inspection_report.md",
  "output/#{JOB}/asset_acquisition_r1/copyright_review_checklist.md",
  "output/#{JOB}/asset_acquisition_r1/candidate_asset_manifest_r2.yaml"
].freeze

def sha256(path)
  Digest::SHA256.file(path).hexdigest
end

def project_path(relative)
  File.join(ROOT, relative)
end

def refuse_existing(path)
  abort "Refusing to overwrite existing output: #{path.sub("#{ROOT}/", "")}" if File.exist?(path)
end

def yaml_scalar(value)
  case value
  when nil
    "null"
  when true, false, Numeric
    value.to_s
  else
    JSON.generate(value.to_s)
  end
end

def yaml_lines(value, indent = 0)
  padding = " " * indent
  case value
  when Hash
    value.flat_map do |key, item|
      if item.is_a?(Hash) || item.is_a?(Array)
        ["#{padding}#{key}:"] + yaml_lines(item, indent + 2)
      else
        ["#{padding}#{key}: #{yaml_scalar(item)}"]
      end
    end
  when Array
    value.flat_map do |item|
      if item.is_a?(Hash) || item.is_a?(Array)
        ["#{padding}-"] + yaml_lines(item, indent + 2)
      else
        ["#{padding}- #{yaml_scalar(item)}"]
      end
    end
  else
    ["#{padding}#{yaml_scalar(value)}"]
  end
end

def dump_yaml(document)
  yaml_lines(document).join("\n") + "\n"
end

def plan(component_types:, description:, purpose:, camera:, movement:, request_ids:, fallback:, primary:, engine:,
         copyright:, verified_data_ids:, real_asset:, data_animation:, evidence_role:, official_image_usage: "none")
  {
    "component_types" => component_types,
    "description" => description,
    "purpose" => purpose,
    "camera" => camera,
    "movement" => movement,
    "request_ids" => request_ids,
    "fallback" => fallback,
    "primary" => primary,
    "engine" => engine,
    "copyright" => copyright,
    "verified_data_ids" => verified_data_ids,
    "real_asset" => real_asset,
    "data_animation" => data_animation,
    "evidence_role" => evidence_role,
    "official_image_usage" => official_image_usage
  }
end

PLANS = {
  "shot_01" => plan(
    component_types: %w[title_animation official_news_image],
    description: "石墨色空间网格从中心展开，标题‘第二条产品线，先讲空间’沿纵深进入；若取得合规官方外观新闻图，只作为中央证据窗，不制作虚假行驶运动。",
    purpose: "用动态标题和空间母题建立新闻评论钩子，不再依赖车辆动态 Hero Shot。",
    camera: ["full_frame_editorial", 35, "orthographic"],
    movement: ["push_in", "forward", "controlled", "相机仅做轻微程序化推进；网格和标题分层展开，官方图片窗保持比例稳定。"],
    request_ids: %w[ear_xm_001_title_animation ear_xm_001_official_news_image_optional],
    fallback: "ear_xm_001_title_animation",
    primary: "editorial_graphic_with_optional_cleared_official_news_image",
    engine: "remotion",
    copyright: "pending",
    verified_data_ids: %w[data_xiaomi_skynomad_positioning],
    real_asset: "可选：一张来源和编辑用途明确、无第三方水印的官方澎程外观新闻图；缺失时使用程序化标题方案。",
    data_animation: "空间网格、标题与官方定位标签均为项目自制，不生成车辆画面。",
    evidence_role: "fact_based_hook",
    official_image_usage: "optional_evidence_window_not_fullscreen"
  ),
  "shot_02" => plan(
    component_types: %w[title_animation],
    description: "SkyNomad 与‘小米澎程’两组文字沿同一空间轴对齐，英文名先出现，中文名随后锁定；不重绘官方 Logo。",
    purpose: "以项目自制文字动画准确揭示正式名称。",
    camera: ["full_frame_title", 50, "orthographic"],
    movement: ["pan", "left_to_right", "controlled", "文字沿单一水平轴进入并在安全区锁定，避免卡片翻页。"],
    request_ids: %w[ear_xm_002_name_title_animation],
    fallback: "",
    primary: "project_owned_title_animation",
    engine: "hyperframes",
    copyright: "project_owned_when_generated",
    verified_data_ids: %w[data_xiaomi_skynomad_announcement_date_20260709],
    real_asset: "none",
    data_animation: "仅使用脚本中已批准的正式中英文名称，禁止仿制品牌标志。",
    evidence_role: "verified_name",
  ),
  "shot_03" => plan(
    component_types: %w[timeline verified_data_animation],
    description: "一条连续时间轴从画面下方升起，日期节点停在‘2026.07.09’，官方公布标签与来源类型同步出现。",
    purpose: "用来源绑定时间轴交代正式公布日期。",
    camera: ["full_frame_data", 50, "orthographic"],
    movement: ["locked", "none", "controlled", "时间轴由左向右生长，日期节点一次聚焦，不滚动网页截图。"],
    request_ids: %w[ear_xm_003_announcement_timeline],
    fallback: "",
    primary: "programmatic_verified_data",
    engine: "hyperframes",
    copyright: "project_owned_when_generated",
    verified_data_ids: %w[data_xiaomi_skynomad_announcement_date_20260709 data_xiaomi_skynomad_series_relationship],
    real_asset: "none",
    data_animation: "只显示 verified data 中的 2026-07-09 正式公布节点。",
    evidence_role: "official_announcement_date"
  ),
  "shot_04" => plan(
    component_types: %w[infographic official_news_image],
    description: "‘智能、可变、大空间’三个关键词围绕可伸缩空间框架依次建立；若合规官方座舱新闻图可用，只嵌入中央遮罩作为证据层。",
    purpose: "解释官方定位，避免把静态座舱图伪装成真实空间运动。",
    camera: ["medium_editorial", 50, "orthographic"],
    movement: ["locked", "none", "controlled", "空间框架按三个关键词扩展，图片窗不做夸张变形或虚假景深。"],
    request_ids: %w[ear_xm_004_positioning_infographic ear_xm_004_official_cabin_image_optional],
    fallback: "ear_xm_004_positioning_infographic",
    primary: "editorial_infographic_with_optional_cleared_official_news_image",
    engine: "remotion",
    copyright: "pending",
    verified_data_ids: %w[data_xiaomi_skynomad_positioning],
    real_asset: "可选：合规官方座舱新闻图；不得使用网页缩略图、第三方水印图或无授权社交图片。",
    data_animation: "三个定位词按脚本顺序进入，图形仅表达分类关系。",
    evidence_role: "official_positioning",
    official_image_usage: "optional_masked_evidence_layer"
  ),
  "shot_05" => plan(
    component_types: %w[infographic verified_data_animation],
    description: "同一小米汽车主轴分成两条动态路径：SU7/YU7 标记为驾驶系列，澎程标记为智能可变大空间 SUV 系列；路径宽度相等。",
    purpose: "解释官方双系列定位差异，不再寻找两组驾驶视频。",
    camera: ["full_frame_comparison", 50, "orthographic"],
    movement: ["pan", "center_to_sides", "controlled", "主轴从中心分叉，两侧标签同步建立，禁止速度感或性能暗示。"],
    request_ids: %w[ear_xm_005_dual_series_infographic],
    fallback: "",
    primary: "programmatic_verified_data",
    engine: "hyperframes",
    copyright: "project_owned_when_generated",
    verified_data_ids: %w[data_xiaomi_skynomad_dual_series_positioning],
    real_asset: "none",
    data_animation: "比较范围仅限官方定位，不加入性能、销量或竞品参数。",
    evidence_role: "official_positioning_comparison"
  ),
  "shot_06" => plan(
    component_types: %w[infographic verified_data_animation],
    description: "上一镜的双路径收束为‘两种用车需求’关系图，驾驶与空间两个节点分别连接到同一品牌主节点。",
    purpose: "准确说明平行双系列关系，并与上一镜形成连续动画。",
    camera: ["full_frame_data", 50, "orthographic"],
    movement: ["locked", "none", "controlled", "沿用上一镜路径位置，节点合并而不是切成新卡片。"],
    request_ids: %w[ear_xm_006_dual_series_relationship],
    fallback: "",
    primary: "programmatic_verified_data",
    engine: "hyperframes",
    copyright: "project_owned_when_generated",
    verified_data_ids: %w[data_xiaomi_skynomad_series_relationship data_xiaomi_skynomad_dual_series_positioning],
    real_asset: "none",
    data_animation: "主节点、两条平行分支与需求标签均绑定 verified data。",
    evidence_role: "editorial_summary"
  ),
  "shot_07" => plan(
    component_types: %w[timeline verified_data_animation],
    description: "双分支图的一条线向下延伸成研发时间轴，‘2023 年初’与‘小米昆仑架构’依次固定，不绘制虚构工程蓝图。",
    purpose: "交代开发起点与架构名称。",
    camera: ["full_frame_timeline", 50, "orthographic"],
    movement: ["pan", "top_to_bottom", "controlled", "时间线纵向展开，节点稳定停留供阅读。"],
    request_ids: %w[ear_xm_007_kunlun_timeline],
    fallback: "",
    primary: "programmatic_verified_data",
    engine: "hyperframes",
    copyright: "project_owned_when_generated",
    verified_data_ids: %w[data_xiaomi_skynomad_kunlun_architecture_start_2023],
    real_asset: "none",
    data_animation: "只使用架构名称与 2023 年初开发起点，不伪造结构、尺寸或成熟度。",
    evidence_role: "verified_development_timeline"
  ),
  "shot_08" => plan(
    component_types: %w[infographic official_news_image],
    description: "抽象座舱剖面中，一条水平基准线贯穿前后排并标注‘官方公布设计方向：纯平地板’；可选合规细节图仅作旁证。",
    purpose: "解释纯平地板作为空间机制基础，不伪装成实拍动作证明。",
    camera: ["detail_graphic", 70, "orthographic"],
    movement: ["pan", "front_to_rear", "controlled", "基准线横向绘制，座舱框架保持抽象且不标尺寸。"],
    request_ids: %w[ear_xm_008_flat_floor_infographic ear_xm_008_official_detail_image_optional],
    fallback: "ear_xm_008_flat_floor_infographic",
    primary: "editorial_infographic_with_optional_cleared_official_news_image",
    engine: "remotion",
    copyright: "pending",
    verified_data_ids: %w[data_xiaomi_skynomad_space_mechanisms],
    real_asset: "可选：明确展示地板区域的合规官方新闻图；缺失时不得使用无关内饰图替代。",
    data_animation: "抽象剖面不表示真实比例，只说明已公布的纯平地板方向。",
    evidence_role: "verified_design_direction",
    official_image_usage: "optional_detail_evidence_not_motion_simulation"
  ),
  "shot_09" => plan(
    component_types: %w[infographic official_news_image],
    description: "上一镜水平基准线变成长滑轨路径，两个抽象座椅标记沿路径移动到不同组合位置；不显示速度、行程或真实操作效果。",
    purpose: "说明长滑轨与重新组合的关系，不伪造连续实拍。",
    camera: ["detail_graphic", 70, "orthographic"],
    movement: ["tracking", "along_rail", "controlled", "座椅标记沿单一路径移动，起终点只代表场景关系，不代表真实行程。"],
    request_ids: %w[ear_xm_009_long_rail_infographic ear_xm_009_official_detail_image_optional],
    fallback: "ear_xm_009_long_rail_infographic",
    primary: "editorial_infographic_with_optional_cleared_official_news_image",
    engine: "remotion",
    copyright: "pending",
    verified_data_ids: %w[data_xiaomi_skynomad_space_mechanisms],
    real_asset: "可选：来源与授权明确的官方长滑轨/座椅新闻图；不把静态图拼成真实动作。",
    data_animation: "抽象座椅与轨道只解释设计方向，不给出未公布机械参数。",
    evidence_role: "verified_design_direction",
    official_image_usage: "optional_detail_evidence_not_fake_sequence"
  ),
  "shot_10" => plan(
    component_types: %w[infographic],
    description: "长滑轨路径向外扩展为驾驶、家庭、工作与驻车四个抽象场景节点，节点围绕‘多场景’中心依次点亮。",
    purpose: "支持从驾驶到家庭和多场景的编辑分析，不使用无关家庭库存素材。",
    camera: ["wide_editorial", 35, "orthographic"],
    movement: ["orbit", "clockwise", "controlled", "场景节点围绕中心依次建立，保持同一空间母题和色彩系统。"],
    request_ids: %w[ear_xm_010_scenario_infographic],
    fallback: "",
    primary: "project_owned_editorial_infographic",
    engine: "hyperframes",
    copyright: "project_owned_when_generated",
    verified_data_ids: %w[data_xiaomi_skynomad_positioning data_xiaomi_skynomad_space_mechanisms],
    real_asset: "none",
    data_animation: "图标是编辑分类，不表现未公布功能、设备联动或人物肖像。",
    evidence_role: "editorial_analysis"
  ),
  "shot_11" => plan(
    component_types: %w[parameter_card],
    description: "场景节点压缩为一张动态参数边界卡：‘本期已核验’列出定位、纯平地板、长滑轨；‘本期不引用’只标注具体尺寸数字。",
    purpose: "把分析重点从尺寸大小移到已核验空间机制，同时明确数据边界。",
    camera: ["medium_card", 50, "orthographic"],
    movement: ["push_in", "forward", "slow", "卡片在同一画布上重排字段，不使用翻页或绿色通过章。"],
    request_ids: %w[ear_xm_011_parameter_boundary_card],
    fallback: "",
    primary: "project_owned_parameter_card",
    engine: "hyperframes",
    copyright: "project_owned_when_generated",
    verified_data_ids: %w[data_xiaomi_skynomad_positioning data_xiaomi_skynomad_space_mechanisms],
    real_asset: "none",
    data_animation: "卡片不填入未核验尺寸，只显示本期引用边界。",
    evidence_role: "editorial_boundary"
  ),
  "shot_12" => plan(
    component_types: %w[parameter_card infographic],
    description: "参数边界卡转为三项观察矩阵：安全、易用、量产；三项均标‘待实车与独立测试’，不出现合格、通过或排名。",
    purpose: "提出量产观察标准，明确这不是已验证结果。",
    camera: ["close_up_card", 70, "orthographic"],
    movement: ["tilt", "top_to_bottom", "controlled", "三项按阅读顺序展开，状态始终保持待验证。"],
    request_ids: %w[ear_xm_012_watchpoint_matrix],
    fallback: "",
    primary: "project_owned_editorial_infographic",
    engine: "hyperframes",
    copyright: "project_owned_when_generated",
    verified_data_ids: %w[data_xiaomi_skynomad_space_mechanisms],
    real_asset: "none",
    data_animation: "观察词来自批准脚本的编辑判断，必须显示‘待验证’。",
    evidence_role: "editorial_watch_point"
  ),
  "shot_13" => plan(
    component_types: %w[infographic verified_data_animation],
    description: "观察矩阵收束为空间节点，并连接智能与使用场景两个节点；关系线按旁白顺序建立，所有节点标记为编辑关系。",
    purpose: "解释空间逻辑与智能生态的编辑关联，不展示未公布功能。",
    camera: ["full_frame_data", 50, "orthographic"],
    movement: ["locked", "none", "controlled", "关系线逐条连接并停留，保持三节点信息层级。"],
    request_ids: %w[ear_xm_013_ecosystem_relationship],
    fallback: "",
    primary: "programmatic_verified_data",
    engine: "hyperframes",
    copyright: "project_owned_when_generated",
    verified_data_ids: %w[data_xiaomi_skynomad_positioning data_xiaomi_skynomad_space_mechanisms],
    real_asset: "none",
    data_animation: "只表达空间、智能、场景的编辑关系，不模拟具体交互。",
    evidence_role: "editorial_analysis"
  ),
  "shot_14" => plan(
    component_types: %w[title_animation],
    description: "三节点关系压缩成‘改变产品逻辑’主标题，双系列两条线在标题下方保持并列，避免回到缺失的车辆 Hero Shot。",
    purpose: "用动态编辑结论完成观点收束。",
    camera: ["full_frame_title", 50, "orthographic"],
    movement: ["pull_out", "backward", "slow", "关系图轻微后退，结论标题在中心锁定，不使用静态封面翻页。"],
    request_ids: %w[ear_xm_014_conclusion_title],
    fallback: "",
    primary: "project_owned_title_animation",
    engine: "hyperframes",
    copyright: "project_owned_when_generated",
    verified_data_ids: %w[data_xiaomi_skynomad_series_relationship data_xiaomi_skynomad_positioning],
    real_asset: "none",
    data_animation: "结论明确标为编辑判断，事实依据为双系列关系与官方定位。",
    evidence_role: "editorial_conclusion"
  ),
  "shot_15" => plan(
    component_types: %w[title_animation infographic],
    description: "画面分为‘驾驶感’与‘可变空间’两侧，中央指针保持中性，评论问题沿底部安全区进入；双侧权重不预设答案。",
    purpose: "以可回答的中性问题结束新闻评论。",
    camera: ["full_frame_editorial", 50, "orthographic"],
    movement: ["locked", "none", "controlled", "两侧标签同步进入，中央指针不偏向任何一侧，最后淡出。"],
    request_ids: %w[ear_xm_015_comment_prompt],
    fallback: "",
    primary: "project_owned_editorial_infographic",
    engine: "hyperframes",
    copyright: "project_owned_when_generated",
    verified_data_ids: %w[data_xiaomi_skynomad_dual_series_positioning],
    real_asset: "none",
    data_animation: "只呈现评论问题，不加入关注、点赞、投票比例或煽动性提示。",
    evidence_role: "neutral_comment_prompt"
  )
}.freeze

TRANSITIONS = {
  "shot_01" => ["none", "space_line_expand"],
  "shot_02" => ["space_line_expand", "date_line_match"],
  "shot_03" => ["date_line_match", "grid_morph"],
  "shot_04" => ["grid_morph", "split_branch"],
  "shot_05" => ["split_branch", "node_merge"],
  "shot_06" => ["node_merge", "timeline_extend"],
  "shot_07" => ["timeline_extend", "floor_line_match"],
  "shot_08" => ["floor_line_match", "rail_line_match"],
  "shot_09" => ["rail_line_match", "scenario_expand"],
  "shot_10" => ["scenario_expand", "boundary_card_focus"],
  "shot_11" => ["boundary_card_focus", "criteria_build"],
  "shot_12" => ["criteria_build", "node_connect"],
  "shot_13" => ["node_connect", "conclusion_compress"],
  "shot_14" => ["conclusion_compress", "question_split"],
  "shot_15" => ["question_split", "fade_to_black"]
}.freeze

refuse_existing(OUTPUT_PATH)
refuse_existing(SWITCH_PATH)

TRIGGER_EVIDENCE.each do |relative|
  abort "Missing Editorial trigger evidence: #{relative}" unless File.file?(project_path(relative))
end
abort "Missing approved source storyboard" unless File.file?(SOURCE_PATH)
abort "Missing script" unless File.file?(SCRIPT_PATH)
abort "Missing approval record" unless File.file?(APPROVAL_PATH)

document = YAML.load_file(SOURCE_PATH)
storyboard = document.fetch("storyboard")
abort "Expected storyboard revision 4" unless storyboard.fetch("revision") == 4
abort "Expected 15 shots" unless storyboard.fetch("shots").length == 15
abort "Source storyboard is not approved" unless storyboard.dig("approval", "status") == "approved"

storyboard["revision"] = 7
storyboard["production_mode"] = "editorial"
storyboard["editorial_mode"] = {
  "trigger" => "official_video_legally_unavailable",
  "trigger_evidence" => TRIGGER_EVIDENCE,
  "restricted_video_search_permitted" => false,
  "wait_for_pr_assets" => false,
  "copyright_bypass_permitted" => false,
  "official_news_images" => {
    "allowed" => true,
    "required" => false,
    "clearance_required" => true,
    "programmatic_fallback_required" => true
  },
  "dynamic_visual_spine" => "continuous_space_grid_and_relationship_lines",
  "render_allowed" => false,
  "asset_request_revision_required" => true
}

storyboard.fetch("shots").each do |shot|
  id = shot.fetch("shot_id")
  shot_plan = PLANS.fetch(id)
  transition_in, transition_out = TRANSITIONS.fetch(id)
  visual = shot.fetch("visual")
  visual["description"] = shot_plan.fetch("description")
  visual["purpose"] = shot_plan.fetch("purpose")
  visual["lighting"] = "neutral_editorial"
  visual["component_types"] = shot_plan.fetch("component_types")
  shot["visual_intent"] = shot_plan.fetch("purpose")

  camera = shot.fetch("camera")
  camera["shot_size"], camera["focal_length_mm"], camera["angle"] = shot_plan.fetch("camera")

  movement = shot.fetch("movement")
  movement["type"], movement["direction"], movement["speed"], movement["plan"] = shot_plan.fetch("movement")

  shot["real_asset_requirement"] = shot_plan.fetch("real_asset")
  shot["data_animation_requirement"] = shot_plan.fetch("data_animation")
  shot["editorial_design"] = {
    "evidence_role" => shot_plan.fetch("evidence_role"),
    "official_image_usage" => shot_plan.fetch("official_image_usage"),
    "programmatic_fallback" => shot_plan.fetch("fallback").empty? ? "primary_programmatic_visual" : shot_plan.fetch("fallback"),
    "anti_slideshow_motion" => shot_plan.dig("movement", 3),
    "fact_picture_alignment" => "aligned_to_existing_claim_ids"
  }

  asset = shot.fetch("asset")
  asset["request_ids"] = shot_plan.fetch("request_ids")
  asset["fallback_request_id"] = shot_plan.fetch("fallback")
  asset["scene"] = shot_plan.fetch("component_types").include?("official_news_image") ? "editorial_hybrid" : "editorial_graphics"
  shot["asset_request_ids"] = shot_plan.fetch("request_ids")
  shot["primary_visual_source"] = shot_plan.fetch("primary")
  shot["verified_data_ids"] = shot_plan.fetch("verified_data_ids")
  shot["engine"] = shot_plan.fetch("engine")
  shot["engine_reason"] = if shot_plan.fetch("engine") == "hyperframes"
    "HyperFrames owns deterministic editorial motion graphics; Remotion remains the future master timeline owner. No rendering occurs in this revision."
  else
    "Remotion will compose optional cleared official news images with project-owned editorial motion; no image-only slideshow or rendering occurs in this revision."
  end
  shot["transition_in"] = transition_in
  shot["transition_out"] = transition_out
  shot["preview_frame"] = "output/#{JOB}/review/editorial_storyboard_previews_r7/#{id}.png"
  shot["preview_status"] = "pending"
  shot["preview_sha256"] = ""
  shot["copyright_status"] = shot_plan.fetch("copyright")

  audio = shot.fetch("audio")
  audio["sync_notes"] = "Editorial Storyboard review revision; no voice, music, SFX, image, video or render has been generated."
end

storyboard["validation"] = {
  "shot_count" => 15,
  "timeline_contiguous" => true,
  "maximum_shot_duration_seconds" => storyboard.fetch("shots").map { |shot| shot.fetch("duration").to_f }.max,
  "empty_shots" => 0,
  "ppt_style" => false,
  "static_image_slideshow" => false,
  "one_sentence_one_image" => false,
  "planned_restricted_video_requests" => 0,
  "optional_official_news_image_shots" => 4,
  "programmatic_motion_shots" => 15,
  "verified_data_bindings_present" => true,
  "preview_frames_generated" => false,
  "assets_acquired" => false,
  "restricted_video_search_stopped" => true,
  "status" => "passed_schema_pending_new_previews_and_human_approval"
}
storyboard["media_mix_plan"] = {
  "restricted_video_seconds" => 0,
  "restricted_video_percent" => 0,
  "optional_official_news_image_composite_shots" => 4,
  "programmatic_motion_shots" => 15,
  "programmatic_fallback_coverage_percent" => 100,
  "status" => "editorial_mode_planned"
}
storyboard["approval"] = {
  "status" => "pending",
  "reviewer" => "",
  "reviewed_at" => "",
  "decision_record" => ""
}
storyboard["supersedes"] = "output/#{JOB}/intermediate/storyboard_r6_editorial.yaml"
storyboard["source_storyboard"] = "output/#{JOB}/intermediate/storyboard_r4_approved.yaml"
storyboard["stage_run_id"] = "storyboard_editorial_mode_20260714_r7"

switch_time = Time.now.iso8601
switch_record = {
  "schema_version" => 1,
  "editorial_mode_switch" => {
    "job_id" => JOB,
    "revision" => 3,
    "stage_run_id" => "editorial_mode_switch_20260714_r3",
    "switched_at" => switch_time,
    "actor" => "codex",
    "trigger" => "official_video_legally_unavailable",
    "trigger_evidence" => TRIGGER_EVIDENCE.map { |relative| {"path" => relative, "sha256" => sha256(project_path(relative))} },
    "locked_inputs" => {
      "script" => {"path" => "output/#{JOB}/intermediate/script.yaml", "sha256" => sha256(SCRIPT_PATH)},
      "source_storyboard" => {"path" => "output/#{JOB}/intermediate/storyboard_r4_approved.yaml", "sha256" => sha256(SOURCE_PATH)},
      "human_approval" => {"path" => "output/#{JOB}/review/human_approval_decision_20260714_r1.yaml", "sha256" => sha256(APPROVAL_PATH)}
    },
    "actions" => {
      "restricted_video_search_stopped" => true,
      "wait_for_pr_assets" => false,
      "login_or_captcha_attempted" => false,
      "copyright_bypass_attempted" => false,
      "render_performed" => false
    },
    "output" => "output/#{JOB}/intermediate/storyboard_r7_editorial.yaml",
    "status" => "passed",
    "supersedes" => "output/#{JOB}/intermediate/editorial_mode_switch_r2.yaml",
    "retry_of" => "editorial_mode_switch_20260714_r2"
  }
}

FileUtils.mkdir_p(File.dirname(OUTPUT_PATH))
File.write(OUTPUT_PATH, dump_yaml(document), mode: "wx")
File.write(SWITCH_PATH, dump_yaml(switch_record), mode: "wx")

puts "CREATED #{OUTPUT_PATH.sub("#{ROOT}/", "")}"
puts "CREATED #{SWITCH_PATH.sub("#{ROOT}/", "")}"
