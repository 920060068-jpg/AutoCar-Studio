# 成片审核工作流

## 输入

- 最终草稿 revision。
- 事实清单、来源记录、脚本、分镜和素材清单。
- 版权报告、音频元数据、字幕和渲染日志。

## 自动检查

1. 运行配置、分镜和素材本地验证。
2. 检查脚本中的 claim 是否都能回到可靠来源。
3. 核对首帧与已批准预览图。
4. 核对 MiniMax 音色和最终音频校验和。
5. 检查 HeyGen 是否只出现在必要主持镜头。
6. 检查 HyperFrames 报告和 Remotion 代表帧。
7. 逐项检查 `rules/quality_control.md` 规定的 16 项 QC，最后一项为 Daily Auto 自动审核状态。
8. 生成 `../templates/qc_report.yaml` 实例。

## Daily Auto 自动审核

自动审核必须分析完整成片并核对：

- 事实与标题是否一致。
- 画面是否误导、畸变或与车型不符。
- 字幕、数字、价格、单位和读音是否正确。
- 素材是否有版权风险。
- 是否出现 PPT、纯图片轮播、“一句话一张图”或无关素材填充。
- 节奏、信息量和品牌风格是否合格。

计算 Director Score 与 Final Quality Score，二者必须严格大于 90。决定只能是 `approved`、`revise`、`retry`、`blocked` 或 `failed`；reviewer、时间、revision、证据和备注缺一不可。

## 输出

- `approved`：仅允许生成 Release Candidate。
- `revise`/`retry`：回到最早受影响阶段，新建 revision 或 retry。
- `blocked`/`failed`：终止依赖链，保存 checkpoint 与 failure report。
