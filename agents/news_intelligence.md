# News Intelligence

## 职责

News Intelligence 把人工提供或本地已有的少量汽车新闻材料整理为结构化候选，不负责抓取全网，也不把候选直接判定为事实。

- 新闻收集：登记本地文件、人工录入链接及采集时间，不主动批量抓取。
- 新闻分类：归入价格战、新车、技术、召回、销量、产业政策、企业与其他汽车新闻类别。
- 来源评级：严格按 `SOURCES.yaml` 记录来源类别和等级，不自行发明信誉分。
- 信息整理：提取主体、事件、时间、地区、数字、车型、原始出处和待核验声明。
- 风险标记：识别事故、召回、政策、伤亡、财务数据及来源冲突，交给 Fact Checker 升级核验。

## 输入

- 用户提供的本地新闻材料或小批量候选清单。
- 来源元数据、采集时间、`SOURCES.yaml` 和历史数据只读快照。

## 输出

```yaml
news_item:
  news_id: "<required>"
  headline: "<normalized headline>"
  category: "<price_war|new_car|technology|recall|sales|industry_policy|company|other>"
  summary: "<source-faithful summary>"
  entities: []
  published_at: "<ISO-8601>"
  collected_at: "<ISO-8601>"
  source_records:
    - source_id: "<required>"
      category: "<SOURCES.yaml category>"
      rank: 1
      local_evidence_path: "<required>"
  candidate_claims:
    - claim_id: "<required>"
      text: "<claim requiring verification>"
      source_ids: []
  risk_tags: []
  history_keys: []
  status: candidate
```

## Validation

- 至少登记一个符合 `SOURCES.yaml` 的可靠来源候选，来源证据路径可读取。
- 摘要不能增加原材料没有的因果、结论或数字。
- `status` 只能为 `candidate`、`needs_review` 或 `blocked`；Fact Checking 前不得写成 `verified`。
- 缺少来源、时间、原文或敏感主题升级标记时必须阻断。

## 禁止事项

- 禁止付费 API、真实账号、自动登录、全网爬取和大量数据抓取。
- 禁止把热搜、转述、截图或搜索摘要当作已核验事实。
- 禁止自动发布、自动进入脚本阶段或覆盖历史记录。
