# Local Foundation Data

本目录只保存本地、可审计的数据样例和未来运行数据入口。现有 `*.sample.yaml` 均为合成测试内容，不代表真实新闻，也不得发布。

- `data/topics.sample.yaml`：测试主题去重。
- `data/storyboard.sample.yaml`：测试分镜结构和时间线。
- `data/assets.sample.yaml`：测试素材存在性、版权和校验和字段。
- `data/qc.sample.yaml`：测试 QC 报告结构和自动审核门禁。
- `data/topic_history.json`：追加式记录已审核选题和历史去重特征。
- `data/hook_history.json`：追加式记录已批准 Hook、事实映射和受众方向。
- `data/style_history.json`：追加式记录叙事风格、情绪曲线和冲突类型。

真实运行数据应写入被 Git 忽略的 `data/runtime/`，并使用新的 `job_id` 和 revision；不得覆盖样例或旧运行记录。

三类历史 JSON 当前只定义 schema、用途和更新规则，不包含真实平台指标。没有本地证据时不得写入 observed 表现。
