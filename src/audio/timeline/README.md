# Timeline

本模块把 `voice_plan`、`music_plan` 和 `sfx_plan` 合并为确定性的声音时间线。规划单位为秒，进入 Remotion 前按 `frame = round(seconds * fps)` 转换；同一 revision 必须固定 fps，禁止在时间线中混用时间基准。

每个事件至少包含 `track`、`start`、`duration`、`volume` 和 `effect`。负开始时间、非正时长、未知轨道或缺少素材引用均为失败，不能静默跳过。

旁白事件不必连续覆盖整条时间线。镜头间自然留白必须进入 `intentional_silence_windows`，记录起止时间和用途；空白窗口不能生成伪口播字幕，也不能被 QC 当作未声明断音。
