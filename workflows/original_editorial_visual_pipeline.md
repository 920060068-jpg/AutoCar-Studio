# Original Editorial Visual Pipeline

## 目标与边界

在外部汽车图片和视频无法合法取得时，用完全原创、可披露、可追溯的动态图形表达已批准汽车新闻评论。该流程不搜索或下载素材，不生成拟真实车图，不调用音频或视频供应商，不渲染。

执行链：Blocked External Media → Approved Script And Facts → Original Storyboard Revision → Original Visual Manifest → Programmatic Preview Frames → Director Review → Automatic Picture Review。

## 输入

- 已批准或已明确锁定的 Script、Fact Check 与 verified data。
- 上一版 Storyboard 与 Director Review。
- blocked 素材 Manifest、版权报告和技术报告。
- `../rules/original_editorial_visual.md`、`../rules/storyboard.md` 与品牌样式。

## 输出

- 新 Storyboard revision，不覆盖旧版本。
- Original Visual Manifest。
- 15张非实拍程序化首帧与 Contact Sheet。
- Director Review、PPT风险、信息密度、视觉重复、事实误导和Retention预测。

## 验证

- 外部素材依赖、外部 URL、网页截图和拟真实车图均为零。
- 时间线连续，总时长38—43秒，每镜一个核心观点。
- 每个数据动画只绑定 verified data。
- 连续版式、三秒变化、PPT、信息密度和误导风险门禁通过。
- Director Score 必须严格大于90；90分不通过。

## 自动 Picture Review

自动核对事实与示意边界、品牌文字使用、首帧、节奏和互动结尾。全部门禁通过后授予 Picture Lock；此前 `render_allowed` 必须保持 `false`。
