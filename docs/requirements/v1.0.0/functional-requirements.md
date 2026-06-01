# 功能需求 v1.0.0（以代码为准）

> 本文按「以代码实际行为为准」提炼。涉及来源文件以 `path:line` 标注便于追溯。

## 1. Chrome 插件独立运行

### 1.1 插件形态
- 以独立 Chrome 插件（Manifest V3）交付，不依赖 Tampermonkey 等用户脚本环境。`public/manifest.json`
- `manifest_version: 3`；后台为 service worker（`background.js`，`type: module`）。
- 权限：`storage`、`tabs`、`activeTab`、`scripting`、`clipboardWrite`；`host_permissions: <all_urls>`。
- 内容脚本两段：`page-guard.js`（`document_start`，`world: MAIN`）与 `content.js`（`document_idle`）。

### 1.2 插件入口
- **图标 Popup**（`popup.html` → `src/popup/main.tsx`）：插件总开关、当前页面识别结果、账号列表（填充 / 编辑 / 新增）、打开管理面板入口、官网链接。
- **配置管理页**（`extension.html` → `src/extension/main.tsx`）：点击 popup「管理面板」在新标签页打开，是完整配置维护入口。
- **登录页浮窗**（`src/content/index.tsx`）：在匹配页面注入，支持账号可视化维护。

### 1.3 插件总开关
- popup 顶部提供启用 / 停用开关，状态保存在独立存储键 `extensionEnabled`（`src/shared/extension-state.ts`）。
- 停用时，登录页浮窗与账号选择器不再展示；启用时恢复并重新加载配置。`content/index.tsx:174`

## 2. 登录页账号辅助

### 2.1 页面识别（`src/shared/match.ts`）
- 依据完整配置 JSON 遍历项目→环境进行匹配。
- host 匹配：去除 `www.` 前缀并小写后，满足「完全相等」或「当前 host 以 `.<配置host>` 结尾（子域）」。
- path 匹配：用环境 `pathKeywords` 对 `pathname + search + hash` 做 `includes` 包含判断。
- host 与 path 同时命中才算匹配；命中即返回该项目 / 环境及按 `order` 排序后的字段。
- 未匹配任何环境时不展示浮窗。

### 2.2 账号浮窗（`src/content/index.tsx`）
- 仅在页面匹配且总开关启用、且全局 `showLoginAccountPanel` 为真时展示。
- 浮窗标题展示「项目名 + 环境名」与状态文案。
- 按字段配置渲染列；列出当前环境全部账号记录。
- 支持关闭（X）、支持标题栏拖动定位；未手动拖动时按项目 `popupPosition`（9 个锚点之一）定位。`content/index.tsx:47`
- 浮窗宽度 `max-content`，最大不超过视口，超出滚动；列宽自适应（见数据需求 §7）。

### 2.3 字段展示
- 每条账号按项目字段展示，字段数量必须 > 0。
- 字段名称 / key / 数量不固定，不限定为「账号 / 密码」。
- 字段类型：`input`（参与填充）/ `display`（仅展示，不需选择器、不参与填充）。
- 敏感字段（`sensitive`）默认以 `••••••` 隐藏；可点击临时显示，**10 秒后自动恢复隐藏**。`content/index.tsx:435`
- `copyable !== false` 的字段提供复制按钮，复制成功 / 失败有就近 toast 提示。
- 支持展示型字段（如备注）。

### 2.4 自动填充
- 仅 `input` 字段参与填充；按字段 `selector`（`display` 字段缺省时密码类字段可回退取用，见数据需求 §1.3）定位元素。`config-normalize.ts:106`
- 写入值后派发 `input` / `change` / `blur` 事件，使 React / Vue / Angular 受控组件感知。`account-utils.ts:38`
- 按环境 `retryDelays` 延时重试查找元素；某选择器找不到元素不影响其他字段继续填充。`account-utils.ts:44`

### 2.5 默认账号自动填充
- 账号支持 `isDefault`；同一项目环境最多 1 个默认账号。
- 页面匹配且存在默认账号时，加载后按 `retryDelays` 自动尝试填充默认账号。
- 以 `项目:环境:账号:url` 作为去重 token，避免对同一页面重复自动填充。`content/index.tsx:241`

### 2.6 输入框账号选择器
- 全局 `showAccountPickerOnInputClick` 为真时，点击「已配置选择器的 input 元素」会在点击位置弹出账号选择浮窗。`content/index.tsx:254`
- 选择器列表按「默认账号优先」排序；展示各账号非敏感字段拼接信息。
- 支持键盘操作：↑ / ↓ 移动、Enter 选择填充、Esc 关闭；鼠标移出自动关闭。

### 2.7 登录页 / popup 账号增删改查
- 浮窗「新增」「编辑」打开可视化账号表单（`src/shared/AccountEditorModal.tsx`），不直接编辑 JSON。
- 表单按当前项目字段生成；敏感字段以密码框录入；`required` 字段缺失时阻止保存并提示「必填」。
- 账号 `id` 为空时自动生成（`createId('account')`）。
- 删除需 `confirm` 二次确认。
- 设为默认时，实时将同环境其他账号 `isDefault` 置否（`config-ops.ts:setDefaultAccount`）。
- 登录页所有账号增删改**实时写入本地配置**，不自动上传 MinIO。
- popup 也可对当前匹配环境账号执行新增 / 编辑 / 填充：通过向 content 发送 `WAA_OPEN_ACCOUNT_EDITOR` / `WAA_FILL_ACCOUNT` 消息完成。`popup/main.tsx:81`

### 2.8 登录页解密容错（page-guard）
- 仅当路径匹配 `/login` 时，在 MAIN world 对页面的 `CryptoJS.AES.decrypt` 打补丁：当密文为 null / undefined 或抛出 ciphertext 相关 TypeError 时返回空 WordArray，避免宿主登录页脚本因异常中断。`src/content/page-guard.ts`
- 通过劫持 `window.CryptoJS` 的 getter/setter，兼容脚本后注入；超时 5s 停止轮询。

## 3. 配置管理页（七大模块）

侧边栏导航顺序固定（`src/extension/helpers.ts:29`）：全局配置 → 项目分组 → 项目管理 → 字段配置模板 → 账号管理 → 配置导入导出 → 数据同步。侧边栏可折叠。

### 3.1 全局配置（GlobalSection）
- 关于卡片：展示版本、Logo、描述、官网 / 帮助 / 关于链接。
- 开关：「登录页显示账号列表弹窗」（`showLoginAccountPanel`）、「点击输入框自动弹出账号列表选择框」（`showAccountPickerOnInputClick`）。
- 外观：主题三选一（科技黑 `tech-dark` / 简约白 `minimal-light` / 灵动炫彩 `vivid-color`）、字号三档（小 / 中 / 大）、轻量动效开关。
- 外观设置同步应用于配置页、popup、登录页浮窗。`theme.ts:getAppearanceClassName`

### 3.2 项目分组（GroupsSection）
- 分组列表：顺序、code、名称、描述、操作。
- 支持新增 / 编辑 / 删除 / 拖动排序。
- `default` 默认分组不可删除、其 code 不可修改。
- 校验：code / 名称不能为空；code 不能重复。
- 删除分组时，其下项目自动迁移到 `default` 分组。

### 3.3 项目管理（ProjectsSection）
- 过滤：按分组下拉 + 项目名称关键字（不区分大小写）+ 重置。
- 列表：分组、名称、字段数、环境数、操作。
- 项目操作：编辑（项目基本信息）、字段配置、环境配置、删除（确认）。
- 项目编辑表单字段：项目 ID*、项目名称*、所属分组、**字段配置模板**（可选，套用后复制模板字段到该项目）、**登录页弹窗位置**（9 选 1）。
- 按外观主题决定用抽屉或弹窗承载编辑表单（`theme.ts:shouldUseProjectDrawer`，非简约白用抽屉）。
- 字段配置弹窗：增删改 + 拖动排序；列含 key*、名称*、类型*（input/display）、选择器（display 禁用）、敏感、必填、复制、宽度、最小 / 最大宽度。
- 环境配置弹窗：每环境一卡片，含环境 ID*、名称*、Hosts*（英文逗号分隔）、Path 关键字*（英文逗号分隔）、重试延迟*（逗号分隔毫秒，仅保留有限数值）。
- 保存项目 / 字段时，自动用 `syncAccountsWithFields` 将各环境账号 `values` 对齐到最新字段集合。

### 3.4 字段配置模板（FieldTemplatesSection）
- 模板列表：顺序、名称、字段数、操作；支持名称搜索、拖动排序。
- 模板操作：编辑（名称）、字段配置（复用项目字段配置弹窗，不展示「复制」列）、删除（确认）。
- 校验：模板名称非空、模板 id 非空且不重复、至少 1 个字段、字段 key 不重复。

### 3.5 账号管理（AccountsSection）
- 过滤：项目下拉 + 环境下拉（依赖所选项目）+ 关键字 + 重置。
- **关键字仅检索非敏感字段值**（`accountSearchText`），界面有「查询非敏感字段值」说明。
- 列表：项目、环境、账号信息（非敏感字段拼接）、默认（是 / 空）、操作。
- 操作：编辑（复用 AccountEditorModal）、设为默认、删除（确认）。
- 新增账号：按当前过滤或首个可用项目 / 环境预选上下文后打开编辑器。

### 3.6 配置导入导出（ConfigSection）
- 完整 JSON：默认只读展示当前配置；「编辑」切换为可编辑、「保存配置」解析并严格校验后写入（校验失败保留原配置并列出 `path: message`）、「刷新」重新格式化。
- 导入 JSON：选择文件 → 解析 → 运行时规范化 → 严格校验；通过则写入本地配置，失败提示「导入失败：JSON 不合法」。**当前为校验后直接写入（覆盖式），不提供「覆盖 / 增量」选择**（与 v0.4 草案不同，见 diff）。
- 导出 JSON（ExportConfigModal）：可选导出的项目子集（默认全选 / 支持全选 / 全不选）、是否导出 MinIO 配置（仅当本地存在 MinIO 信息时出现）、是否导出主题设置；导出文件名 `web-account-config.json`。

### 3.7 数据同步（SyncSection）
- 同步通道：当前仅 MinIO。
- MinIO 配置项：Endpoint、Bucket、Access Key、Secret Key、Path Prefix、Object Key；字段变更即写回本地配置（提示「MinIO 配置已保存」）。
- 启用 MinIO 复选框（`minioEnabled`）；未启用时测试 / 同步操作均提示「未启用 MinIO」。
- 测试连接：对目标对象发 HEAD 请求验证可达性。
- 远程 → 本地：拉取云端完整 JSON，按 `cloudToLocal` 模式与本地**增量合并**后写入本地，并提示合并警告。
- 本地 → 远程：将本地完整配置整体 `PUT` 覆盖云端对象，并更新 `meta.lastSyncedAt` / `remoteRevision`。
- 说明文案：保存按钮只写本地 JSON，同步按钮直接读写 MinIO 完整 JSON。

### 3.8 配置校验
- 保存 / 导入完整配置前执行严格校验（`src/shared/validate.ts`，详见数据需求 §2）。
- 校验失败不覆盖当前有效配置，并就地列出错误路径与信息。

## 4. 本地配置
- 未配置 MinIO 时插件完整可用，本地配置（Chrome `storage.local` 的 `appConfig` 键）是唯一数据源。`src/shared/storage.ts`
- 读取时经 `normalizeAppConfigForRuntime` 容错补齐缺省（全局设置、默认分组、字段模板、弹窗位置、字段 `copyable` 等）。
- 配置页保存、登录页 / popup 账号增删改均实时写入本地，操作有成功 / 失败反馈。
- 本地或云端数据变化通过 `chrome.storage.onChanged` 通知，登录页浮窗自动重载。`content/index.tsx:174`

## 5. MinIO 可选同步
- MinIO 为可选能力，未启用不访问云端。
- 连接信息（endpoint/bucket/accessKey/secretKey/pathPrefix/objectKey）按明文保存在 `sync` 中，是完整配置的一部分。
- 对象 URL 由 `endpoint + bucket + pathPrefix + objectKey` 拼接，`objectKey` 缺省 `app-config.json`。`src/shared/minio.ts`
- 鉴权方式：请求头携带 `X-MinIO-Access-Key` / `X-MinIO-Secret-Key`（用户自管网关），非官方 SDK 签名。
- 云端只保存一个完整配置 JSON，不按项目环境拆分。
- 同步入口仅在配置管理页「数据同步」模块，由用户主动触发；登录页编辑不自动上传。
- 合并引擎（`src/shared/merge.ts`）支持三种模式：`cloudToLocal`（云端增量合并到本地）、`localOverwrite`（本地整体覆盖）、`localMerge`（本地与云端按标识合并）。当前 UI 接线：远程→本地走 `cloudToLocal`；本地→远程走整体 `PUT` 覆盖；`localMerge` 已实现但暂未在 UI 暴露（见 diff）。

## 6. JSON 导入导出
（见 §3.6，规则细节见数据需求 §4。）

## 7. 安全与隐私
- 本版本明文存储：本地配置、导出 JSON、云端配置、MinIO 连接信息都可能含明文字段值。
- 敏感字段默认隐藏，临时显示限时自动恢复。
- 导出对话框提示可能包含敏感数据与 MinIO 凭据；同步直接读写明文 JSON。
- 权限边界：账号辅助仅在配置匹配的页面生效；`page-guard` 仅在 `/login` 路径介入。

## 8. 旧格式处理
- 不兼容旧 MinIO 分散 JSON 格式，不读写 `{projectId}-{envId}.json`。
- 旧油猴脚本与旧 JSON 仅作业务能力与字段结构参考。
