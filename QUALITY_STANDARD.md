# Quality Standard

## 评分

Director Score 必须 `> 90`；Final Quality Score 必须 `> 90`。90 分本身失败。

Final Quality Score 权重：事实准确性 20、开头 3 秒吸引力 15、叙事与观点 15、镜头设计 15、节奏与留存潜力 10、视觉质量 10、字幕与信息表达 5、声音质量 5、版权和合规 5。

## 硬性门禁

Fact Check PASS、数据来源 PASS、Director Score >90、Storyboard PASS、Asset/Original Visual Manifest PASS、Picture Render PASS、Picture Lock PASS、Subtitle PASS、Audio PASS、Audio Sync PASS、Final Render PASS、Technical QC PASS、Content QC PASS、Copyright/Editorial Policy PASS、Final Quality Score >90。

任一硬门禁失败时不得用综合分抵消，不得输出 Release Candidate。

Audio PASS 不要求旁白覆盖全片。有意图且已标注的镜头间自然留白是合格节奏，不得作为“异常静音”判定；未声明的断音、丢字、音轨损坏仍然失败。审核优先级为自然表达、字幕同步、视觉节奏。

Audio PASS 还必须满足：Audio Preflight PASS、12/12 镜头 Measured Fit PASS、每镜安全余量 ≥0.15 秒、字幕与 Audio-Fit Script 一致、无截断、无遗漏核心事实、无机械加速感、后期变速 ≤1.15 倍、MiniMax 请求指纹和缓存记录完整。

Audio Preflight 还必须明确通过 `number_semantics_pass`、`pronunciation_dictionary_pass`、`tts_text_generated`、`display_text_unchanged`、`speed_estimate_pass` 与 `timing_budget_pass`。车型代号必须按品牌上下文判断，数量必须按数值位权朗读，正负百分比必须保留语义方向。

## Picture Review 门禁

Director Post-render Score >90、技术 QC PASS、Storyboard 规定镜头全部存在、无黑帧、无字幕越界、无未解析变量、无明显视觉重复、事实文本与 approved script 一致、示意标识正确、无必须返工问题。

## 自动修订

`Draft → Review → Score → Revise → Re-review`。达到重试上限仍失败时保存 checkpoint、生成 failure report 并标记 `blocked` 或 `failed`。禁止降低阈值。

旁白自动修订为 `Script Draft → Timing Estimate → Fit Check → Auto Condense → Re-estimate`，最多 2 轮。正式音频后为 `Measured Fit → Punctuation/Speed Minor Adjust → Optional Minimal Regeneration → Audio PASS`，每镜最多 2 次正式请求。
