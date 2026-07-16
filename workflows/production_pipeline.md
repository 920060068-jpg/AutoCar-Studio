# Media Production Engine 工作流

## 目标与边界

把已批准脚本转换为可审计的分镜、素材、镜头、动画、音频和渲染计划。本阶段允许原生 MiniMax TTS 生成已批准旁白或明确授权的连接测试音频，不制作正式视频。

执行链：Approved Script → Storyboard → Asset Manifest → Shot Selection → Animation Plan → Audio Plan → Render Plan → QC → Automatic Review。

除 `CONFIG.yaml` 明确开放的 `minimax_tts` 外，禁止真实素材 API、其他外部 API、依赖安装、图片或视频生成、HyperFrames 调用、Remotion 调用、自动发布和 Git 提交。

## 必读

- `../AGENTS.md`
- `../CONFIG.yaml`
- `../EXECUTION_CONTRACT.md`
- `../agents/visual_director.md`
- `../agents/asset_planner.md`
- `../agents/asset_manager.md`
- `../agents/audio_director.md`
- `../rules/storyboard.md`
- `../rules/camera.md`
- `../rules/assets.md`
- `../rules/audio.md`
- `../rules/copyright.md`
- `../rules/quality_control.md`
- `../templates/storyboard.yaml`
- `../templates/asset_manifest.yaml`

## 1. Approved Script

### Input

- 自动审核批准或显式人工覆盖的 `script_structure`、事实报告、Story Intelligence 决定和脚本校验和。

### Process

- 锁定 `job_id`、revision、脚本文本、`claim_ids`、目标时长和旁白计划。
- 核对 Story Intelligence 状态和 Script Editor 审核记录。

### Output

- 不可变脚本输入包和生产任务摘要。

### Validation

- 脚本、事实和策略全部已批准，校验和一致。
- 缺少自动门禁批准、事实映射或版本不一致时停止。

## 2. Storyboard

### Input

- 不可变脚本包、品牌样式、平台参数、镜头与安全规则。

### Process

- Visual Director 将每段脚本映射到 `duration`、`visual`、`camera`、`movement`、`audio` 和 `asset`。
- 规划预览首帧路径、镜头连续性、字幕安全区和转场。

### Output

- `../templates/storyboard.yaml` 实例和预览首帧需求。

### Validation

- 时间线连续，总时长、画幅和帧率符合配置。
- 每镜有明确目的、事实映射和素材请求；禁止 PPT、图片轮播和一句话一张图。
- 本阶段预览状态只能为 `planned`；预览未生成和批准前不得制作。

## 3. Asset Manifest

### Input

- 已审核分镜、素材请求、本地文件、来源记录和版权证明。

### Process

- Asset Manager 按 schema v2 登记 `asset_id`、`shot_id`、`type`、`source`、`license`、`quality` 和 `status`。
- 执行存在性、SHA-256、版权、质量和完全重复检查。

### Output

- `../templates/asset_manifest.yaml` 实例和素材缺口报告。

### Validation

- 每个必需镜头有对应资产；来源、许可、质量和状态完整。
- 未取得文件可保留 `planned`，但不能进入 Render Plan；版权未知、质量失败或重复滥用时为 `blocked`。

## 4. Shot Selection

### Input

- 已审核分镜、素材清单和 `../shot_library/` 分类说明。

### Process

- 为每镜选择镜头库条目，核对用途、焦段、运镜和适用场景。
- 检查实际素材是否满足车型、年款、配置、光线和连续性要求。

### Output

- `shot_id` 到镜头库条目、素材 ID、选择理由和替代镜头的映射。

### Validation

- 镜头条目必须服务脚本事实，不能只为装饰。
- 焦段、运镜和场景匹配；缺少合法素材时返回 Asset Manifest，不得静态填充。

## 5. Animation Plan

### Input

- 分镜、镜头选择、品牌样式、数据和屏幕文字。

### Process

- 规划数据揭示、标题、标注、遮罩、镜头内运动和转场。
- 标记未来由动态图形片段或主时间线承担的职责，但不调用任何引擎。

### Output

- 符合 `../templates/motion_plan.yaml` 的每镜动画目标、起止时间、层级、缓动方向、转场和未来执行职责。

### Validation

- 动画服务信息，屏幕文字保持可读，只有一个主要运动意图。
- 禁止引擎调用、无目的缩放、高频闪烁、PPT 翻页和动画掩盖证据。

## 6. Audio Plan

### Input

- 已批准脚本、分镜时长、品牌 `audio_style` 和版权规则。

### Process

- Audio Director 规划 MiniMax 沉曜男声旁白、自然留白窗口、BGM、环境音、汽车声音和混合规则；旁白不要求覆盖全片。
- 为每个音频元素记录时间、来源、许可、用途和同步说明。
- 文案及声音门禁通过后，只能使用项目原生 `src/audio/minimax/` 调用 `t2a_v2`；连接测试必须有当前任务的明确授权。

### Output

- 旁白、`intentional_silence_windows`、BGM、环境音、车辆音效和混音参数组成的 `audio_plan`。

### Validation

- 主旁白供应商和声音符合配置；全部音频元素有许可计划。
- 未执行时状态为 `planned` 或 `blocked`；真实调用后必须保存原始音频、48 kHz WAV 母版和无密钥审计报告，才能标记旁白生成 `passed`。

## 7. Render Plan

### Input

- 已审核分镜、已清理素材、镜头选择、动画计划和音频计划。

### Process

- 规划未来主时间线顺序、媒体依赖、分辨率、帧率、时长、缓存键和输出路径。
- 记录未来职责边界和执行前置条件，不执行 HyperFrames 或 Remotion。

### Output

- 符合 `../templates/render_config.yaml` 的 Render Plan、依赖矩阵、预期输出路径和 `render_status: not_executed`。

### Validation

- 所有必需输入路径、版本和校验和可追溯；自动发布保持关闭。
- 任一素材未清理、预览未批准、音频未就绪或输入版本不一致时为 `blocked`。
- 本阶段禁止产生视频文件或把计划标记为渲染成功。
- 只有生产计划通过自动门禁或显式人工覆盖后，才能把锁定契约交给 `render_pipeline.md`。

## 8. QC

### Input

- 完整生产计划、分镜、素材清单、镜头映射、动画计划、音频计划和 Render Plan。

### Process

- 执行配置、字段、引用、版权、重复、语义、时长和人工门禁的规划级 QC。
- 列出未来渲染后必须执行的分辨率、帧率、黑帧、字幕、爆音和音画同步检查。

### Output

- 规划 QC 报告、阻断项和未来技术 QC 清单。

### Validation

- 规划级检查必须有证据；缺失素材、版权或引用立即失败。
- 没有渲染文件时，技术媒体检查必须保持 `blocked`，不得伪造 `passed`。

## 9. Automatic Review

### Input

- 完整生产计划、规划 QC 报告、事实与版权摘要和全部校验和。

### Process

- 自动审核脚本一致性、镜头语义、素材权利、品牌适配、音频方向和执行风险。
- 决定 `approved`、`revise`、`retry`、`blocked` 或 `failed`。

### Output

- reviewer、时间、决定、备注和被审核计划校验和。

### Validation

- 批准必须指向唯一 revision 和完整文件集合。
- 通过后可进入本地渲染；成片仍需完整 QC、严格大于 90 的评分，且不得发布。

## 失败与重放

任何阶段失败都停止后续计划。输入、模板或规则变化必须创建新 revision；旧计划、QC 和自动决定全部保留，不得覆盖或静默豁免。
