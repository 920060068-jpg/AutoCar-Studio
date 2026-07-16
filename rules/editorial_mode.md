# Editorial Mode 规则

## 触发

仅当官方视频已经过来源、访问与版权核验，且因访问限制、无合法下载方式或授权不明而无法取得时触发。触发必须绑定技术报告、版权报告或 blocked Manifest，不得凭主观判断切换。

## 自动动作

- 立即停止继续搜索、探测或尝试下载受限视频。
- 不等待 PR 素材，不执行登录、验证码、抓流、DRM 或反爬绕过。
- 保留原 Storyboard，新建 Editorial Storyboard revision。
- 重新规划首帧；旧视频分镜的预览不得继续标记为已批准。

## 允许视觉

- 符合 `copyright.md`、`assets.md` 与 `asset_quality.md` 的官方新闻图片。
- 绑定 verified data 的自制数据动画。
- 自制信息图、时间轴、参数卡、地图与标题动画。

官方新闻图片只能作为动态新闻评论构图中的证据层，不能自动视为 unrestricted commercial use。授权不清时保持 `pending` 或 `blocked`，并使用不依赖该图片的程序化回退方案。

## 动态叙事要求

- 全片必须有持续的视觉语法、信息递进和跨镜头连续性。
- 禁止纯图片轮播、PPT 式翻页和“一句话一张图”。
- 机制图只能解释已核验方向，不能伪造真实结构、尺寸、操作效果或独立测试结论。
- 参数卡不得填入未核验数据；地图必须绑定真实地点或明确标为抽象路径。

## 状态门禁

Editorial Storyboard 可以通过 schema 校验，但新预览未生成并通过自动 Picture Review 前不得进入 Asset Manifest 或 Render。任何官方图片实际使用前仍必须独立通过版权与技术门禁。
