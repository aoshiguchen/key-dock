# 本地开发与调试指南

> 解决「本地调试加载的插件」与「Chrome 商店正式版」名字、图标完全相同导致的混淆问题。
> 采用三层叠加方案：①运行时 DEV 角标 ②dev 专用构建（改名 + 换图标）③独立 Chrome Profile。

## 一、构建命令

| 命令 | 产物 | 用途 |
|------|------|------|
| `pnpm build` | `dist/`（name `钥栈 KeyDock`、青色图标） | **正式版**，用于上架 Chrome 商店 |
| `pnpm build:dev` | `dist/`（name `钥栈 KeyDock [DEV]`、红色图标） | **本地开发版**，用于本地加载调试 |
| `pnpm gen:dev-icons` | `asset/dev-icons/icon-*.png` | 重新生成红色 dev 图标（图标源变更后才需跑） |

> ⚠️ 两者输出目录相同（`dist/`），构建会覆盖。上架前务必用 `pnpm build` 重新出正式版，避免误传带 `[DEV]` 的包。

## 二、三个区分手段如何生效

### 方案1：运行时 DEV 角标（自动，对正式版零影响）
`src/background/index.ts` 启动时调用 `chrome.management.getSelf()` 判断安装来源：
- 本地「加载已解压」→ `installType === 'development'` → 工具栏图标打红色 **DEV** 角标、tooltip 显示「钥栈 KeyDock [本地开发版]」。
- 商店安装 → `installType === 'normal'` → 不触发，正式版无任何变化。

无需声明 `management` 权限，不影响商店审核。即使本地加载的是 `pnpm build` 正式包，也会显示角标。

### 方案2：dev 专用构建（改名 + 换图标）
`pnpm build:dev` 设置 `KEYDOCK_BUILD=dev`，`vite.config.ts` 中的 `keydock-dev-variant` 插件在构建收尾时：
- 改写 `dist/manifest.json`：`name` → `钥栈 KeyDock [DEV]`，`action.default_title` 同步，`description` 前置「【本地开发调试版，勿上架】」。
- 用 `asset/dev-icons/` 的红色图标覆盖 `dist/icons/`。

效果：`chrome://extensions` 列表里名字、图标都与正式版不同。正式版构建下该插件为空操作。

### 方案3：独立 Chrome Profile（推荐，环境隔离）
本插件为本地明文存储账号数据，强烈建议用单独的 Chrome 用户配置做开发，避免本地调试读写/覆盖日常在用的真实账号数据：
1. Chrome 右上角头像 → **添加** → 新建配置（如「KeyDock-Dev」）。
2. 在该配置下打开 `chrome://extensions` → 右上角开启「开发者模式」。
3. 点「加载已解压的扩展程序」→ 选择本项目 `dist/` 目录。
4. 日常使用的配置只保留 Chrome 商店版，两者数据、登录态完全隔离。

## 三、推荐流程

1. 改代码后跑 `pnpm build:dev`。
2. 在「KeyDock-Dev」Profile 的 `chrome://extensions` 点刷新（或重新加载 `dist/`）。
3. 看到红色图标 + `[DEV]` 名称 + DEV 角标即为本地版。
4. 上架前切回 `pnpm build` 出正式版。

## 四、相关文件

- `src/background/index.ts`：方案1 角标逻辑（`markDevBuild`）。
- `vite.config.ts`：方案2 `devVariantPlugin`（dev 构建改写 manifest + 换图标）。
- `scripts/gen-dev-icons.mjs`：纯 Node（zlib）将品牌图标着色为红色 dev 图标。
- `asset/dev-icons/`：已生成的红色 dev 图标（随仓库提交，dev 构建复用）。
- `package.json`：`build`、`build:dev`、`gen:dev-icons` 脚本。
