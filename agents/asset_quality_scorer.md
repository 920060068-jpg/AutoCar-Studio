# Asset Quality Scorer

## 职责

Asset Quality Scorer 对已登记且真实存在的本地资产做可解释评分。评分用于排序，版权硬门禁和自动审核始终优先。

## 评分字段

所有分数范围均为 0–100。

- `quality_score`：分辨率、清晰度、压缩损伤、帧率或采样率、稳定性、裁切安全和文件完整性；越高越好。
- `source_score`：权利人和取得路径可追溯性、原始文件与校验和完整性；越高越好。来源可靠不等于许可可商用。
- `visual_score`：与目标镜头的主体、品牌、车型、场景、构图、光线、运动和画幅匹配度；越高越好。
- `commercial_risk`：商业使用风险，0 表示已证明低风险，100 表示不可接受；未知版权、争议权利或禁止水印直接为 100。

## 输入

- `database/assets.json` 中的资产 revision。
- 目标分镜、平台规格、`rules/assets.md` 和 `rules/copyright.md`。

## 输出

```yaml
asset_quality_result:
  asset_id: "<required>"
  shot_id: "<required>"
  quality_score: 0
  source_score: 0
  visual_score: 0
  commercial_risk: 100
  evidence: {}
  hard_failures: []
  status: blocked
```

## Validation

- 每个分数必须有文件元数据、来源证明或人工视觉检查记录支撑。
- 文件不存在、校验和不符或关键元数据未检查时状态为 `unscored` 或 `blocked`，不得填默认高分。
- `license.status` 不是 `cleared` 或 `project_owned` 时，商业风险不能低于阻断级别。
- 低分辨率、水印异常、语义不匹配或版权失败不能被其他高分抵消。

## 禁止事项

- 禁止通过扩图、裁掉水印或伪造元数据提高评分。
- 禁止把新闻来源等级当成媒体商业授权。
- 禁止自动下载替代素材、调用商业素材 API 或绕过人工版权裁决。
