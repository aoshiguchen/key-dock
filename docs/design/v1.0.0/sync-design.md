# 同步设计 v1.0.0（MinIO）

> 三层边界：`minio.ts`（远端 IO）· `merge.ts`（合并）· `storage.ts`（本地 IO）。UI 在 `SyncSection.tsx`。

## 1. 远端对象模型
- 云端只保存**一个完整配置 JSON**对象，不按项目环境拆分。
- 对象 URL：`trimSlash(endpoint) + '/' + join(bucket, pathPrefix, objectKey)`，`objectKey` 缺省 `app-config.json`。`minio.ts:buildObjectUrl`
- `join` 会去除各段首尾斜杠并过滤空段，避免双斜杠导致网关解析出不同对象路径。

## 2. 鉴权与请求
- 鉴权头：`X-MinIO-Access-Key` / `X-MinIO-Secret-Key`（用户自管网关代理，非官方 SDK V4 签名）。仅当两者都存在时附带。
- 操作：
  - `testMinioConnection`：`HEAD`，仅验证可达，不下载 / 不修改。
  - `fetchRemoteConfig`：`GET`，返回远端 `AppConfig`（调用方负责后续校验 / 合并）。
  - `pushRemoteConfig`：`PUT`，body 为 2 空格缩进的完整配置 JSON（整体覆盖远端对象）。
- 失败统一抛带状态码的 Error，由 UI toast / 状态文案呈现。

> 安全说明：endpoint / key / secret 以明文存于 `sync` 并随完整配置存储 / 导出。请求体与远端对象均为明文。导出对话框对是否包含 MinIO 凭据单独确认。

## 3. 合并引擎（`merge.ts:mergeAppConfigs(base, incoming, mode)`）

### 3.1 模式
| mode | 语义 | 是否字段级合并 |
| --- | --- | --- |
| `localOverwrite` | 直接 `clone(incoming)` 覆盖 base，破坏性 | 否 |
| `cloudToLocal` | 云端增量合并到本地，含警告文案 | 是 |
| `localMerge` | 本地与云端按标识合并，含警告文案 | 是 |

### 3.2 合并模式细则（cloudToLocal / localMerge）
- `projectGroups`：按 `code` upsert（incoming 覆盖同 code）。
- `fieldTemplates`：按 `id` upsert。
- `projects`：按 `id` 合并；同 id 项目 `{...prev,...incoming}` 后，
  - `fields` 按 `key` 合并（mergeFields）；
  - `envs` 按 `id` 合并（mergeEnvs）。
- `envs` 合并：`{...prev,...env}` 后特殊处理
  - `hosts` / `pathKeywords`：并集去重；
  - `retryDelays`：incoming 非空取 incoming，否则保留 prev；
  - `accounts`：按 `id` upsert（incoming 同 id 覆盖）。
- `sync`：`{...base.sync,...incoming.sync}` 浅合并。
- `meta.localRevision`：`max(base, incoming) + 1`。
- warnings：`cloudToLocal` → 「云端已覆盖本地同 id 项，本地未删除数据保留」；`localMerge` → 「增量同步不会删除云端额外数据」。

### 3.3 语义结论
- **云端 → 本地（cloudToLocal）**：同标识云端胜，本地独有保留，本地已删而云端仍有的账号被恢复。
- **本地 → 远程（当前 UI = 整体 PUT 覆盖）**：本地删除反映到云端。
- 若未来本地→远程改用 `localMerge`：先 `GET` 云端，与本地合并后 `PUT`，云端额外数据不被删除。

## 4. UI 接线（`SyncSection.tsx`）
- 6 个连接字段即时 `persist` 写本地（不立即触云端）。
- `启用 MinIO` 复选；未启用时测试 / 同步操作提示「未启用 MinIO」并中止。
- `测试连接` → `testMinioConnection`，按钮 disabled 防重复。
- `远程 -> 本地` → `fetchRemoteConfig` → `mergeAppConfigs(config, remote, 'cloudToLocal')` → `persist` 合并结果，warnings 决定 toast 级别。
- `本地 -> 远程` → `pushRemoteConfig(sync, config)`（整体覆盖）→ 更新 `meta.lastSyncedAt` / `remoteRevision` 写回本地。

## 5. 现状与演进
- 当前未在 UI 暴露 `localMerge`（本地→远程合并）；引擎已实现，可作为下一步入口。
- 当前仅 MinIO 单同步通道（`SyncTabKey='minio'`），Tab 结构预留多通道扩展位。
- 无自动同步 / 定时同步；全部由用户主动触发，登录页编辑不上传。

## 6. 失败与一致性
- 任一远端操作失败仅提示，不破坏本地配置。
- 合并产出经 `persist` → `writeAppConfig` → `normalizeAppConfigForRuntime` 落盘，保证结构合法。
- 远端返回数据当前直接进入合并（信任用户自管对象）；如需更强健壮性，可在 `fetchRemoteConfig` 后追加 `validateAppConfig`（后续演进项）。
