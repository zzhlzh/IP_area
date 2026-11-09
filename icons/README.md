# 图标（可选）

这个仓库不带二进制图标文件：扩展可以正常加载，浏览器会显示默认图标，
通知图标已在 `background.js` 里用内嵌的 data URL 小图代替，不依赖图标文件。

如果你想给工具栏换上自定义地球图标：

1. 运行本目录的脚本生成 PNG（需要 Python 和 Pillow）：

   ```bash
   pip install pillow
   python icons/generate_icons.py
   ```

   会生成 `icon16.png`、`icon48.png`、`icon128.png`。

2. 在 `manifest.json` 里加回图标声明：

   ```json
   "icons": { "16": "icons/icon16.png", "48": "icons/icon48.png", "128": "icons/icon128.png" },
   "action": {
     "default_popup": "popup.html",
     "default_title": "地区对齐检测",
     "default_icon": { "16": "icons/icon16.png", "48": "icons/icon48.png", "128": "icons/icon128.png" }
   }
   ```

3. 回到浏览器扩展页，点这个扩展卡片上的刷新按钮。
