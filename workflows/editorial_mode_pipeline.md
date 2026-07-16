# Editorial Mode Pipeline

## 目标与边界

在官方视频无法合法取得时，把已批准脚本转换为动态新闻评论分镜，同时保持事实、版权、技术质量和自动审核门禁。

执行链：Blocked Official Video → Trigger Evidence → Editorial Storyboard Revision → New Preview Plan → Automatic Review。

## 1. Trigger Evidence

### Input

- 已批准脚本与原 Storyboard。
- 技术检测报告、版权审核清单或 blocked Asset Manifest。

### Validation

- 失败原因必须是合法获取失败或授权不明，而不是搜索不足。
- 一旦触发，受限视频搜索必须停止，`wait_for_pr_assets` 必须为 false。

## 2. Editorial Storyboard

### Process

- 保持批准脚本、时间线、claim 映射和评论边界不变。
- 用新闻图片证据层、verified data 动画、信息图、时间轴、参数卡、地图或标题动画重新设计动态主干。
- 每个含官方新闻图片的镜头都提供不依赖该图片的程序化回退方案。
- 新建素材请求 ID、预览路径、revision 与 stage_run_id；旧文件不得覆盖。

### Validation

- 不含 `real_vehicle_media` 或受限视频请求。
- 不出现图片轮播、PPT 或一句话一张图。
- 所有数据图形绑定 verified data；未核验参数不得进入画面。
- 新预览状态为 `pending`；不得沿用旧批准校验和。

## 3. Automatic Review

自动审核新的视觉逻辑、预览、权利状态和事实画面一致性。版权例外不得自动放行；证据不足时直接 `blocked`。通过前不得进入渲染。
