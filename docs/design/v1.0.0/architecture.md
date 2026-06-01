# 架构设计 v1.0.0

## 1. 运行时拓扑

```
┌────────────────────────────────────────────────────────────────┐
│ Chrome MV3 扩展                                                  │
│                                                                  │
│  ┌──────────────┐   消息(GET/SAVE_APP_CONFIG)   ┌─────────────┐  │
│  │ background    │◀──────────────────────────────│ extension   │  │
│  │ service worker│                                │ 配置管理页  │  │
│  │ onInstalled   │   chrome.storage.local         │ (新标签页)  │  │
│  │ 初始化默认配置│◀──────────────┬───────────────▶│             │  │
│  └──────────────┘                │                └─────────────┘  │
│                                  │                                  │
│         ┌────────────────────────┼───────────────────────┐         │
│         │ storage.local          │  onChanged 通知         │         │
│         │  - appConfig (完整配置)│                         │         │
│         │  - extensionEnabled    │                         │         │
│         └────────────────────────┼───────────────────────┘         │
│                                  │                                  │
│  ┌──────────────┐  WAA_FILL_ACCOUNT / WAA_OPEN_ACCOUNT_EDITOR     │
│  │ popup        │──────────────────────────────────┐              │
│  │ 工具栏面板    │                                   ▼              │
│  └──────────────┘                          ┌──────────────────┐    │
│                                             │ content (登录页)  │    │
│  ┌──────────────┐  document_start/MAIN      │ 浮窗/选择器/填充  │    │
│  │ page-guard   │  CryptoJS 容错             └──────────────────┘    │
│  └──────────────┘                                                   │
└────────────────────────────────────────────────────────────────┘
                       │ HTTP (GET/PUT/HEAD)
                       ▼
                 MinIO 对象 (单个完整配置 JSON)
```

## 2. 四类执行环境
| 环境 | 入口 | 职责 |
| --- | --- | --- |
| background service worker | `src/background/index.ts` | 安装时初始化默认配置；提供 `GET_APP_CONFIG` / `SAVE_APP_CONFIG` 消息桥（当前 content/popup 多直接读写 storage，此桥为备用 / 扩展点）。 |
| content（ISOLATED） | `src/content/index.tsx` | 页面识别、浮窗、账号选择器、自动 / 手动填充、登录页账号 CRUD。 |
| page-guard（MAIN） | `src/content/page-guard.ts` | `/login` 页 `CryptoJS.AES.decrypt` 容错。 |
| popup | `src/popup/main.tsx` | 总开关、识别结果、账号列表、向 content 派发填充 / 编辑、打开管理页。 |
| extension 配置页 | `src/extension/main.tsx` | 七大模块的完整配置维护、JSON 编辑、导入导出、同步。 |

## 3. 数据流
- **单一真源**：`chrome.storage.local.appConfig`。读 `readAppConfig()` → `normalizeAppConfigForRuntime`；写 `writeAppConfig()` → 规范化后 set。
- **派生**：各页面以 React state 持有 `AppConfig` 副本，写操作产出新配置后 `persist` 落盘。
- **跨上下文同步**：`chrome.storage.onChanged` 通知 content / 其他页面重载，保证浮窗与配置页一致。
- **总开关**：`extensionEnabled` 独立键，避免与业务配置耦合。

## 4. 消息通道
- background ↔ 页面：`GET_APP_CONFIG`、`SAVE_APP_CONFIG`（`background/index.ts`）。
- popup → content：`WAA_FILL_ACCOUNT`（填充指定账号）、`WAA_OPEN_ACCOUNT_EDITOR`（打开浮窗账号编辑器）。content 收到后重读配置、重算匹配再响应。

## 5. 构建产物与资源
- Vite 构建：popup、extension、background 等 HTML / JS。
- esbuild IIFE：`content.js`（`--loader:.css=text` 内联样式文本）、`page-guard.js`。
- `public/manifest.json` 声明权限、content_scripts（page-guard `document_start`/MAIN + content `document_idle`）、action popup、service worker。
- 图标与 logo 在 `public/icons`、`asset/logo`。

## 6. 样式隔离策略
- content 将三层 token CSS + extension 样式注入到 `#web-account-assistant-root`。
- `toContentStyles` 把 `:root` / `* {` / `html,body,#root` / 主题 / 字号 / 动效类选择器重写为以 root 为前缀，避免泄漏到宿主页。`content/index.tsx:81`

## 7. 关键设计决策（ADR 摘要）
1. **本地优先、云端可选**：降低对外部服务依赖，无 MinIO 也完整可用。
2. **完整 JSON 单对象云端模型**：放弃旧分散格式，简化同步与冲突处理（按稳定标识合并）。
3. **宽容读取 / 严格写入双闸**：区分「展示容错」与「落盘把关」，防止脏数据覆盖。
4. **MAIN-world page-guard 独立脚本**：解密容错需访问页面真实 `window.CryptoJS`，故与 ISOLATED content 分离、`document_start` 提前介入。
5. **主题以 className 驱动**：`getAppearanceClassName` 统一三端外观，token 分层便于扩展主题。
