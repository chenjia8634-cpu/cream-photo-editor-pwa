# 奶油感产品图自动调色工具

一个纯前端 MVP：用户在 iPhone 浏览器中上传照片，浏览器本地使用 Canvas API 完成固定预设调色，预览后保存 JPG 图片。照片不会上传到服务器。

## 功能

- 支持 JPG、JPEG、PNG 上传。
- 尽量通过浏览器 `imageOrientation: "from-image"` 能力修正 iPhone 照片方向。
- 使用 Canvas 读取和处理像素。
- 固定 deterministic preset：轻微提亮、暖白平衡、抬黑位、降对比、提亮中间调、压高光、低饱和、选择性压黄绿蓝。
- 显示原图和调色后预览。
- 输出高质量 JPG，质量约 `0.98`，默认尽量保留原图尺寸。
- 适配 iPhone 竖屏。
- 包含 `manifest.json`，可作为 PWA 添加到 iPhone 主屏幕。

## Windows 本地测试

方式一：直接打开文件。

1. 进入 `cream-photo-editor-pwa` 文件夹。
2. 双击 `index.html`，用浏览器打开。
3. 上传一张 JPG 或 PNG 测试预览和保存。

方式二：用本地静态服务器测试，体验更接近部署环境。

```powershell
cd cream-photo-editor-pwa
python -m http.server 8080
```

然后在浏览器打开：

```text
http://localhost:8080
```

如果电脑没有 Python，也可以用 VS Code 的 Live Server 插件，或任意静态文件服务器。

## 部署到 GitHub Pages

1. 新建 GitHub 仓库。
2. 上传 `cream-photo-editor-pwa` 文件夹中的所有文件到仓库根目录，或上传整个文件夹。
3. 进入仓库 `Settings`。
4. 打开 `Pages`。
5. `Build and deployment` 选择 `Deploy from a branch`。
6. 选择 `main` 分支和对应目录。
7. 保存后等待 GitHub Pages 生成访问链接。

如果文件放在仓库根目录，通常访问地址类似：

```text
https://你的用户名.github.io/仓库名/
```

## 部署到 Cloudflare Pages

1. 登录 Cloudflare。
2. 进入 `Workers & Pages`。
3. 选择 `Create application`，再选择 `Pages`。
4. 连接 GitHub 仓库。
5. 构建设置保持简单静态站点配置：
   - Build command 留空。
   - Build output directory 如果文件在仓库根目录则填 `/`，如果保留文件夹则填 `cream-photo-editor-pwa`。
6. 点击部署。

## iPhone 如何打开网页

部署后，把 GitHub Pages 或 Cloudflare Pages 的网页链接发到 iPhone，用 Safari 或 Chrome 打开即可。照片处理全部发生在手机浏览器本地。

## iPhone 如何添加到主屏幕

1. 用 Safari 打开网页。
2. 点击底部分享按钮。
3. 选择 `添加到主屏幕`。
4. 确认名称后点击添加。

之后可以像普通 App 一样从主屏幕打开。

## iPhone 如何保存调色后的图片

1. 打开网页并上传 JPG、JPEG 或 PNG。
2. 等待调色后预览出现。
3. 点击 `保存图片`。
4. 如果出现系统分享面板，可以选择保存到照片或文件。
5. 如果浏览器走下载逻辑，图片会下载为 JPG 文件，可在下载内容中打开后保存。

## 关于 HEIC

目前 MVP 主要保证 JPG、JPEG、PNG 链路稳定。HEIC 在不同 iPhone、iOS 版本和浏览器中支持不完全一致。如果上传 HEIC 不稳定，请先在 iPhone 相册中复制、分享或导出为 JPEG 后再上传。

## 隐私说明

本工具没有后端，也不会上传照片。图片通过浏览器 File API 读取，在 Canvas 中完成像素级调色，最终在本地导出 JPG。
