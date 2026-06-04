# 奶油感产品图自动调色工具

当前版本：`v2.0`

一个纯前端 MVP：用户在 iPhone 浏览器中上传一张或多张照片，也可以上传短视频，浏览器本地使用 Canvas API 完成固定预设调色，预览后保存 JPG 图片或调色后视频。照片和视频不会上传到服务器。

## 功能

- 支持 JPG、JPEG、PNG、HEIC、HEIF、MOV、MP4 上传。
- 支持一次选择多张图片，按顺序批量调色。
- 支持 MOV/MP4 短视频本地高质量转码调色并导出 MP4，优先保留原视频声音。
- HEIC/HEIF 会先在浏览器本地转码为 JPEG，再继续 Canvas 调色。
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
3. 上传一张或多张 JPG、PNG、HEIC、HEIF、MOV 或 MP4 测试预览和保存。

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

## iPhone 如何保存调色后的图片或视频

1. 打开网页并上传一张或多张 JPG、JPEG、PNG、HEIC、HEIF、MOV 或 MP4。
2. 等待批量结果列表出现。
3. 单张保存：点击每张结果旁边的 `下载`，或点击底部 `保存当前结果` 保存最后一个结果。
4. 批量保存：点击底部 `保存全部结果`。
5. 如果出现系统分享面板，可以选择保存到照片或文件。
6. 如果浏览器走下载逻辑，文件会按顺序下载，可在下载内容中打开后保存。

## 关于 Live Photo 和视频

Live Photo 通常由一张照片和一段短视频组成。iPhone Safari 有时只会把 Live Photo 的静态照片交给网页，这种情况下工具只能调色静态封面。如果你要调色动态部分，请先在 iPhone 相册中把 Live Photo 存储为视频，再上传生成的 MOV/MP4。工具会在浏览器本地逐帧调色并导出视频。

视频导出使用浏览器本地的 ffmpeg.wasm 转码引擎。首次处理视频会下载约 30MB 的转码核心，之后由浏览器缓存。建议优先处理 Live Photo 这种几秒钟的短视频。工具会尽量保留原视频声音；如果原视频音频轨道无法直接复制，会改用 AAC 音频重新编码。

## 关于 HEIC / HEIF

工具会优先在浏览器本地把 HEIC/HEIF 转成 JPEG，再继续调色。不同 iPhone、iOS 版本和浏览器对 HEIC/HEIF 的支持仍可能有差异。如果转码失败，请刷新页面重试，或先在 iPhone 相册中复制、分享或导出为 JPEG 后再上传。

## 隐私说明

本工具没有后端，也不会上传照片或视频。文件通过浏览器 File API 读取，在本地完成 HEIC/HEIF 转码、Canvas 像素级调色和短视频 ffmpeg.wasm 转码调色，最终在本地导出 JPG 或 MP4。页面会从 CDN 加载 HEIC/HEIF 转码脚本和 ffmpeg.wasm 转码核心，但照片和视频文件不会发送到 CDN 或服务器。
