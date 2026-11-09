# 更新记录

## v1.1.0（2026-11-09）

- 优化：IP 查询加 6 秒超时，单个查询源卡住会自动切换备用源，不再让面板一直转圈
- 优化：点开面板先立即显示上次检测结果，再在后台刷新，打开不再白屏等待
- 优化：设置页保存时校验国家/地区代码（必须两位字母，如 CN），填错当场提示，不再静默存错
- 优化：账号对照表改为安全的 DOM 构建，不再用 innerHTML 拼用户填写的内容
- 发布整理：仓库改为纯文本（不再带二进制图标文件），通知图标改用内嵌 data URL；自定义图标改为可选，见 `icons/README.md`
- 新增：README 完整使用说明、PRIVACY.md 隐私说明、LICENSE、CHANGELOG.md

## v1.0.1（2026-11-09）

- 修复：`manifest.json` 声明了 `default_locale` 却缺少 `_locales` 文件夹，导致 Edge/Chrome 加载时报错 “Default locale was specified, but _locales subtree is missing”。已移除该声明

## v1.0.0（2026-11-09）

- 首个版本：IP 出口 / 设备时区 / 常驻地与账号地区三方对照，风险分级（✅ / ⚠️ / 🚨），定时检测 + 工具栏角标 + 通知，三个 IP 查询源自动兜底
