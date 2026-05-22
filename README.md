# 钥栈 KeyDock

钥栈 KeyDock 是一款面向多环境 Web 系统的 Chrome 账号管理与登录填充插件。它默认使用 Chrome 本地配置，支持登录页账号浮窗、输入框账号选择器、字段自定义、JSON 导入导出和可选 MinIO 同步。

本项目不是 Web 后台系统，也不是加密密码保险箱。账号字段、导出 JSON 和 MinIO 配置均按明文处理，使用者需要自行保护 Chrome Profile、导出文件和 MinIO 存储桶。

## 当前版本

- 产品发布版本：`1.0.0`
- 插件代码版本：`coding/v0.12`
- 设计依据：`design/v0.6`
- 官网目录规划：`website/v0.1`

## 功能概览

- 多项目、多分组、多环境账号配置。
- 登录页自动识别项目环境并展示账号浮窗。
- 支持默认账号自动填充和输入框账号选择器。
- 字段模型可自定义，支持 `input` 填充字段和 `display` 展示字段。
- 敏感字段默认隐藏，支持临时显示与复制。
- 配置页支持项目、字段模板、账号、JSON、同步等管理能力。
- 支持科技黑、简约白、灵动炫彩三主题，以及字号和动效配置。
- 可选 MinIO 同步，未配置 MinIO 时本地功能完整可用。

## 目录结构

- `src/background/`：Chrome MV3 service worker。
- `src/content/`：登录页注入 UI、页面识别、字段填充、账号选择器。
- `src/popup/`：浏览器工具栏弹出面板。
- `src/extension/`：配置管理页 Shell、Sidebar、业务组件和样式。
- `src/extension/components/`：全局配置、分组、项目、字段模板、账号、JSON、同步等 Section。
- `src/extension/hooks/`：配置页局部 hooks，例如 Toast。
- `src/shared/`：共享类型、存储、校验、同步、主题、默认值和业务工具。
- `src/shared/tokens/`：三层 Design Token CSS。
- `public/`：Manifest 和插件静态资产。
- `public/icons/`：钥匙节点门 Logo 和 Chrome 图标。
- `dist/`：构建后的 Chrome 插件安装目录，不作为源代码修改。

## 技术栈与主要组件

- React 18
- TypeScript
- Vite
- lucide-react
- Chrome Manifest V3 APIs
- esbuild IIFE bundle，用于 `content.js` 和 `page-guard.js`

主要内部组件：
- `extension/main.tsx`：配置页 Shell。
- `extension/components/Sidebar.tsx`：配置页导航和品牌区。
- `GlobalSection`：全局开关、外观设置和关于信息。
- `GroupsSection`、`ProjectsSection`、`FieldTemplatesSection`、`AccountsSection`：核心配置维护。
- `ConfigSection`：JSON 查看、编辑、导入、导出。
- `SyncSection`：MinIO 配置、测试连接、拉取和上传。
- `AccountEditorModal`、`modals.tsx`：账号和项目相关弹窗/抽屉。

## 核心数据模型

核心类型位于 `src/shared/types.ts`：

- `AppConfig`：完整本地配置根对象。
- `ProjectGroup`：项目分组。
- `ProjectConfig`：项目、字段和环境集合。
- `EnvConfig`：登录环境、匹配规则、账号列表。
- `FieldConfig`：字段定义，区分 `input` 与 `display`。
- `AccountRecord`：账号记录与字段值。
- `SyncConfig`：MinIO 同步配置。

运行时会通过 `normalizeAppConfigForRuntime()` 补齐旧配置缺失的默认值；导入或保存 JSON 时会通过 `validateAppConfig()` 做严格校验，避免坏配置覆盖本地有效配置。

## 运行与开发

```bash
pnpm install
pnpm check
pnpm build
```

常用修改入口：
- 修改产品名、版本、描述：`src/shared/app-info.ts`、`public/manifest.json`、`package.json`。
- 修改官网/帮助/关于整体链接：`src/shared/constants.ts`。
- 修改主题颜色：`src/shared/tokens/`。
- 修改配置管理页：`src/extension/components/`。
- 修改登录页浮窗和账号选择器：`src/content/index.tsx`。
- 修改 Popup：`src/popup/main.tsx`。
- 修改 MinIO 同步：`src/shared/minio.ts` 和 `SyncSection`。

## 打包说明

运行：

```bash
pnpm build
```

构建结果位于 `dist/`。在 Chrome 扩展管理页开启开发者模式后，选择 `dist/` 作为“加载已解压的扩展程序”目录。

## 开发规范

- 不直接修改 `dist/`，所有变更从 `src/`、`public/`、HTML 或配置文件进入。
- 修改后至少运行 `pnpm check` 和 `pnpm build`。
- 不在组件内散落产品名、版本号和官网链接。
- 视觉样式优先使用 `src/shared/tokens/` 中的 Token。
- 不新增运行时依赖，除非设计明确允许。
- 不把真实账号、密码、内部系统 URL、MinIO endpoint、accessKey、secretKey 写入示例、截图或文档。
- Content Script 的 DOM 和 CSS 必须保持在 `#web-account-assistant-root` 边界内。

## 人工开发说明

新增功能前先确认是否影响 `AppConfig` 数据结构。若影响，需要先更新设计和数据迁移策略；普通 UI 文案、品牌、样式、README 和链接调整不应写入用户配置。

处理同步相关代码时要区分三层边界：
- `minio.ts` 只负责远端对象读写和连接测试。
- `merge.ts` 决定本地/云端同 ID 数据如何合并。
- `storage.ts` 负责本地 Chrome storage 读写。

处理登录页填充时要保持事件触发逻辑，不能只设置 DOM value；否则 React/Vue/Angular 等受控表单可能感知不到变更。

## 发布前检查清单

- [ ] `public/manifest.json` 的 `name`、`description`、`version`、`icons` 正确。
- [ ] `package.json` 版本为 `1.0.0`。
- [ ] `src/shared/app-info.ts` 版本为 `1.0.0`。
- [ ] Popup、配置页、About 信息展示钥栈 KeyDock。
- [ ] `public/icons/` 包含 `logo.svg` 和 16/32/48/128 PNG。
- [ ] 底部链接仍由 `src/shared/constants.ts` 集中配置。
- [ ] `pnpm check` 通过。
- [ ] `pnpm build` 通过。
- [ ] `dist/manifest.json` 图标路径正确。
- [ ] 文档和示例不包含真实敏感信息。

## 常见问题

### 为什么没有加密存储？

当前版本按设计采用 Chrome 本地明文存储。插件无法在本地安全托管一个真正独立的加密密钥，因此本版本以清晰风险提示、默认隐藏敏感字段和用户自行保护环境为边界。

### 未配置 MinIO 能不能使用？

可以。MinIO 是可选同步能力，未配置时项目、环境、账号、导入导出和登录页填充都可使用本地配置完成。

### 官网链接为什么还是占位？

`design/v0.6` 已确认链接占位策略：官网完成前集中使用占位 URL，官网部署地址确认后再统一替换。
