# 数据模型设计 v1.0.0

> 类型权威来源 `src/shared/types.ts`；默认值 `defaults.ts`；规范化 `config-normalize.ts`；校验 `validate.ts`。

## 1. 模型总览

```
AppConfig
├─ schemaVersion: '1.0'
├─ global: GlobalConfig { showLoginAccountPanel, showAccountPickerOnInputClick, appearance{theme,fontScale,enableMotion} }
├─ projectGroups: ProjectGroup[] { code, name, description? }     // 必含 default
├─ fieldTemplates: FieldTemplate[] { id, name, fields[] }
├─ projects: ProjectConfig[]
│   ├─ id, name, groupCode?, popupPosition?
│   ├─ fields: FieldConfig[] { key, label, type, selector?, sensitive, required?, copyable?, width?, minWidth?, maxWidth?, order? }
│   └─ envs: EnvConfig[] { id, name, hosts[], pathKeywords[], retryDelays[], accounts[] }
│       └─ accounts: AccountRecord[] { id, values{key:val}, isDefault, updatedAt }
├─ sync: SyncConfig { minioEnabled, endpoint?, bucket?, accessKey?, secretKey?, pathPrefix?, objectKey? }
└─ meta?: ConfigMeta { lastUpdatedAt?, lastSyncedAt?, localRevision?, remoteRevision? }
```

辅助类型：`MatchedEnvironment{project,env,fields}`、`SyncMode='cloudToLocal'|'localOverwrite'|'localMerge'`、`SyncResult{config,warnings}`、`PopupPosition`（9 锚点）。

## 2. 稳定标识体系
| 对象 | 标识 | 用途 |
| --- | --- | --- |
| 分组 | `code` | upsert / 项目归属 |
| 模板 | `id` | upsert |
| 项目 | `id` | upsert / 同步合并 |
| 环境 | 项目`id`+环境`id` | 合并、页面定位 |
| 字段 | 项目`id`+字段`key` | values 映射、合并 |
| 账号 | 项目`id`+环境`id`+账号`id` | 合并、默认账号、填充 |

ID 生成：`createId(prefix)` 优先 `crypto.randomUUID()`，回退时间戳 + 随机。`shared/id.ts`

## 3. 读写与规范化双闸

### 3.1 写入路径
- `config-ops.ts` 提供不可变更新：`saveProject/removeProject/saveField/removeField/saveEnv/removeEnv/saveAccount/removeAccount/setDefaultAccount`。
  - 全部 `cloneConfig` 后修改，更新 `meta.lastUpdatedAt` 并自增 `localRevision`。
  - `saveAccount` 在 `isDefault=true` 时将同环境其他账号置否，保证默认唯一。
- `storage.writeAppConfig` 落盘前再次 `normalizeAppConfigForRuntime`。

### 3.2 运行时规范化（宽容补齐）`config-normalize.ts`
- 缺失 `global` / `appearance` 补默认；两个开关按 `!== false` 容错为真。
- `projectGroups` 缺失补空并确保含 `default`。
- `fieldTemplates` 缺失补空。
- 每个项目：非法 `popupPosition` 回退默认；`groupCode` 缺失 / 不存在回退 `default`；`fields` 经 `normalizeFields`。
- `normalizeFields`：`copyable` 缺省为真；密码类 `input` 字段无 selector 时从 display 字段的密码选择器回退；display 字段删除 selector。
- `resolveFillSelector`：填充时即时计算选择器（不改原字段列表）。

### 3.3 严格校验（边界拒绝）`validate.ts`
- 仅用于导入 / 保存完整 JSON（`json.parseAppConfigText` → `validateAppConfig`）。
- 规则要点（详见需求 data-requirements §2.2）：schemaVersion=1.0；分组含 default 且 code 唯一；模板 / 项目 / 环境 / 字段 / 账号的非空、唯一、依赖、默认唯一、input 必有 selector、宽度合法、环境 accounts 非空等。
- 失败返回 `ValidationError[]`，UI 以 `path: message` 呈现，且不覆盖现有配置。

> 设计要点：规范化与校验**职责分离**——前者保证「能渲染」，后者保证「能落盘」。任何数据结构变更必须同步修改这两处与 `DEFAULT_CONFIG`。

## 4. 默认配置
`DEFAULT_CONFIG`（`defaults.ts`）：`schemaVersion='1.0'`、两开关为真、`minimal-light/medium/motion-on`、仅含 `default` 分组、空模板、空项目、`sync.minioEnabled=false`、`meta.localRevision=1`。无 storage 环境读取回退此配置。

## 5. 存储键
| 键 | 内容 | 来源 |
| --- | --- | --- |
| `appConfig` | 完整配置 `AppConfig` | `defaults.STORAGE_KEY`、`storage.ts` |
| `extensionEnabled` | 插件总开关 boolean | `extension-state.ts` |

## 6. 序列化
- `json.formatAppConfig`：2 空格缩进 JSON 文本（展示 / 导出）。
- `json.parseAppConfigText`：解析 → 规范化 → 校验，返回 `{ok,errors,value}`。
- 导出子集见 `helpers.exportConfigSubset`（项目过滤 + 可选剥离 MinIO / 主题）。

## 7. 演进与迁移注意
- `schemaVersion` 预留升级位；当前仅识别 `1.0`，未来引入新结构时应在规范化层做迁移、在校验层放行新版本。
- 改字段需同时维护：`types.ts`、`DEFAULT_CONFIG`、`normalizeAppConfigForRuntime`、`validateAppConfig`、相关 `config-ops` 与 UI 表单。
