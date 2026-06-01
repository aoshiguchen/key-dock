# 模块设计 v1.0.0

## 1. content 登录页模块（`src/content/index.tsx`）

### 职责
页面识别、账号浮窗、输入框账号选择器、自动 / 手动填充、登录页账号 CRUD、样式注入与隔离。

### 关键结构
- `start()`：幂等注入单一 root `#web-account-assistant-root`，注入重写后样式，挂载 `<Panel/>`。
- `Panel` 状态：`appConfig`、`matched`、`enabled`、`visible`、`position`（拖动）、`toast`、`accountPicker`、`accountModal`、`revealed`（敏感显隐）等。
- 副作用：
  - 初次加载读开关 + 配置 + 匹配；监听 `storage.onChanged`（开关 / 配置）重载。
  - 应用外观 className 到 root。
  - 全局 mousemove/up 实现浮窗拖动。
  - 默认账号自动填充（token 去重，`项目:环境:账号:url`）。
  - 文档 click → 命中已配置 input 时弹账号选择器；keydown 实现选择器键盘导航。
  - 监听 `WAA_FILL_ACCOUNT` / `WAA_OPEN_ACCOUNT_EDITOR` 消息。
- 填充核心 `fillMatchedAccount`：遍历 input 字段 → `resolveFillSelector` → `waitForSelector(retryDelays)` → 写值 → `createInputEvents` 派发 input/change/blur。
- 浮窗定位：未手动拖动按 `getPanelAnchorStyle(project.popupPosition)`，9 锚点。

### 设计要点
- UI 全部限定在 root 内，z-index 顶格（2147483647），`max-content` 宽度 + 视口上限滚动。
- 敏感字段 10s 自动恢复隐藏，定时器在卸载时清理。
- 账号编辑复用共享 `AccountEditorModal`，登录页保存即写本地、不触云端。

## 2. page-guard（`src/content/page-guard.ts`，MAIN world）
- `shouldGuardPage`：仅 `/login` 路径启用。
- `patchCryptoDecrypt`：包裹 `CryptoJS.AES.decrypt`，空密文 / ciphertext TypeError 时返回空 WordArray，其余照抛；幂等标记 `__webAccountAssistantPatched`。
- `installCryptoGuard`：已存在则直接 patch，否则 `Object.defineProperty` 劫持 `window.CryptoJS` 的 set，并 `waitAndPatchCrypto` 轮询（10ms，5s 超时）兼容后注入。
- 与 content 分离原因：需访问页面真实 window 对象，必须运行在 MAIN world 且 `document_start` 提前。

## 3. popup 工具栏（`src/popup/main.tsx`）
- 读取：`extensionEnabled`、当前活动 tab URL、`appConfig.global.appearance`、`matchCurrentPage` 结果。
- 功能：
  - 总开关切换 `extensionEnabled`。
  - 展示「项目-环境」或「未识别此页面」。
  - 匹配时：新增账号、展开 / 收起账号列表、逐账号填充 / 编辑。
  - 填充 / 编辑通过 `chrome.tabs.sendMessage` 向 content 发消息，由 content 执行并回执。
  - 「管理面板」`chrome.tabs.create(extension.html)`。
  - 底部官网 / 帮助 / 关于链接（`PRODUCT_LINK`）。
- 外观：复用 `getAppearanceClassName`，版本取 manifest 短版本号。

## 4. background（`src/background/index.ts`）
- `onInstalled`：`ensureInitialConfig`，无项目时写 `DEFAULT_CONFIG`。
- 消息处理：`GET_APP_CONFIG`（读配置）、`SAVE_APP_CONFIG`（校验入参后写配置）。作为统一读写桥的扩展点（当前页面多直接走 storage）。

## 5. extension 配置管理页（`src/extension/`）

### 5.1 Shell（`main.tsx` + `Sidebar.tsx` + `helpers.ts`）
- `main.tsx`：持有 `appConfig`、当前 `section`、侧边栏折叠态；`persist(next,status)` 落盘并更新状态文案；`useToast` 提供就近 toast；应用外观 className。
- `MENU_ITEMS` 固定七项导航；`helpers.ts` 提供工厂（`createBlankProject/Group/FieldTemplate/Fields`）、`reorderById`、`syncAccountsWithFields`、`replaceProject`、`exportConfigSubset`、`accountSearchText/InfoText`、`stripMinio`。

### 5.2 GlobalSection
- 关于卡（版本 / logo / 链接）+ 两开关 + 外观（主题三选一、字号三档、动效开关）。直接更新 `global`。

### 5.3 GroupsSection
- 分组 CRUD + 拖动排序；`default` 受保护（不可删 / code 不可改）；改 code 时联动更新项目 `groupCode`；删除分组迁移项目到 `default`。校验 code/name 非空、code 唯一。

### 5.4 ProjectsSection + modals
- 过滤（分组 + 名称）+ 列表 + 项目编辑 / 字段配置 / 环境配置 / 删除。
- 项目编辑：id*、name*、分组、套用字段模板（复制模板字段）、弹窗位置；按主题用抽屉或弹窗。
- 字段配置弹窗：字段 CRUD + 拖动排序，type=display 时禁用 / 清空 selector；保存经 `saveProjectFields` + `syncAccountsWithFields`。
- 环境配置弹窗：每环境卡片，列表字段以英文逗号文本与数组互转，retryDelays 仅保留有限数值。

### 5.5 FieldTemplatesSection
- 模板 CRUD + 名称搜索 + 拖动排序；字段配置复用 ProjectFieldsModal（隐藏「复制」列）。校验名称 / id / 字段。

### 5.6 AccountsSection + AccountEditorModal
- 过滤（项目 + 环境 + 关键字，关键字仅非敏感字段）+ 列表 + 编辑 / 设默认 / 删除 + 新增（预选上下文）。
- `AccountEditorModal`（`src/shared/`，登录页与配置页共用）：可选项目 / 环境选择器、账号 id（空则生成）、按字段渲染输入（敏感用 password）、必填校验与内联报错、默认账号勾选、焦点陷阱与自动聚焦。

### 5.7 ConfigSection + ExportConfigModal
- 完整 JSON 只读 / 编辑 / 保存（解析+规范化+严格校验）/ 刷新；错误列表展示。
- 导入：文件 → 解析校验 → 覆盖写入。
- 导出：选择项目子集 + 是否含 MinIO（仅有凭据时）+ 是否含主题 → Blob 下载 `web-account-config.json`。

### 5.8 SyncSection
- MinIO 表单（6 字段，即时写本地）+ 启用开关 + 测试连接（HEAD）+ 远程→本地（cloudToLocal 合并）+ 本地→远程（整体 PUT 覆盖，更新 meta）。详见 `sync-design.md`。

## 6. 共享层（`src/shared/`）
| 文件 | 职责 |
| --- | --- |
| `types.ts` | 核心模型 |
| `defaults.ts` | 默认配置、存储键、schema 版本、默认分组 code |
| `config-normalize.ts` | 运行时宽容规范化、填充选择器解析 |
| `validate.ts` | 严格校验 |
| `config-ops.ts` | 不可变写操作 |
| `storage.ts` | 本地读写、初始化 |
| `merge.ts` | 同步合并引擎 |
| `minio.ts` | 远端对象 GET/PUT/HEAD、URL 构造 |
| `match.ts` | 页面识别、默认账号、字段判定 |
| `account-utils.ts` | 草稿构造、复制、事件派发、选择器等待 |
| `column-width.ts` | 列宽自适应计算 |
| `popup-position.ts` / `theme.ts` | 弹窗位置 / 主题字号动效选项与判定 |
| `id.ts` / `json.ts` | ID 生成 / JSON 序列化与解析校验 |
| `app-info.ts` / `constants.ts` | 品牌版本 / 外链集中出处 |
| `extension-state.ts` | 插件总开关读写 |
| `AccountEditorModal.tsx` | 共享账号编辑弹窗 |
| `tokens/` | 三层 Design Token CSS |
