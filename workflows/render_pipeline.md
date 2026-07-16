# Render Engine Pipeline

## 目标与边界

定义从已批准分镜到最终渲染 QC 的视频执行链。Daily Auto Mode 只在全部上游门禁通过时运行。

执行链：Storyboard → Asset Manifest → Scene Builder → HyperFrames Motion → Remotion Timeline → Audio Mix → Subtitle → Render → QC。

## 必读

- `../AGENTS.md`
- `../CONFIG.yaml`
- `../EXECUTION_CONTRACT.md`
- `../src/hyperframes/README.md`
- `../src/remotion/README.md`
- `../rules/hyperframes.md`
- `../rules/hyperframes_engine.md`
- `../rules/remotion.md`
- `../rules/remotion_engine.md`
- `../rules/subtitles.md`
- `../rules/subtitle_engine.md`
- `../rules/audio.md`
- `../rules/quality_control.md`
- `../templates/motion_plan.yaml`
- `../templates/render_config.yaml`

## 1. Storyboard

### Input

- 已批准 Storyboard、脚本、事实映射、品牌样式和预览首帧记录。

### Process

- 锁定 `job_id`、revision、镜头顺序、时长、视觉目的、素材请求和首帧校验和。
- 将秒数按 RenderConfig 帧率转换成预期帧预算。

### Output

- 不可变 Storyboard Render Input 和镜头帧预算。

### Validation

- Storyboard schema、时间线连续性、38–45 秒总时长、自动批准和首帧状态有效。
- 缺少批准预览、事实映射或镜头目的时停止。

## 2. Asset Manifest

### Input

- Storyboard Render Input 和 Asset Manifest schema v2。

### Process

- 按 `shot_id` 解析素材，锁定本地路径、SHA-256、类型、许可和质量状态。
- 检查完全重复、低分辨率、水印、语义匹配和必要文件。

### Output

- Render Asset Map 和不可变资产依赖清单。

### Validation

- 所有必需素材必须为 `cleared` 或 `project_owned`，且本地文件存在、校验和匹配。
- 远程动态 URL、版权未知、缺失或重复滥用素材立即阻断。

## 3. Scene Builder

### Input

- Storyboard Render Input、Render Asset Map、脚本结构和品牌样式。

### Process

- 将叙事章节映射为 `Scene[]`，将每个镜头映射为 `Shot[]`。
- 为 Shot 绑定起始帧、持续帧、素材、音频段、字幕段、Motion Component 和转场接口。

### Output

- 逻辑 `VideoProject`、Scene Graph 和 Shot Graph。

### Validation

- 每个 `shot_id` 只出现一次，Scene 与 Shot 顺序完整，总帧数等于项目帧预算。
- 不得在 Scene Builder 中创建素材、改写脚本或调用引擎。

## 4. HyperFrames Motion

### Input

- 逻辑 Shot Graph、已批准 Motion Plan、品牌样式、数据和本地资产依赖。

### Process

- 根据 `hyperframes_engine.md` 验证镜头运动、视觉包装、数据动画、HUD 和局部转场。
- 为需要动态图形的 Shot 生成 Motion Component Build Specification；执行时只承担局部动态图形。

### Output

- Motion Component Contracts、输入校验和和明确执行状态。

### Validation

- 每个组件绑定唯一 `shot_id`、持续帧、首帧、素材、数据来源和运动规则。
- 组件不得包含音频、主时间线、远程请求、随机行为或禁用表现形式。

## 5. Remotion Timeline

### Input

- VideoProject、Scene/Shot Graph、Render Asset Map、Motion Component Contracts 和 RenderConfig。

### Process

- 按 `remotion_engine.md` 规划主时间线、Sequence 边界、转场占用和组件组合。
- 生成并执行 Remotion 主时间线；不得越过 Picture/Asset 门禁。

### Output

- Timeline Manifest、帧区间表、依赖校验和和执行状态。

### Validation

- 帧区间无负值、重叠或空洞；总帧数与 Storyboard、音频和 RenderConfig 一致。
- Remotion 是唯一主时间线；Motion Component 不得反向控制全片时间。

## 6. Audio Mix

### Input

- Timeline Manifest、已批准音频计划、MiniMax 旁白文件计划、BGM、环境音和车辆音效许可。

### Process

- 在 Picture Lock 后生成并混合独立轨道，规划帧位置、增益、ducking、淡入淡出、声道和 48 kHz 母版参数。
- 核对旁白文本校验和与锁定脚本一致。
- 核对自然留白窗口与 Audio Plan 一致；整条旁白轨可以与视频等长，但有效语音不要求 100% 占用。

### Output

- Audio Mix Specification、轨道时间表和执行状态。

### Validation

- 默认旁白为 MiniMax 沉曜男声；每个声音有本地来源、许可、用途和时间范围。
- 缺少音频文件或许可时为 `blocked`，不得用替代声音静默继续。

## 7. Subtitle

### Input

- 批准旁白文本、词句时间计划、Timeline Manifest、品牌样式和字幕规则。

### Process

- 规划主字幕、关键词、数字和来源层级，换算帧区间并应用安全区。
- 生成 Caption Specification 并由 Remotion 渲染字幕。

### Output

- Caption Track、强调标记、安全区证据和执行状态。

### Validation

- 文本与批准旁白一致；字幕不重叠、不超时、不拆分数字单位且位于安全区。
- 没有词级时间数据时禁止规划逐字卡拉 OK 效果。

## 8. Render

### Input

- 锁定的 VideoProject、Timeline Manifest、资产、Motion Components、Audio Mix、Caption 和 RenderConfig。

### Process

- 生成 Render Job Specification、输入校验和、输出路径并启动本地渲染。

### Output

- Render Job Specification、渲染产物、日志、代表帧和明确状态。

### Validation

- RenderConfig 明确分辨率、帧率、codec、audio、输出路径、禁止覆盖和禁止自动发布。
- 任一输入未批准、未清理或校验和不一致时为 `blocked`。
- 禁止把架构检查、计划生成或命令输出伪造成渲染成功。

## 9. QC

### Input

- 完整 Render Job Specification、全部上游契约、规则版本和校验和。

### Process

- 检查字段、引用、帧预算、素材、版权、字幕、音频和确定性规则。
- 对真实渲染执行完整技术与内容 QC。

### Output

- Render Architecture QC 报告、阻断项和未来媒体 QC 清单。

### Validation

- 没有真实渲染文件时所有技术媒体检查保持 `blocked`。
- QC 后必须进入 `review_pipeline.md` 自动审核；只允许生成 Release Candidate，不得自动发布。

## 失败与重放

任一步失败都停止下游。输入、规则、模板或校验和变化必须新建 revision。旧契约、QC 和自动决定不得覆盖或删除。
