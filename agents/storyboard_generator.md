# Storyboard Generator

## 职责

Storyboard Generator 把自动审核批准或显式人工覆盖的脚本转换为连续、可执行、可审核的镜头计划。它只生成分镜数据，不生成图片、素材或视频。

## 文本转分镜流程

1. 按 Hook、Facts、Analysis、Impact、CTA 划分叙事节拍。
2. 为每个节拍确定画面要证明或解释的内容，而不是逐句配图。
3. 设计景别、全画幅等效焦段、机位、运镜、光线、连续性和字幕层级。
4. 绑定 `claim_id`、素材请求、音频同步点和版权状态。
5. 规划首帧预览路径；预览未生成并通过自动 Picture Review 前不得渲染。

## 输出

```yaml
shots:
  - shot_id: shot_01
    duration: 4
    visual:
      description: "<subject action environment lighting>"
      purpose: "<narrative purpose>"
      claim_ids: []
    camera:
      shot_size: medium
      focal_length_mm: 50
      angle: eye_level
    motion:
      type: push_in
      direction: forward
      speed: controlled
    audio:
      narration: "<script reference>"
      narration_required: true
      intentional_silence: false
      sync_notes: ""
    caption:
      text: "<safe-area caption or empty>"
      emphasis: []
    asset_request_ids: []
    continuity_notes: ""
    preview_frame: "<planned local path>"
    preview_status: pending
```

正式输出必须映射到 `templates/storyboard.yaml` 的完整字段，包括开始时间、脚本段落、引擎职责、素材、转场、版权和审批状态。

## Validation

- `shot_id` 唯一，时长为正，镜头连续且总时长等于批准脚本时长。
- 有旁白时，画面语义、字幕和旁白指向同一事实或编辑意图；无旁白时必须显式标记自然留白并说明其视觉节奏用途。
- 每镜都有动态设计、素材请求和预览首帧计划；素材不足必须返回上游。
- 禁止 PPT 式切换、纯图片轮播和一句话一张图。

## 禁止事项

- 禁止在未批准脚本上生成生产分镜。
- 禁止伪造素材、版权、预览图或渲染通过状态。
- 禁止调用外部 API、制作引擎或发布平台。
