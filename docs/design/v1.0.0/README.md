# 钥栈 KeyDock 技术设计 v1.0.0

## 版本状态
- 版本：v1.0.0（首个入库设计版本，与需求 `docs/requirements/v1.0.0` 一一对应）。
- 基准：本项目 `src/` 实际代码；设计为「现状提炼 + 关键决策说明」，非新功能预研。
- 产品 / 插件版本：`1.0.0`；配置 schemaVersion：`1.0`。

## 文档清单
- `architecture.md`：整体架构、运行时拓扑、构建产物、消息通道。
- `data-model.md`：数据模型、规范化与校验双闸、配置读写。
- `module-design.md`：content / popup / background / extension 各模块设计。
- `sync-design.md`：MinIO 同步与合并引擎设计。
- `key-flows.md`：关键流程时序与边界。

## 设计目标与原则
1. **单一数据中心**：所有状态收敛到一个 `AppConfig`，本地 `storage.local` 为唯一真源，UI 派生展示。
2. **宽容读取、严格写入**：运行时 `normalizeAppConfigForRuntime` 容错补齐；导入 / 保存 JSON 边界 `validateAppConfig` 严格拒绝非法数据。
3. **三层同步边界清晰**：`minio.ts`（远端 IO）/ `merge.ts`（合并）/ `storage.ts`（本地 IO）职责分离。
4. **样式隔离**：content 注入 UI 收敛在单一 root 下并重写全局选择器，避免污染宿主页。
5. **品牌 / 链接 / 版本集中**：`app-info.ts`、`constants.ts` 统一出处，组件不散落硬编码。

## 技术栈
- React 18 + TypeScript 5 + Vite 5；图标 `lucide-react`。
- Chrome Manifest V3（service worker）。
- content / page-guard 由 esbuild 打包为 IIFE（`dist/content.js`、`dist/page-guard.js`）。
- 三层 Design Token CSS（`src/shared/tokens/` primitives / semantic / components）。

## 构建与校验
- `pnpm dev`：vite 开发；`pnpm check`：`tsc --noEmit`；`pnpm build`：vite 构建 + esbuild 打包 content / page-guard。
- 提交前至少 `pnpm check` 与 `pnpm build`。
