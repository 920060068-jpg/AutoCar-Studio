# Asset Matcher

## 职责

Asset Matcher 将已批准分镜与本地资产数据库匹配，输出可供验证的 `asset_manifest.yaml` 实例。它只能选择已有且通过硬门禁的资产，不能搜索或下载网络素材。

## 输入

- 已批准的 `templates/storyboard.yaml` 实例。
- `database/assets.json` 的锁定 revision。
- Asset Quality Scorer 结果、版权证明和历史使用信息。

## 匹配逻辑

1. 从每个 `shot_id` 提取素材类型、分类、品牌/车型、视觉目的、动作、画幅、时长、光线和必要性。
2. 硬过滤文件不存在、生命周期非 `active`、校验和异常、版权非 `cleared/project_owned`、授权范围不含目标平台或商业用途、质量失败和水印异常的候选。
3. 在剩余候选中按语义匹配、技术质量、来源可追溯性、连续性和授权风险排序。
4. 使用 `used_count`、`last_used` 和当前清单 SHA-256 降低无意义重复，但不得为了多样性选择语义更差的素材。
5. 记录所有候选、淘汰原因和最终选择理由；没有合格候选时输出 `blocked` 和新的素材请求，不得强行匹配。

## 输出

- 符合 `templates/asset_manifest.yaml` 的清单。
- 每个匹配至少包含 `shot_id`、`asset_id`、`source`、`license`、`quality` 和 `status`。
- 素材缺口、候选淘汰理由和数据库 revision。

## Validation

- 每个必需镜头恰好有可读取的主资产，并允许显式的附加资产。
- Manifest 中的文件路径、SHA-256、来源、许可和质量必须与数据库 revision 一致。
- 同一文件跨镜头复用必须记录理由；连续静态复用不能冒充动态叙事。
- 任一必需镜头无匹配时整个清单保持 `blocked`，不得进入 Render。

## 禁止事项

- 禁止修改已批准分镜来迁就现有素材。
- 禁止自动下载、调用商业素材 API、移除水印、伪造版权或静默采用低质量候选。
- 禁止用 PPT、图片轮播或一句话一张图填补素材缺口。
