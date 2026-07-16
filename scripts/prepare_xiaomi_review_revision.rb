#!/usr/bin/env ruby
# frozen_string_literal: true

require "date"
require "digest"
require "fileutils"
require "json"
require "time"
require "yaml"

abort "Legacy Manual Review Mode script is blocked in Daily Auto Mode" unless ENV["AUTOCAR_PRODUCTION_MODE"] == "manual_review"

ROOT = File.expand_path("..", __dir__)
JOB_ID = "xiaomi_skynomad_20260714_r1"
BASE = File.join(ROOT, "output", JOB_ID)
INTERMEDIATE = File.join(BASE, "intermediate")
REVIEW = File.join(BASE, "review")

FACT_PATH = File.join(INTERMEDIATE, "fact_check.yaml")
SCRIPT_PATH = File.join(INTERMEDIATE, "script.yaml")
STORYBOARD_R1_PATH = File.join(INTERMEDIATE, "storyboard.yaml")
STORYBOARD_R2_PATH = File.join(INTERMEDIATE, "storyboard_r2.yaml")
STORYBOARD_R3_PATH = File.join(INTERMEDIATE, "storyboard_r3.yaml")
STORYBOARD_R4_PATH = File.join(INTERMEDIATE, "storyboard_r4_approved.yaml")
ASSET_REQUEST_R1_PATH = File.join(INTERMEDIATE, "asset_requests.yaml")
ASSET_REQUEST_R2_PATH = File.join(INTERMEDIATE, "asset_request_r2.yaml")
RISK_PATH = File.join(INTERMEDIATE, "risk_register.yaml")
VERIFIED_DATA_PATH = File.join(ROOT, "database", "verified_data.json")
APPROVAL_PATH = File.join(REVIEW, "human_approval_decision_20260714_r1.yaml")

def relative(path)
  path.sub(%r{\A#{Regexp.escape(ROOT)}/?}, "")
end

def load_yaml(path)
  raise "File not found: #{relative(path)}" unless File.file?(path)

  YAML.safe_load(
    File.read(path),
    permitted_classes: [Date, Time],
    permitted_symbols: [],
    aliases: false
  )
end

def deep_copy(value)
  Marshal.load(Marshal.dump(value))
end

def write_exclusive(path, content)
  FileUtils.mkdir_p(File.dirname(path))
  File.open(path, File::WRONLY | File::CREAT | File::EXCL, 0o644) do |file|
    file.write(content)
  end
  puts "WROTE #{relative(path)}"
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
    return ["#{padding}{}"] if value.empty?
    value.flat_map do |key, item|
      if item.is_a?(Hash) || item.is_a?(Array)
        if item.empty?
          ["#{padding}#{key}: #{item.is_a?(Array) ? "[]" : "{}"}"]
        else
          ["#{padding}#{key}:"] + yaml_lines(item, indent + 2)
        end
      else
        ["#{padding}#{key}: #{yaml_scalar(item)}"]
      end
    end
  when Array
    return ["#{padding}[]"] if value.empty?
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

def fail_with(scope, issues)
  if issues.empty?
    puts "PASS #{scope}"
    return
  end

  warn "FAIL #{scope}"
  issues.each { |issue| warn "- #{issue}" }
  exit 1
end

def safe_text(value)
  value.to_s.gsub("|", "\\|").gsub("\n", " ").strip
end

def shot_claim_ids(shot)
  ids = Array(shot["source_claim_ids"]) + Array(shot["basis_claim_ids"]) + Array(shot.dig("visual", "claim_ids"))
  ids.map(&:to_s).reject(&:empty?).uniq
end

def create_storyboard_r3
  document = deep_copy(load_yaml(STORYBOARD_R1_PATH))
  storyboard = document.fetch("storyboard")
  storyboard["revision"] = 3
  storyboard["supersedes"] = relative(STORYBOARD_R2_PATH)
  storyboard["source_storyboard"] = relative(STORYBOARD_R1_PATH)
  storyboard["retry_of"] = "storyboard_structure_fix_20260714_r2"
  storyboard["stage_run_id"] = "storyboard_structure_fix_20260714_r3"

  storyboard.fetch("shots").each do |shot|
    claim_ids = shot_claim_ids(shot)
    if claim_ids.empty? && shot.fetch("shot_id") == "shot_15"
      claim_ids = ["claim_xm_003"]
      shot["basis_claim_ids"] = claim_ids
      shot.fetch("visual")["claim_ids"] = claim_ids
    end

    shot["audio"] = {
      "narration" => shot.fetch("narration"),
      "narration_status" => "disabled",
      "claim_ids" => claim_ids,
      "ambience" => "",
      "sync_notes" => "Silent human-review revision; no voice, music or SFX has been generated.",
      "voice" => {
        "provider" => "minimax",
        "logical_voice" => "chenyao_male",
        "status" => "disabled",
        "asset_path" => ""
      },
      "music" => {
        "status" => "pending",
        "track_id" => "",
        "asset_path" => ""
      },
      "sfx" => {
        "status" => "pending",
        "cue_ids" => [],
        "asset_paths" => []
      }
    }

    shot["asset"] = {
      "request_ids" => Array(shot.fetch("asset_request_ids")),
      "required" => true,
      "fallback_request_id" => "",
      "brand" => "xiaomi",
      "vehicle" => "SkyNomad Xiaomi Pengcheng",
      "scene" => shot.fetch("primary_visual_source") == "programmatic_verified_data" ? "data" : "editorial_vehicle"
    }

    data_visual = shot.fetch("primary_visual_source") == "programmatic_verified_data"
    shot["engine"] = data_visual ? "hyperframes" : "remotion"
    shot["segment_role"] = "visual_segment"
    shot["engine_reason"] = if data_visual
      "HyperFrames owns source-linked motion graphics only; Remotion will own final timeline assembly after approval."
    else
      "Remotion owns timeline editing, subtitles and final assembly; this revision does not render or synthesize footage."
    end
    shot["presenter_required"] = false
    shot["presenter_reason"] = ""
    shot["preview_frame"] = "output/#{JOB_ID}/review/storyboard_previews/#{shot.fetch("shot_id")}.png"
    shot["preview_status"] = "pending_automatic_review"
    shot["subtitle_safe_area"] = shot.dig("subtitle", "safe_area") || "brand_default"
  end

  storyboard["validation"] ||= {}
  storyboard["validation"]["status"] = "ready_for_automatic_validation"
  storyboard["validation"]["preview_frames_generated"] = false
  storyboard["approval"] = {"status" => "pending", "reviewer" => "", "reviewed_at" => ""}

  write_exclusive(STORYBOARD_R3_PATH, dump_yaml(document))
end

def source_table(fact)
  rows = fact.fetch("source_records").map do |source|
    "| #{safe_text(source["source_id"])} | #{safe_text(source["publisher"])} | #{safe_text(source["title"])} | #{safe_text(source["published_at"])} | #{safe_text(source["url"])} |"
  end
  (["| Source ID | 发布者 | 标题 | 发布时间 | URL |", "|---|---|---|---|---|"] + rows).join("\n")
end

def claim_table(fact)
  rows = fact.fetch("claims").map do |claim|
    "| #{safe_text(claim["claim_id"])} | #{safe_text(claim["status"])} | #{safe_text(claim["statement"])} | #{safe_text(Array(claim["source_ids"]).join(", "))} | #{safe_text(claim["notes"])} |"
  end
  (["| Claim | 状态 | 核心事实 | 来源 | 边界说明 |", "|---|---|---|---|---|"] + rows).join("\n")
end

def create_reviews
  fact_doc = load_yaml(FACT_PATH)
  script_doc = load_yaml(SCRIPT_PATH)
  storyboard_doc = load_yaml(STORYBOARD_R3_PATH)
  risk_doc = load_yaml(RISK_PATH)
  asset_doc = load_yaml(ASSET_REQUEST_R1_PATH)
  fact = fact_doc.fetch("fact_check")
  script = script_doc.fetch("script")
  storyboard = storyboard_doc.fetch("storyboard")
  risk = risk_doc.fetch("risk_register")
  request_by_id = asset_doc.fetch("asset_request_package").fetch("requests").to_h { |request| [request.fetch("request_id"), request] }

  excluded_rows = Array(fact["excluded_claims"]).map do |item|
    "- `#{item["field"]}` — #{item["status"]}：#{item["reason"]}"
  end
  risk_rows = risk.fetch("risks").select { |item| ["blocked", "needs_review", "pending_asset_acquisition"].include?(item["status"]) }.map do |item|
    "- `#{item["risk_id"]}`（#{item["severity"]}）：#{item["issue"]} 控制：#{item["control"]}"
  end

  fact_review = <<~MD
    # Fact Check 自动审核

    - 项目：`#{JOB_ID}`
    - 当前版本：Fact Check revision #{fact["revision"]}
    - 自动状态：`#{fact["validation_status"]}`
    - 自动审核状态：`pending`
    - 核验时间：`#{fact["checked_at"]}`

    ## 核心事实

    #{claim_table(fact)}

    ## 来源

    #{source_table(fact)}

    ## 未核验或明确排除的数据

    #{excluded_rows.join("\n")}

    结论：当前脚本使用的 claim 均标记为 `verified`。价格、精确车身尺寸、具体上市日期等未核验内容没有进入脚本。品牌官方定位不能被表述为独立实测结论。

    ## 未确认风险

    #{risk_rows.join("\n")}

    ## 人工决定

    - [ ] approved
    - [ ] changes_requested
    - [ ] rejected
    - 审核人：
    - 审核时间：
    - 备注：
  MD

  segment_rows = script.fetch("segments").map do |segment|
    ids = Array(segment["claim_ids"]) + Array(segment["basis_claim_ids"])
    "| #{segment["segment_id"]} | #{safe_text(segment["time_range"])} | #{safe_text(segment["narration"])} | #{safe_text(ids.join(", "))} | #{safe_text(segment["on_screen_text"])} |"
  end
  script_table = (["| Segment | 时间 | 视频脚本/旁白 | Claim/Basis | 屏幕文字 |", "|---|---:|---|---|---|"] + segment_rows).join("\n")

  script_review = <<~MD
    # Script 自动审核

    - 项目：`#{JOB_ID}`
    - 当前版本：Script revision #{script["revision"]}
    - 标题：#{script["title"]}
    - 目标时长：#{script["target_duration_seconds"]} 秒
    - 自动事实映射：`#{script["fact_mapping_status"]}`
    - 自动审核状态：`#{script["editorial_status"]}`
    - 音频状态：MiniMax `#{script.dig("narrator", "provider_status")}`；本 revision 禁止生成旁白

    ## 视频脚本

    #{script_table}

    ## 核心事实与来源

    #{claim_table(fact)}

    来源详见 [fact_check_review.md](fact_check_review.md)。

    ## 未核验数据与风险

    - 未核验价格、精确尺寸和具体上市日期均未进入脚本。
    - “智能可变大空间”是官方定位，不是独立体验验证。
    - 第 10–14 段属于基于已核验事实的编辑分析；不得剪成官方结论。
    - 历史数据库为空时不得猜测真实账号历史；只使用本地历史并保留缺口标记。

    ## 人工决定

    - [ ] approved
    - [ ] changes_requested
    - [ ] rejected
    - 审核人：
    - 审核时间：
    - 备注：
  MD

  shot_rows = storyboard.fetch("shots").map do |shot|
    request = request_by_id.fetch(Array(shot.dig("asset", "request_ids")).first)
    claims = Array(shot.dig("visual", "claim_ids"))
    consistency = claims.empty? ? "缺少事实映射" : "设计层未发现冲突；实际素材待采集后复核"
    "| #{shot["shot_id"]} | #{shot["duration"]}s | #{safe_text(shot.dig("visual", "purpose"))} | #{safe_text(request["asset_type"])} | #{safe_text(request["required_content"] || request["purpose"])} | #{safe_text(shot.dig("movement", "type"))}/#{safe_text(shot.dig("movement", "direction"))} | #{safe_text(claims.join(", "))} | #{consistency} |"
  end
  storyboard_table = (["| Shot | 时长 | 用途 | 素材类型 | 素材需求 | 预计运镜 | 事实映射 | 事实/画面一致性 |", "|---|---:|---|---|---|---|---|---|"] + shot_rows).join("\n")

  storyboard_review = <<~MD
    # Storyboard 自动审核

    - 项目：`#{JOB_ID}`
    - 当前版本：Storyboard revision #{storyboard["revision"]}
    - 旧版本：`#{storyboard["supersedes"]}`
    - 镜头数：#{storyboard.fetch("shots").length}
    - 总时长：#{storyboard["total_duration_seconds"]} 秒
    - 自动结构状态：`ready_for_automatic_validation`
    - 自动审核状态：`pending`
    - 预览性质：程序化线框，仅供构图审核，不是真实车辆素材

    ## 15 个镜头

    #{storyboard_table}

    ## 未核验数据与画面风险

    - 未发现把未核验价格、尺寸或上市日期写入画面设计。
    - Shot 06、13 只允许绑定 verified data；不得使用网页截图冒充数据资产。
    - Shot 10、12 涉及人物、工程或制造画面，实际素材必须再次核对肖像权、场景真实性和授权范围。
    - 当前只能确认分镜设计与事实映射无结构性冲突；实际画面尚未采集，车型、动作和语义一致性仍待后续版权与素材审核。

    ## 人工决定

    - [ ] approved
    - [ ] changes_requested
    - [ ] rejected
    - 审核人：
    - 审核时间：
    - 备注：
  MD

  preview_checks = storyboard.fetch("shots").map do |shot|
    "- [ ] `#{shot["shot_id"]}` 构图、字幕安全区、主体保护区、运镜方向与素材类型已确认"
  end
  approval_checklist = <<~MD
    # 人工审批清单

    项目：`#{JOB_ID}`。任何勾选都必须由人工完成；本文件不会自动批准任何阶段。

    ## Fact Check revision #{fact["revision"]}

    - [ ] 核心事实与官方来源一致
    - [ ] SkyNomad/小米澎程未被误写为独立品牌
    - [ ] 未核验价格、尺寸、上市日期继续排除
    - [ ] 品牌官方定位没有被写成独立测试结论
    - 决定：`pending`

    ## Script revision #{script["revision"]}

    - [ ] 15 段脚本含义与 Fact Check 一致
    - [ ] 编辑分析与官方事实明确区分
    - [ ] 评论引导中性，不构成站队或夸张结论
    - [ ] MiniMax 保持 blocked/disabled，本轮没有生成音频
    - 决定：`pending`

    ## Storyboard revision #{storyboard["revision"]}

    #{preview_checks.join("\n")}

    - [ ] 13 个真实媒体镜头与 2 个 verified-data 镜头的边界正确
    - [ ] 没有增加静态图片或 Logo 请求
    - [ ] 程序化预览没有被误认为真实车辆证据
    - 决定：`pending`

    ## 审核记录

    - 审核人：
    - 审核时间：
    - 总决定：`pending`
    - 备注：
  MD

  write_exclusive(File.join(REVIEW, "fact_check_review.md"), fact_review)
  write_exclusive(File.join(REVIEW, "script_review.md"), script_review)
  write_exclusive(File.join(REVIEW, "storyboard_review.md"), storyboard_review)
  write_exclusive(File.join(REVIEW, "approval_checklist.md"), approval_checklist)
end

def preview_spec
  storyboard = load_yaml(STORYBOARD_R3_PATH).fetch("storyboard")
  requests = load_yaml(ASSET_REQUEST_R1_PATH).fetch("asset_request_package").fetch("requests")
  request_by_id = requests.to_h { |request| [request.fetch("request_id"), request] }
  spec = storyboard.fetch("shots").map do |shot|
    request_id = Array(shot.dig("asset", "request_ids")).first
    request = request_by_id.fetch(request_id)
    {
      "shot_id" => shot.fetch("shot_id"),
      "duration_seconds" => shot.fetch("duration"),
      "purpose" => shot.dig("visual", "purpose"),
      "visual_description" => shot.dig("visual", "description"),
      "asset_type" => request.fetch("asset_type"),
      "required_content" => request["required_content"] || request.fetch("purpose"),
      "subtitle" => shot.dig("subtitle", "text"),
      "subtitle_safe_area" => shot.fetch("subtitle_safe_area"),
      "movement_type" => shot.dig("movement", "type"),
      "movement_direction" => shot.dig("movement", "direction"),
      "movement_plan" => shot.dig("movement", "plan"),
      "primary_visual_source" => shot.fetch("primary_visual_source"),
      "claim_ids" => Array(shot.dig("visual", "claim_ids"))
    }
  end
  puts JSON.generate({"job_id" => JOB_ID, "revision" => 3, "shots" => spec})
end

def create_asset_request_r2
  document = deep_copy(load_yaml(ASSET_REQUEST_R1_PATH))
  package = document.fetch("asset_request_package")
  package["revision"] = 2
  package["supersedes"] = relative(ASSET_REQUEST_R1_PATH)
  package["storyboard_path"] = relative(STORYBOARD_R3_PATH)
  package["acquisition_allowed_this_revision"] = true
  package["execution_requires_human_approval"] = false
  package["automatic_review_status"] = "pending"
  package["download_performed"] = false

  real_requests = package.fetch("requests").reject { |request| request["asset_type"] == "data_visual" }
  package["scope_lock"] = {
    "allowed_real_media_request_ids" => real_requests.map { |request| request.fetch("request_id") },
    "allowed_real_media_request_count" => 13,
    "still_image_requests_allowed" => false,
    "standalone_logo_requests_allowed" => false,
    "storyboard_modification_allowed_for_quantity" => false,
    "data_visual_generation_in_acquisition_scope" => false
  }
  package["source_priority"] = [
    "xiaomi_auto_official",
    "xiaomi_group_official",
    "official_launch_or_livestream_replay",
    "official_newsroom_or_media_kit"
  ]
  package["safety_policy"] = {
    "google_or_baidu_thumbnail_forbidden" => true,
    "self_media_reupload_forbidden" => true,
    "third_party_watermark_forbidden" => true,
    "login_or_captcha_bypass_forbidden" => true,
    "drm_or_stream_extraction_forbidden" => true,
    "unknown_license_must_be_blocked" => true,
    "quantity_cannot_override_storyboard" => true
  }

  package.fetch("requests").each do |request|
    if request["asset_type"] == "data_visual"
      request["status"] = "planned_not_in_acquisition_scope"
    else
      request["status"] = "planned_pending_human_approval"
      request["license"]["status"] = "pending"
      request["source"]["local_path"] = ""
    end
  end
  package["validation_status"] = "ready_for_schema_validation_pending_human_approval"

  write_exclusive(ASSET_REQUEST_R2_PATH, dump_yaml(document))
end

def sha256(path)
  Digest::SHA256.file(path).hexdigest
end

def create_approval_snapshot
  reviewed_at = Time.now.iso8601
  preview_paths = (1..15).map { |index| File.join(REVIEW, "storyboard_previews", format("shot_%02d.png", index)) }
  missing = preview_paths.reject { |path| File.file?(path) }
  raise "Missing approved previews: #{missing.map { |path| relative(path) }.join(", ")}" unless missing.empty?

  storyboard_document = deep_copy(load_yaml(STORYBOARD_R3_PATH))
  storyboard = storyboard_document.fetch("storyboard")
  storyboard["revision"] = 4
  storyboard["supersedes"] = relative(STORYBOARD_R3_PATH)
  storyboard["stage_run_id"] = "storyboard_human_approval_20260714_r4"
  storyboard.delete("retry_of")
  storyboard.fetch("shots").each do |shot|
    preview_path = File.join(ROOT, shot.fetch("preview_frame"))
    shot["preview_status"] = "approved"
    shot["preview_sha256"] = sha256(preview_path)
  end
  storyboard["validation"]["status"] = "passed_automatic_validation"
  storyboard["validation"]["preview_frames_generated"] = true
  storyboard["approval"] = {
    "status" => "approved",
    "reviewer" => "user",
    "reviewed_at" => reviewed_at,
    "decision_record" => relative(APPROVAL_PATH)
  }
  write_exclusive(STORYBOARD_R4_PATH, dump_yaml(storyboard_document))

  preview_digest_lines = preview_paths.sort.map { |path| "#{sha256(path)}  #{relative(path)}" }
  preview_aggregate = Digest::SHA256.hexdigest(preview_digest_lines.join("\n") + "\n")
  approval_document = {
    "schema_version" => 1,
    "human_approval" => {
      "job_id" => JOB_ID,
      "approval_id" => "human_approval_20260714_r1",
      "reviewer" => "user",
      "reviewed_at" => reviewed_at,
      "decisions" => {
        "fact_check" => "approved",
        "script" => "approved",
        "storyboard" => "approved",
        "storyboard_previews" => "approved",
        "asset_request_r2" => "approved"
      },
      "approved_inputs" => {
        "fact_check" => {"path" => relative(FACT_PATH), "sha256" => sha256(FACT_PATH)},
        "script" => {"path" => relative(SCRIPT_PATH), "sha256" => sha256(SCRIPT_PATH)},
        "storyboard" => {"path" => relative(STORYBOARD_R3_PATH), "sha256" => sha256(STORYBOARD_R3_PATH)},
        "storyboard_previews" => {"directory" => "output/#{JOB_ID}/review/storyboard_previews", "count" => 15, "aggregate_sha256" => preview_aggregate},
        "asset_request" => {"path" => relative(ASSET_REQUEST_R2_PATH), "sha256" => sha256(ASSET_REQUEST_R2_PATH)}
      },
      "asset_acquisition" => {
        "authorized" => true,
        "real_media_request_count" => 13,
        "still_images_allowed" => false,
        "standalone_logos_allowed" => false,
        "render_allowed" => false,
        "publish_allowed" => false,
        "minimax_allowed" => false
      },
      "status" => "approved_for_asset_acquisition"
    }
  }
  write_exclusive(APPROVAL_PATH, dump_yaml(approval_document))
end

def validate_fact
  fact = load_yaml(FACT_PATH).fetch("fact_check")
  verified_data = JSON.parse(File.read(VERIFIED_DATA_PATH)).fetch("records").to_h { |record| [record.fetch("data_id"), record] }
  issues = []
  sources = fact.fetch("source_records")
  source_ids = sources.map { |source| source["source_id"] }
  issues << "source_id values are not unique" unless source_ids.uniq.length == source_ids.length
  sources.each do |source|
    %w[source_id category publisher title url published_at accessed_at].each do |field|
      issues << "source missing #{field}" if source[field].to_s.empty?
    end
    issues << "source URL must use HTTPS: #{source["source_id"]}" unless source["url"].to_s.start_with?("https://")
  end
  claim_ids = []
  fact.fetch("claims").each do |claim|
    claim_ids << claim["claim_id"]
    issues << "claim is not verified: #{claim["claim_id"]}" unless claim["status"] == "verified"
    Array(claim["source_ids"]).each do |source_id|
      issues << "unknown source #{source_id} in #{claim["claim_id"]}" unless source_ids.include?(source_id)
    end
    Array(claim["data_ids"]).each do |data_id|
      record = verified_data[data_id]
      issues << "missing verified data #{data_id}" unless record
      issues << "data is not verified_official: #{data_id}" if record && record["verification_status"] != "verified_official"
    end
  end
  issues << "claim_id values are not unique" unless claim_ids.uniq.length == claim_ids.length
  issues << "fact check validation status is not passed" unless fact["validation_status"].to_s.start_with?("passed")
  fail_with("fact_check revision #{fact["revision"]} automatic validation", issues)
end

def parse_range(value)
  match = value.to_s.match(/\A([0-9]+(?:\.[0-9]+)?)-([0-9]+(?:\.[0-9]+)?)\z/)
  raise "invalid time_range #{value}" unless match
  [match[1].to_f, match[2].to_f]
end

def validate_script
  script = load_yaml(SCRIPT_PATH).fetch("script")
  fact = load_yaml(FACT_PATH).fetch("fact_check")
  verified_claims = fact.fetch("claims").select { |claim| claim["status"] == "verified" }.map { |claim| claim["claim_id"] }
  issues = []
  expected_start = 0.0
  segments = script.fetch("segments")
  segments.each do |segment|
    begin
      start_time, end_time = parse_range(segment["time_range"])
      issues << "timeline gap/overlap at #{segment["segment_id"]}" if (start_time - expected_start).abs > 0.001
      issues << "non-positive segment duration at #{segment["segment_id"]}" unless end_time > start_time
      expected_start = end_time
    rescue StandardError => error
      issues << error.message
    end
    issues << "missing narration at #{segment["segment_id"]}" if segment["narration"].to_s.empty?
    ids = Array(segment["claim_ids"]) + Array(segment["basis_claim_ids"])
    ids.each do |claim_id|
      issues << "script references unverified or missing claim #{claim_id}" unless verified_claims.include?(claim_id)
    end
  end
  issues << "script requires 15 segments" unless segments.length == 15
  issues << "script timeline does not equal target duration" if (expected_start - script["target_duration_seconds"].to_f).abs > 0.001
  issues << "target duration is outside configured range" unless (25.0..60.0).cover?(script["target_duration_seconds"].to_f)
  issues << "narrator provider must remain minimax" unless script.dig("narrator", "provider") == "minimax"
  issues << "MiniMax provider status must be explicit" unless %w[ready blocked].include?(script.dig("narrator", "provider_status"))
  issues << "audio generation must remain disabled" unless script.dig("narrator", "generation_allowed_this_revision") == false
  issues << "fact mapping status is not passed" unless script["fact_mapping_status"] == "passed"
  issues << "script is not pending automatic review" unless %w[pending_automatic_review approved].include?(script["editorial_status"])
  fail_with("script revision #{script["revision"]} automatic validation", issues)
end

def validate_asset_request
  package = load_yaml(ASSET_REQUEST_R2_PATH).fetch("asset_request_package")
  storyboard = load_yaml(STORYBOARD_R3_PATH).fetch("storyboard")
  issues = []
  requests = package.fetch("requests")
  ids = requests.map { |request| request["request_id"] }
  issues << "request_id values are not unique" unless ids.uniq.length == ids.length
  storyboard_ids = storyboard.fetch("shots").flat_map { |shot| Array(shot.dig("asset", "request_ids")) }
  issues << "storyboard request references do not match asset requests" unless storyboard_ids.sort == ids.sort
  real_requests = requests.reject { |request| request["asset_type"] == "data_visual" }
  issues << "expected 13 real-media requests" unless real_requests.length == 13
  issues << "acquisition_allowed_this_revision must be true" unless package["acquisition_allowed_this_revision"] == true
  issues << "ordinary human approval must not be required" unless package["execution_requires_human_approval"] == false
  issues << "automatic review status must remain pending" unless package["automatic_review_status"] == "pending"
  issues << "download_performed must remain false" unless package["download_performed"] == false
  scope = package.fetch("scope_lock")
  issues << "scope request IDs do not match 13 real-media requests" unless Array(scope["allowed_real_media_request_ids"]).sort == real_requests.map { |request| request["request_id"] }.sort
  issues << "still images must remain out of scope" unless scope["still_image_requests_allowed"] == false
  issues << "standalone logos must remain out of scope" unless scope["standalone_logo_requests_allowed"] == false
  issues << "storyboard quantity modification must be forbidden" unless scope["storyboard_modification_allowed_for_quantity"] == false
  policy = package.fetch("safety_policy")
  policy.each { |key, value| issues << "safety policy not enforced: #{key}" unless value == true }
  requests.each do |request|
    %w[request_id shot_ids asset_type purpose source license technical_requirements fallback status].each do |field|
      issues << "#{request["request_id"] || "request"} missing #{field}" unless request.key?(field) && !request[field].nil?
    end
    issues << "unsupported request type #{request["asset_type"]}" unless %w[official_video product_detail data_visual].include?(request["asset_type"])
    source = request.fetch("source")
    issues << "#{request["request_id"]} missing source owner" if source["owner"].to_s.empty?
    url = source["candidate_url"].to_s
    issues << "#{request["request_id"]} candidate URL must use HTTPS" if !url.empty? && !url.start_with?("https://")
    issues << "#{request["request_id"]} uses forbidden thumbnail/search domain" if url.match?(/google|baidu/i)
    license = request.fetch("license")
    issues << "#{request["request_id"]} license must remain pending" if request["asset_type"] != "data_visual" && license["status"] != "pending"
    issues << "#{request["request_id"]} fallback must remain disabled" unless request.fetch("fallback")["allowed"] == false
  end
  fail_with("asset_request revision #{package["revision"]} schema validation; automatic review pending", issues)
end

command = ARGV.shift
case command
when "storyboard"
  create_storyboard_r3
when "reviews"
  create_reviews
when "preview-spec"
  preview_spec
when "asset-request"
  create_asset_request_r2
when "approval"
  create_approval_snapshot
when "validate-fact"
  validate_fact
when "validate-script"
  validate_script
when "validate-asset-request"
  validate_asset_request
else
  warn "Usage: #{File.basename(__FILE__)} storyboard|reviews|preview-spec|asset-request|approval|validate-fact|validate-script|validate-asset-request"
  exit 2
end
