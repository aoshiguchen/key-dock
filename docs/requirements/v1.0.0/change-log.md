# 变更记录 — 需求 v1.0.0

## v1.0.0（2026-06-01）
- 首个入库需求版本。
- 基于钥栈 KeyDock 现有代码（`src/`、`public/manifest.json` 等）提炼，参考前身 `WebAccountAssistant/requirements/v0.4` 草案结构。
- 覆盖：插件形态与入口、登录页账号辅助、配置管理页七大模块、本地配置、可选 MinIO 同步、JSON 导入导出、数据模型与校验、列宽与安全。
- 相对 v0.4 的新增能力与语义差异见 `diff-from-v0.4.md`。
- 对应技术设计：`docs/design/v1.0.0`。
