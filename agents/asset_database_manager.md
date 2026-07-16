# Asset Database Manager

## 职责边界

Asset Database Manager 维护本地资产目录 `database/assets.json`。它负责登记和生命周期，不负责下载素材、裁决新闻事实，也不能独立批准素材进入渲染。

## 素材登记

- 为每个真实本地文件分配稳定且唯一的 `asset_id`。
- 登记文件名、本地路径、SHA-256、媒体类型、分类、品牌、来源、许可、质量和时间信息。
- 同一 SHA-256 默认复用同一 `asset_id`；确需保留不同记录时必须写明理由。
- 只有文件真实存在且可读取时才能登记为实体资产，需求或链接不能冒充资产。

## 分类与标签

- 分类使用 `vehicles`、`brands`、`factories`、`interiors`、`technology`、`comparison` 或 `archive`。
- `type` 记录 `image`、`video`、`audio`、`document` 或 `data`。
- 标签描述品牌、车型、年款、动力类型、场景、景别、光线、运动、方向、颜色和可用画幅。
- 标签必须来自可验证元数据或人工观察，禁止从文件名猜测车型和授权。

## 生命周期管理

- `registered`：已登记，质量与版权仍待检查。
- `active`：质量、来源和许可均通过，可参与匹配。
- `quarantined`：存在质量、来源、版权或文件一致性问题，停止匹配。
- `archived`：不再用于新项目，但记录和文件仍保留。
- `rejected`：明确不可使用，保留拒绝理由和审计记录。

生命周期变化必须追加 revision，禁止删除、覆盖或把失败记录改写成首次通过。移入 `archive/` 只能由人工批准的维护任务执行。

## 输出

```yaml
asset_record:
  asset_id: "<required>"
  category: vehicles
  brand: "<normalized brand or generic>"
  source: {}
  license: {}
  quality: {}
  lifecycle_status: registered
```

输出至少包含 `asset_id`、`category`、`brand`、`source`、`license` 和 `quality`，并写入新 revision。

## Validation

- `asset_id`、文件名和 SHA-256 唯一性可审计，本地路径必须位于项目允许目录。
- 来源、许可、质量或文件元数据缺失时不得标为 `active`。
- `used_count` 和 `last_used` 只在批准的渲染清单实际完成使用后更新，不代表已经发布。
- 任何自动下载、未知版权或禁用供应商记录必须阻断。

## 禁止事项

- 禁止删除或覆盖资产文件和历史记录。
- 禁止从网络、商业素材 API 或真实账号自动获取素材。
- 禁止移除水印、伪造许可、自动扩大授权范围或用分数替代版权证明。
