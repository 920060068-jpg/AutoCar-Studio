# 版权规则

## 必需记录

每项素材必须记录权利人、来源 URL、许可类型、用途、地域、平台、有效期、是否允许商业使用和证明文件路径。

## 禁止使用

- 权利状态为 `unknown`、`disputed` 或无法追溯。
- 仅因“网上可见”而推定可用。
- 去除水印、裁掉署名或规避许可限制。
- 将新闻事实的可引用性误认为图片、视频可复制。
- 超出许可地域、期限、平台或商业用途范围。

## 生成内容

AI 生成素材同样记录供应商、输入、预览图和使用条款版本。包含品牌标识、人物肖像或第三方作品风格时必须增加自动风险审查；无法确定权利时直接阻断。

版权状态未明确为 `cleared` 或 `project_owned` 时，正式制作和 Release Candidate 均不得通过。受限官方新闻资料仅按下列条件进入 Editorial Render Manifest。

## 官方新闻资料限制

`official_press_asset` 只适用于可追溯到品牌官方新闻资料、具有本地来源记录且明确限制为新闻报道用途的资产。它可以进入 Editorial Render Manifest，但必须同时满足：

- `source_type: official_media_kit`，保存官方原始 URL 与权利人。
- `commercial_use: false`、`editorial_use_only: true`，并记录具体用途限制。
- 证明路径真实存在，素材无第三方水印，技术质量和分镜语义均通过。

该状态不表示 unrestricted commercial use，也不能据此批准发布。任何条件缺失时按 `unverified` 或 `blocked` 处理；真实发布仍需独立人工执行和版权判断。
