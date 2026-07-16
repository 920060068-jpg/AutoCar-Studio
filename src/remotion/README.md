# Remotion Architecture Boundary

## 职责

Remotion 是视频项目、主时间线和最终输出的唯一权威。它未来负责组合新闻素材、Motion Components、旁白、BGM、环境音、字幕和必要主持片段，并按 RenderConfig 产生最终媒体文件。

Remotion 不负责事实核验、素材授权、生成主旁白或创建 HyperFrames 局部动画。

## 项目结构

```text
VideoProject
├── Scene[]
│   └── Shot[]
├── Audio
├── Caption
└── RenderConfig
```

### VideoProject

根聚合对象，绑定 `job_id`、revision、Storyboard、Asset Manifest、Motion Plan、音频计划、字幕和 RenderConfig。它负责版本锁定和总时长一致性。

### Scene

叙事章节，例如 Hook、事实、分析、比较和结尾。Scene 只组织 Shot，不持有独立真实时钟。

### Shot

最小时间线单元，绑定 `shot_id`、起始帧、持续帧、素材、Motion Component、首帧和转场。

### Audio

包含 MiniMax 沉曜男声旁白、BGM、环境音和车辆音效轨道，以及增益、淡入淡出、ducking 和同步标记。

### Caption

包含逐条字幕时间、层级、关键词、数字、来源标记和安全区。字幕文本必须与批准旁白一致。

### RenderConfig

定义分辨率、帧率、视频编码、音频编码、色彩、输出路径和确定性渲染参数；结构见 `../../templates/render_config.yaml`。

## 输入与输出

- Input：已批准 Storyboard、Asset Manifest、Motion Components、Audio Plan、Caption 数据和 RenderConfig。
- Future Output：最终视频、字幕文件、渲染日志、代表帧和校验和。

## 必读

- `../../rules/remotion.md`
- `../../rules/remotion_engine.md`
- `../../rules/audio.md`
- `../../rules/subtitles.md`
- `../../rules/subtitle_engine.md`
- `../../rules/quality_control.md`
- 已批准的 `../../brand_styles/*.yaml`

## 当前状态

Phase 6 已建立最小 React/Remotion 工程：`index.ts` 注册根组件，`Root.tsx` 声明 1080×1920、30 fps、30 秒的合成测试项目，`VideoProject.tsx` 组合 Scene、Shot 和 Caption。`AudioTrack` 只提供本地音轨接口，当前未绑定任何音频。

依赖仅声明在 `../../package.json`，尚未安装；因此本目录当前不能预览或渲染。测试画面是合成工程标识，不含新闻、汽车素材、旁白或正式视频内容。
