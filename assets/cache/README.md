# Asset Cache

本目录预留人工导入过程的本地缓存空间；当前不包含媒体文件，也不执行自动下载。

缓存索引位于 `database/asset_cache.json`。导入前必须用 `scripts/check_asset_cache.ts` 同时检查文件 SHA-256 和规范化来源 URL：命中时复用既有 `asset_id`，禁止再次下载或复制。缓存命中不代表版权、质量或生命周期审核通过。
