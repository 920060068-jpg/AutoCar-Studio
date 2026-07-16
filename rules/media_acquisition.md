# Media Acquisition Rules

## 范围

本规则只覆盖“来源发现 → 候选下载 → 技术检测 → 权利分类 → 语义匹配 → 候选入库 → Manifest”。不包含配音、渲染、发布或平台账号操作。

## 输入门禁

- 必须使用已批准且允许 acquisition 的 Asset Request。
- 搜索任务必须逐项继承 shot、媒体类型、场景和关键词，不得自行扩展数量或媒体类型。
- Storyboard 与 Asset Request revision 不一致时，必须阻断 ready 状态并报告。

## 来源与发现

- 只允许访问 `config/media_sources.yaml` 中允许的 A/B 级域名，或 Asset Request 明确列出的同等级来源。
- 必须打开实际来源页面并保存 URL、标题、发布者、发布时间、访问时间和来源类型。
- 搜索摘要、图片搜索缩略图、网页缩略图、播放器预览图不能成为素材来源。
- 页面没有明确合法下载入口时，`download_url` 必须为 `null`。

## 权利分类

只允许：

- `owned_by_user`
- `licensed_commercial`
- `official_press_asset`
- `editorial_use`
- `unverified`
- `prohibited`

官网公开展示不等于允许下载或再发布。没有用途说明为 `unverified`；明确禁止复制为 `prohibited`。`official_press_asset` 必须记录 permitted use 与 restrictions。不得生成 `unrestricted commercial use`。所有正式使用仍需人工版权批准。

## 下载

只允许：页面明确下载按钮、静态公开原始文件 URL、官方媒体库下载链接，且无需绕过权限。遇到 401/403、登录、验证码、临时签名接口、DRM、播放器流、robots/条款禁止或未授权付费必须停止。

禁止修改 Referer、Cookie、浏览器身份、签名参数或抓取播放流。禁止下载与 Asset Request 媒体类型不符的文件。

## 技术门禁

- 图片记录真实尺寸、格式、大小、SHA-256、水印状态、9:16 裁切、主体保护、全屏适用性和质量等级。
- 视频记录尺寸、fps、时长、编码、音频编码、大小、SHA-256、水印、解码状态、9:16 裁切和质量等级。
- 水印或主体保护无法可靠自动判定时必须为 `blocked`，不得假定通过。
- 网页缩略图或播放器预览图不得评为 A 级。

## 语义与去重

必须检查品牌、车型、场景、旁白支持、潜在误导、通用品牌素材和 SHA-256 重复。车型或画面语义无法由可靠证据确认时，自动标记 `blocked`。

## 入库

只登记已经存在的本地文件。素材记录必须同时具有 source → file → asset 链路、SHA-256、完整版权状态与技术结果。`unverified` 只能进入 quarantine，`prohibited` 不得下载或入候选 Manifest。

## 回退

真实视频无法合法获取时，依次标记官方高清静态图、verified data 动画、原创程序化视觉的回退需求；不得自动扩展已批准 Asset Request。缺口必须记录 `missing_real_asset` 与 `editorial_fallback_required`。
