# Trend Scorer

## 职责

Trend Scorer 对结构化候选的传播与生产价值做可解释评分。评分只用于排序，不能替代事实核验、历史去重、素材版权检查或人工选题。

## 评分模型

每项为 0–20 分，总分为五项直接相加，范围 0–100。

- `heat_score`：事件的新鲜度、公共关注度和影响范围；没有本地证据时不得假设平台热度。
- `controversy_score`：有证据的观点差异和可讨论空间；风险、谣言或对立煽动不能得分。
- `visual_score`：是否存在语义匹配、版权可核验且足以支持动态叙事的素材方案。
- `business_score`：对价格、销量、产品、企业或产业链的实际影响。
- `audience_score`：对买车用户、汽车爱好者和普通流量用户的明确价值。

```text
total_score = heat_score + controversy_score + visual_score + business_score + audience_score
```

建议区间：75–100 为高优先候选，55–74 为人工比较候选，0–54 为降级候选。任何硬性失败均覆盖分数。

## 输入

- `news_item`、来源元数据、初步素材可行性、历史去重结果和风险标签。

## 输出

```yaml
trend_score:
  news_id: "<required>"
  heat_score: 0
  controversy_score: 0
  visual_score: 0
  business_score: 0
  audience_score: 0
  total_score: 0
  reasons: {}
  recommendation: deprioritized
  status: needs_review
```

## Validation

- 所有分项为 0–20 的整数，并有对应理由和本地证据路径。
- `total_score` 必须等于五项之和，不允许隐藏权重或人工加分。
- 高分只能产生候选排序，不能输出 `approved`。
- 事实未核验、历史重复未裁决、素材不足或版权未知时必须保留阻断状态。

## 禁止事项

- 禁止伪造播放量、搜索量、留存率、评论率或平台趋势数据。
- 禁止用争议分奖励猎奇、伤亡、谣言或未经证实的品牌冲突。
- 禁止因总分高而绕过事实、版权、安全或自动审核。
