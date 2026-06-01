# 相对 v0.4 草案的差异说明（v1.0.0）

> 参考来源 `/Users/yangwen/my/work/AI/WebAccountAssistant/requirements/v0.4` 是前身「Web 账号管理助手」的需求草案。本项目（钥栈 KeyDock）以**实际代码为准**，与草案存在以下差异。原则：**代码 > 草案**。

## A. 代码新增、草案未覆盖的能力

| 能力 | 说明 | 主要代码 |
| --- | --- | --- |
| 项目分组 | `projectGroups`，含 `default` 默认分组、拖动排序、删除迁移、项目按分组过滤 | `types.ts`、`GroupsSection.tsx`、`ProjectsSection.tsx` |
| 字段配置模板 | 可复用字段集合，新建项目可一键套用 | `FieldTemplatesSection.tsx`、`modals.tsx` |
| 全局配置与外观 | 两个开关 + 三主题 / 三字号 / 动效，统一应用到配置页 / popup / 浮窗 | `GlobalSection.tsx`、`theme.ts` |
| 图标 Popup 面板 | 总开关、识别结果、账号列表、填充 / 编辑、打开管理面板 | `popup/main.tsx` |
| 插件总开关 | 独立存储键 `extensionEnabled`，一键启停账号辅助 | `extension-state.ts` |
| 登录页弹窗位置 | 每项目 9 个锚点之一，浮窗可拖动覆盖 | `popup-position.ts`、`content/index.tsx` |
| 输入框账号选择器 | 点击已配置 input 弹出账号选择浮窗，支持键盘操作 | `content/index.tsx` |
| /login 解密容错 | MAIN world 给 `CryptoJS.AES.decrypt` 打补丁，避免宿主登录脚本报错 | `page-guard.ts` |
| 字段扩展属性 | `required`、`copyable`、`order` | `types.ts`、`AccountEditorModal.tsx` |
| 导出粒度 | 支持按项目子集导出、是否含主题设置 | `helpers.ts:exportConfigSubset` |

## B. 与草案语义有出入、以代码为准之处

1. **导入策略**：v0.4 §4.3 要求「本地非空时让用户选覆盖 / 增量」。实际代码（`ConfigSection.importJson`）为校验通过后**直接写入（覆盖式）**，不提供选择。增量合并能力体现在「数据同步」模块而非导入。
2. **本地→云端同步方式**：v0.4 §5.5 要求提供「覆盖 / 合并」两种本地→云端方式。实际 UI 只接线**整体 PUT 覆盖**；合并引擎 `merge.ts` 已实现 `localMerge` 模式，但暂未在 SyncSection 暴露。
3. **MinIO 鉴权**：草案未定细节；实际采用用户自管网关的 HTTP 头 `X-MinIO-Access-Key` / `X-MinIO-Secret-Key` 直连单个 JSON 对象，非官方 SDK 签名。对象名缺省 `app-config.json`。
4. **环境账号非空校验**：严格校验要求每个环境 `accounts` 非空（`validate.ts:78`）。`createBlankProject` 生成的默认环境带 1 条空账号与之呼应。
5. **host 匹配**：草案称「精确或等价匹配」；实际为去 `www.` 小写后「相等或子域（endsWith `.host`）」匹配。
6. **敏感字段临时显示**：实际带 10 秒自动恢复隐藏，草案未指定时长。
7. **配置版本字段**：`schemaVersion` 固定 `'1.0'`（产品 / 插件版本 `1.0.0`），与草案示例 `"1.0"` 一致。

## C. 草案保留、本版本仍遵循的要点
- 单一完整配置 JSON 为数据中心；本地默认可用、MinIO 可选。
- 字段统一模型（input/display）、列宽自适应。
- 同步按稳定标识合并；明文存储 + 默认隐藏 + 风险提示。
- 不兼容旧 `{projectId}-{envId}.json` 分散格式。

## D. 后续可演进项（非本版本承诺）
- 在导入流程补「覆盖 / 增量」选择。
- 在 SyncSection 暴露 `localMerge`（本地→云端合并）入口。
- 多同步通道（当前仅 MinIO 单 Tab）。
