# V4 Stable Operations

## 每日运行

1. 在仓库根目录执行 `npm run daily:check`。
2. `wait` 表示尚未到本地 12:00；`start` 表示今天可开始；`resume` 表示从 checkpoint 继续；`locked` 表示已有同日实例；`already_complete` 表示今天已完成。
3. 只有 `start` 才运行 `npm run daily:run`，只有 `resume` 才运行 `npm run daily:resume`。禁止并行启动第二个同日任务。
4. 达到 `release_candidate` 后停止。Release Candidate 不是发布授权。

## 音频运行边界

正式 MiniMax TTS 前必须具备 Timing Budget、Audio-Fit Script、数字语义分类、发音词典解析、独立 `tts_text`、速度校准、字幕时间草案、Audio Preflight PASS、Picture Lock 和 live probe PASS。任何一项缺失都不得调用 TTS。

MiniMax 中断时保存 checkpoint，状态改为 `audio_blocked`。恢复时先验证 checkpoint 和请求指纹缓存，只处理未完成或确有变化的段落。不得重做选题、画面或已成功的付费请求。

## 质量门禁

Director Score 与 Final Quality Score 均必须严格大于 90；90 分失败。Fact、Verified Data、Storyboard、Asset/Original Visual、Picture、Picture Lock、Pronunciation、Audio、Sync、Subtitle、Final Render、Technical、Content、Copyright/Editorial Policy 全部 PASS 后才允许输出 Release Candidate。

## 稳定维护

- `main` 只保存稳定版本；不得直接试验新功能。
- 每次变更前运行 `npm run test:regression`，变更后执行完整验证清单。
- `.env`、运行数据库、checkpoint、日志、输出媒体和缓存只保留本地，不进入 Git。
- 不删除有效产物，不覆盖已批准 revision，不自动发布。
