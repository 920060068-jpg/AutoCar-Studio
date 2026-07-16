# Media Acquisition Pipeline

## 目的

把已批准的 Asset Request 转换为可审核、可追溯的品牌官方素材候选包。

## 输入

- approved script
- approved storyboard
- approved Asset Request
- verified data
- `config/media_sources.yaml`
- `rules/assets.md`
- `rules/asset_quality.md`
- `rules/copyright.md`
- `rules/media_acquisition.md`

## 顺序

1. `media:discover`：验证 acquisition gate，逐 shot 生成任务，访问实际来源页，保存来源清单。
2. 权利预分类：根据用途说明和限制分类；缺少说明一律 `unverified`。
3. `media:acquire`：仅下载明确合法入口，保留来源页与文件关系；受限请求立即停止。
4. `media:inspect`：计算 SHA-256，读取真实技术参数，检查解码、裁切、水印与质量状态。
5. 语义匹配：核对品牌、车型、场景、旁白支持、误导和重复。
6. 入库：仅把存在本地文件且链路完整的候选写入数据库；授权不明文件隔离。
7. `media:manifest`：根据 Storyboard 生成候选 Manifest 和缺口，不以程序化视觉静默替代失败项。
8. 生成 Contact Sheet 与自动版权/技术审核清单。

## 停止条件

- Asset Request 未批准或 acquisition 未允许。
- Storyboard/Asset Request revision 不一致且无法追溯。
- 401/403、登录、验证码、反爬、签名 URL、DRM、播放器流或条款禁止。
- 文件不可解码、低清缩略图、明显水印、车型/语义不匹配或 SHA-256 重复。

停止不等于跳过。必须在报告中记录 URL、shot、原因和建议的 editorial fallback。

## 输出

每次运行使用新的 acquisition revision，禁止覆盖历史输出。只有全部强制项拥有可用权利状态、技术通过、语义通过和自动版权审核批准时，Manifest 才能进入 `ready_for_automatic_review`；否则保持 `blocked`。
