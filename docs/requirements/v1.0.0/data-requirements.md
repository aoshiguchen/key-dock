# 数据需求 v1.0.0（以代码为准）

> 权威来源：`src/shared/types.ts`、`defaults.ts`、`config-normalize.ts`、`validate.ts`、`merge.ts`、`column-width.ts`、`minio.ts`。

## 1. 数据对象（AppConfig）

完整配置是单个 `AppConfig` 对象，保存在 Chrome `storage.local` 的 `appConfig` 键。

```ts
type AppConfig = {
  schemaVersion: string;        // 固定 '1.0'
  global: GlobalConfig;         // 全局设置 + 外观
  projectGroups: ProjectGroup[];// 项目分组，必含 default
  fieldTemplates: FieldTemplate[]; // 可复用字段模板
  projects: ProjectConfig[];    // 项目列表
  sync: SyncConfig;             // MinIO 同步配置
  meta?: ConfigMeta;            // 元信息（修订号/时间戳）
};
```

### 1.1 GlobalConfig / AppearanceConfig
```ts
type GlobalConfig = {
  showLoginAccountPanel: boolean;          // 登录页是否显示账号浮窗
  showAccountPickerOnInputClick: boolean;  // 点击输入框是否弹账号选择器
  appearance: AppearanceConfig;
};
type AppearanceConfig = {
  theme: 'tech-dark' | 'minimal-light' | 'vivid-color';
  fontScale: 'small' | 'medium' | 'large';
  enableMotion: boolean;
};
```
默认值：`showLoginAccountPanel=true`、`showAccountPickerOnInputClick=true`、`theme='minimal-light'`、`fontScale='medium'`、`enableMotion=true`。

### 1.2 ProjectGroup
```ts
type ProjectGroup = { code: string; name: string; description?: string };
```
- `code` 为稳定标识；必须存在 `code='default'`（名称「默认分组」）。
- `code` 在配置内唯一。

### 1.3 FieldConfig / FieldTemplate
```ts
type FieldType = 'input' | 'display';
type FieldConfig = {
  key: string;          // 账号 values 的映射键，项目内唯一
  label: string;        // 显示名称
  type: FieldType;
  selector?: string;    // input 必填；display 不需要（规范化时删除）
  sensitive: boolean;   // 是否敏感，默认隐藏展示
  required?: boolean;   // 是否必填（账号校验用）
  copyable?: boolean;   // 是否可复制，缺省视为 true
  width?: number | string;
  minWidth?: number;
  maxWidth?: number;
  order?: number;       // 列排序
};
type FieldTemplate = { id: string; name: string; fields: FieldConfig[] };
```
字段规则：
- 每个项目字段数 > 0；字段 key 项目内唯一。
- 字段不限定为账号 / 密码，数量任意。
- `display` 字段用于备注 / 状态 / 标签等，仅展示不填充。
- 密码类字段（key/label 含 password、pwd、密码、口令等）若 `input` 且未配 selector，规范化时尝试从「带 password 选择器的 display 字段」回退取用，兼容旧手写配置。`config-normalize.ts:31`
- 模板：id 非空且唯一、名称非空、至少 1 个字段、字段 key 不重复。

### 1.4 EnvConfig
```ts
type EnvConfig = {
  id: string;            // 项目内唯一
  name: string;
  hosts: string[];       // host 匹配列表
  pathKeywords: string[];// path 关键字列表
  retryDelays: number[]; // 填充重试延迟（毫秒）
  accounts: AccountRecord[];
};
```
- 环境定位由「项目 id + 环境 id」共同确定。
- 匹配规则见功能需求 §2.1。

### 1.5 AccountRecord
```ts
type AccountRecord = {
  id: string;                       // 项目环境内唯一
  values: Record<string, string>;   // key→值，对应项目字段 key
  isDefault: boolean;               // 同环境最多 1 个
  updatedAt: string;                // ISO 时间，供同步/冲突参考
};
```
- 展示型字段值也写入 `values`，仅展示不参与填充。
- 保存时 `values` 经 `normalizeAccountValues` 对齐到项目字段集合（缺失补空、移除多余）。

### 1.6 SyncConfig / ConfigMeta
```ts
type SyncConfig = {
  minioEnabled: boolean;
  endpoint?: string; bucket?: string;
  accessKey?: string; secretKey?: string;
  pathPrefix?: string; objectKey?: string;
};
type ConfigMeta = {
  lastUpdatedAt?: string; lastSyncedAt?: string;
  localRevision?: number; remoteRevision?: number;
};
```
- 本地写操作（saveProject/Field/Env/Account 等）会更新 `lastUpdatedAt` 并自增 `localRevision`。`config-ops.ts`

## 2. 本地存储与校验

### 2.1 存储
- 键：`appConfig`（完整配置）、`extensionEnabled`（插件总开关，独立键）。
- 读取经 `normalizeAppConfigForRuntime` 容错补齐；写入前同样规范化。`storage.ts`
- 无 storage 环境（如纯页面调试）回退到 `DEFAULT_CONFIG`。

### 2.2 严格校验（import / 保存 JSON 边界，`validate.ts`）
仅在导入 / 保存完整 JSON 等边界严格校验，防止非法数据覆盖有效配置：
- `schemaVersion` 必须等于 `1.0`。
- `projects`/`projectGroups`/`fieldTemplates` 必须为数组，`global`/`sync` 必须为对象。
- `global.appearance`：theme / fontScale / enableMotion 合法。
- 分组：code 不重复、必含 `default`、每组 code / name 非空。
- 模板：id 不重复、名称非空、≥1 字段、字段 key 不重复、字段本身合法。
- 项目：id 非空且不重复、名称非空、`groupCode` 非空且存在、`popupPosition`（若有）合法、≥1 字段且 key 不重复、≥1 环境且 id 不重复。
- 字段：key / label 非空、type 合法、`input` 必须有 selector、minWidth/maxWidth > 0 且 minWidth ≤ maxWidth。
- 环境：id / name 非空、hosts 与 pathKeywords 非空、**accounts 非空且 id 不重复**、默认账号 ≤1。
- 账号：id 非空、必须包含每个字段 key、`required` 字段值非空。

> 注：运行时规范化（`normalizeAppConfigForRuntime`）是「宽容补齐」，严格校验是「边界拒绝」，两者职责分离，改数据结构需同步两处。

## 3. 云端数据（MinIO）
- 可选；仅启用并配置后访问。
- 云端保存单个完整配置 JSON（对象名默认 `app-config.json`），不按项目环境拆分。
- 不兼容、不迁移旧 `{projectId}-{envId}.json` 格式。
- 连接信息明文保存，参与导入导出（导出时可选是否包含）。
- 鉴权：HTTP 头 `X-MinIO-Access-Key` / `X-MinIO-Secret-Key`；URL = `trim(endpoint)/join(bucket, pathPrefix, objectKey)`。

## 4. JSON 导入导出

### 4.1 导出（`exportConfigSubset`）
- 项目子集：传入 `projectIds` 则只导出选中项目，空数组导出全部。
- `includeMinio=false` 时用 `stripMinio` 仅保留 `{ minioEnabled: false }`，清除其余连接信息。
- `includeAppearance=false` 时删除 `global.appearance`。
- 文件名固定 `web-account-config.json`，内容为 2 空格缩进 JSON。

### 4.2 导入
- 流程：读取文件文本 → `JSON.parse` → `normalizeAppConfigForRuntime` → `validateAppConfig`。`json.ts`
- 校验通过则写入本地（覆盖现有配置）；失败列出错误，不改动现有配置。
- **当前实现不区分「本地为空 / 非空」，也不提供「覆盖 / 增量」选择**（与 v0.4 §4.3 草案不同）。如需增量合并，可走「数据同步」模块或后续版本扩展。

## 5. 同步合并规则（`merge.ts`）

### 5.1 稳定标识
- 项目：项目 `id`。
- 环境：项目 `id` + 环境 `id`。
- 字段：项目 `id` + 字段 `key`。
- 账号：项目 `id` + 环境 `id` + 账号 `id`。
- 分组：`code`。模板：`id`。

### 5.2 三种模式
- `localOverwrite`：直接用来源完整配置覆盖目标，不做字段级合并（破坏性，本地→远程整体覆盖等价语义）。
- `cloudToLocal` / `localMerge`（合并）：
  - 分组、模板按标识 upsert（同标识来源覆盖）。
  - 项目按 id 合并；同 id 项目的 `fields` 按 key 合并、`envs` 按 id 合并。
  - 环境合并：`hosts`/`pathKeywords` 取并集去重、`retryDelays` 来源非空则取来源否则保留、`accounts` 按 id upsert（同 id 来源覆盖）。
  - `sync` 浅合并；`meta.localRevision` 取双方较大值 +1。
  - `cloudToLocal` 提示「云端已覆盖本地同 id 项，本地未删除数据保留」；`localMerge` 提示「增量同步不会删除云端额外数据」。
- 合并语义结论：
  - 云端→本地：同 id 云端胜，本地独有保留；本地已删但云端仍有的账号会被「恢复」。
  - 本地→远程（当前 UI 为整体 PUT 覆盖）：本地删除会反映到云端；若改用合并模式则云端额外数据不被删除。

## 6. 列宽规则（`column-width.ts`）
- 配置了合法 `width`（>0）则用固定宽度。
- 否则按表头与各单元格内容估算宽度（中文按 2、其他按 1 计权，`字符权重*8+24`），取 `max(表头, 内容, minWidth, 96)`，再以 `maxWidth` 上限收口。
- 非法 / 缺省宽度回退自动计算，尽量减少留白同时保持列对齐。

## 7. 数据安全
- 明文存储：本地配置、导出 JSON、配置页完整 JSON、云端配置、MinIO 连接信息均可能含明文。
- 敏感字段默认隐藏，临时显示 10s 自动恢复。
- 复制、导出、编辑完整 JSON、同步到云端等操作应提示敏感数据风险。

## 8. 推荐结构示例（实际 schema）
```json
{
  "schemaVersion": "1.0",
  "global": {
    "showLoginAccountPanel": true,
    "showAccountPickerOnInputClick": true,
    "appearance": { "theme": "minimal-light", "fontScale": "medium", "enableMotion": true }
  },
  "projectGroups": [{ "code": "default", "name": "默认分组", "description": "" }],
  "fieldTemplates": [],
  "projects": [
    {
      "id": "github",
      "name": "GitHub",
      "groupCode": "default",
      "popupPosition": "top-right",
      "fields": [
        { "key": "login", "label": "登录名", "type": "input", "selector": "#login_field", "sensitive": false, "required": false, "copyable": true, "minWidth": 120, "maxWidth": 220 },
        { "key": "password", "label": "密码", "type": "input", "selector": "#password", "sensitive": true, "required": true, "copyable": true },
        { "key": "note", "label": "备注", "type": "display", "sensitive": false, "copyable": true, "minWidth": 120, "maxWidth": 280 }
      ],
      "envs": [
        {
          "id": "main", "name": "官网",
          "hosts": ["github.com"], "pathKeywords": ["/login"],
          "retryDelays": [0, 500],
          "accounts": [
            { "id": "account-uuid", "values": { "login": "user@example.com", "password": "***", "note": "主账号" }, "isDefault": true, "updatedAt": "2026-05-12T00:00:00+08:00" }
          ]
        }
      ]
    }
  ],
  "sync": { "minioEnabled": false },
  "meta": { "localRevision": 1 }
}
```
