# 关键流程时序 v1.0.0

> 与需求 `flows.md` 对应，此处侧重模块协作与边界。

## 1. 页面识别 + 默认账号自动填充
```
host page (document_idle)
  → content.start() 注入 root/样式 → <Panel/>
  → readExtensionEnabled() ; readAppConfig()(normalize)
  → matchCurrentPage(config, location)
      host: 去www小写 → 相等 | 子域(.host)
      path: pathKeywords.includes(pathname+search+hash)
  → matched? 否→不渲染
            是→渲染浮窗(showLoginAccountPanel) + 排序字段(order)
  → getDefaultAccountId → token(项目:环境:账号:url) 未用过
      → fillMatchedAccount: 遍历input → resolveFillSelector
        → waitForSelector(retryDelays) → 写值 → input/change/blur
  storage.onChanged(appConfig|extensionEnabled) → loadConfig() 重载
```
边界：填充失败写状态文案，不抛出；token 防重复填充。

## 2. popup 触发 content 填充 / 编辑
```
popup: chrome.tabs.query 当前tab → matchCurrentPage
  填充: sendMessage(WAA_FILL_ACCOUNT, accountId)
  编辑/新增: sendMessage(WAA_OPEN_ACCOUNT_EDITOR, accountId?)
content.onMessage:
  readAppConfig → 重算 matched
  FILL: 找账号 → fillMatchedAccount → sendResponse(ok|error)
  OPEN_EDITOR: setVisible(true) + 打开 AccountEditorModal → sendResponse(ok)
popup: 收 ok → window.close(); 收 error → 展示 fillStatus
```

## 3. 输入框账号选择器
```
document click → matched && showAccountPickerOnInputClick
  → isConfiguredInputTarget(target): 任一input字段 selector matches(target)?
  → 是: 在 (clientX,clientY) 弹 picker(默认账号优先)
keydown(capture): ↑/↓ 改 selectedIndex; Enter→pickAccount→fillMatchedAccount; Esc→关闭
mouseleave → 关闭
```

## 4. 配置页写操作通用时序
```
组件事件 → 构造 nextConfig(不可变, config-ops/helpers)
  → persist(next, status)
      → writeAppConfig(next): normalize → storage.local.set(appConfig)
      → setAppConfig(next) ; setStatus(status) ; useToast 反馈
  → storage.onChanged 通知 content/其他页面重载
```

## 5. 完整 JSON 保存 / 导入（严格闸）
```
保存: parseAppConfigText(text)= JSON.parse → normalize → validateAppConfig
  ok → persist(value,'JSON 已保存') ; 退出编辑
  fail → setErrors(path:message) ; 不覆盖现有配置
导入: file.text() → parseAppConfigText → ok? persist : 提示"导入失败"+errors
```

## 6. 导出
```
打开 ExportConfigModal → 选 projectIds + includeMinio(仅有凭据) + includeAppearance
  → exportConfigSubset(config, ...): 过滤项目 ; 不含MinIO→stripMinio ; 不含主题→删 appearance
  → Blob(JSON,2空格) → <a download=web-account-config.json>.click → revokeObjectURL
```

## 7. MinIO 同步
```
远程→本地:
  minioEnabled? 否→提示中止
  fetchRemoteConfig(GET) → mergeAppConfigs(config, remote, 'cloudToLocal')
  → persist(merged.config, warnings||'远程配置已同步到本地')
  → toast(warning if warnings else success)
本地→远程:
  minioEnabled? 否→提示中止
  pushRemoteConfig(PUT 整体覆盖)
  → persist({...config, meta:{lastSyncedAt:now, remoteRevision+1}}, '已同步到 MinIO')
测试: testMinioConnection(HEAD) → toast 成功/失败
```

## 8. /login 解密容错（page-guard, MAIN, document_start）
```
shouldGuardPage(/login)? 否→不介入
window.CryptoJS 已存在 → patchCryptoDecrypt
否则 defineProperty(window,'CryptoJS') set 时 patch + 轮询(10ms,5s)
patched AES.decrypt:
  ciphertext == null → 返回空 WordArray
  原decrypt throw TypeError(含'ciphertext') → 返回空 WordArray
  其他 → 照抛
```

## 9. 账号默认唯一性保证
- `config-ops.saveAccount(isDefault=true)` 与 `setDefaultAccount`：将同环境其他账号 `isDefault` 置否。
- 校验层 `validateEnv` 兜底：默认账号 >1 报错，阻止落盘。
- 浮窗 / popup 展示「默」标记并默认账号优先排序。
