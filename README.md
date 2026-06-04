# 奶油感产品图自动调色工具

当前版本：`v2.7`

纯前端本地调色工具。用户在 iPhone 浏览器中上传一张或多张照片，也可以上传短视频，浏览器本地使用 Canvas API 完成固定预设调色，预览后保存 JPG 图片或调色后视频。照片和视频不会上传到服务器。

## 功能

- 支持 JPG、JPEG、PNG、HEIC、HEIF、MOV、MP4 上传。
- 支持一次选择多张图片，按顺序批量调色。
- 支持点击批量结果列表中的任意一张，切换上方预览和当前保存对象。
- 只保留调色后预览框，原图通过“按住看原图，松开看调色后”对比。
- 支持调色强度滑杆：0% 到 100%，默认 100%。
- HEIC/HEIF 会先在浏览器本地转码为 JPEG，再继续 Canvas 调色。
- 尽量通过浏览器 `imageOrientation: "from-image"` 能力修正 iPhone 照片方向。
- 图片使用 Canvas 读取和处理像素，输出高质量 JPG，质量约 `0.98`。
- iPhone 视频使用浏览器兼容模式逐帧调色并导出视频；该模式通常无法保留原声音，分辨率也会为了兼容性限制。
- 电脑浏览器如能加载 ffmpeg.wasm，会尝试高质量视频转码并优先保留声音。
- 适配 iPhone 竖屏。
- 包含 `manifest.json`，可作为 PWA 添加到 iPhone 主屏幕。

## 更新日志

- `v1.0`：完成首版 MVP，支持 JPG/PNG 上传、Canvas 本地调色、原图/调色后预览和 JPG 保存。
- `v1.1`：提升导出质量，减少 JPG 压缩导致的马赛克和画质损失。
- `v1.2`：修复手机端预览空白但可下载的问题。
- `v1.3`：增加 HEIC/HEIF 本地转码，iPhone 相册照片可直接导入调色。
- `v1.4`：增加批量导入、批量调色和批量保存。
- `v2.0`：尝试支持 Live Photo 转视频后的 MOV/MP4 视频调色。
- `v2.1`：优化视频导出预览、首帧和音频保留方向，并给标题增加版本号。
- `v2.2`：增加视频引擎下载进度提示。
- `v2.3`：增加视频引擎初始化等待提示和超时提示。
- `v2.4`：调整视频方案，避免 iPhone 端 ffmpeg 初始化长期卡住。
- `v2.5`：恢复 iPhone 视频兼容导出，增加调色强度滑杆、按住原图对比、批量结果点选预览。
- `v2.6`：精简预览区，只保留调色后预览框，原图改为按住按钮临时查看。
- `v2.7`：修复 iPhone 长按原图对比按钮触发文字选取的问题。

## Windows 本地测试

方式一：直接打开文件。

1. 进入 `cream-photo-editor-pwa` 文件夹。
2. 双击 `index.html`，用浏览器打开。
3. 上传 JPG、PNG、HEIC、HEIF、MOV 或 MP4 测试预览和保存。

方式二：用本地静态服务器测试，体验更接近部署环境。

```powershell
cd cream-photo-editor-pwa
python -m http.server 8080
```

然后在浏览器打开：

```text
http://localhost:8080
```

## 部署到 GitHub Pages

1. 新建 GitHub 仓库。
2. 上传 `cream-photo-editor-pwa` 文件夹中的所有文件到仓库根目录。
3. 进入仓库 `Settings`。
4. 打开 `Pages`。
5. `Build and deployment` 选择 `Deploy from a branch`。
6. 选择 `main` 分支和根目录。
7. 保存后等待 Pages 部署检查变成绿色。

如果文件放在仓库根目录，访问地址通常类似：

```text
https://你的用户名.github.io/仓库名/
```

## 部署到 Cloudflare Pages

1. 登录 Cloudflare。
2. 进入 `Workers & Pages`。
3. 选择 `Create application`，再选择 `Pages`。
4. 连接 GitHub 仓库。
5. 构建设置保持静态站点配置：
   - Build command 留空。
   - Build output directory 如果文件在仓库根目录则填 `/`，如果保留文件夹则填 `cream-photo-editor-pwa`。
6. 点击部署。

## iPhone 如何打开网页

部署后，把 GitHub Pages 或 Cloudflare Pages 的网页链接发到 iPhone，用 Safari 或 Chrome 打开即可。照片处理全部发生在手机浏览器本地。

## iPhone 如何添加到主屏幕

1. 用 Safari 打开网页。
2. 点击底部分享按钮。
3. 选择 `添加到主屏幕`。
4. 确认名称后点添加。

## iPhone 如何保存调色后的图片或视频

1. 打开网页并上传一张或多张文件。
2. 等待批量结果列表出现。
3. 点批量列表中的某一项，可以切换当前预览。
4. 单张保存：点底部 `保存当前结果`，或点每个结果旁边的 `下载`。
5. 批量保存：点底部 `保存全部结果`。
6. 如果出现系统分享面板，可以选择保存到照片或文件。
7. 如果浏览器走下载逻辑，文件会进入 Safari 下载列表，再从下载内容里打开保存。

## 关于 Live Photo 和视频

Live Photo 通常由一张照片和一段短视频组成。iPhone Safari 有时只会把 Live Photo 的静态照片交给网页，这种情况下工具只能调色静态封面。

如果要调色动态部分，请先在 iPhone 相册中把 Live Photo 存储为视频，再上传生成的 MOV/MP4。工具会在浏览器本地逐帧调色并导出视频。

iPhone 视频导出使用浏览器 MediaRecorder 兼容模式：优点是比 ffmpeg.wasm 更容易在 Safari 上跑通；缺点是通常不能保留原声音，画质和分辨率不如原视频。电脑浏览器会优先尝试 ffmpeg.wasm 高质量路径。

## 关于 HEIC / HEIF

工具会优先在浏览器本地把 HEIC/HEIF 转成 JPEG，再继续调色。不同 iPhone、iOS 版本和浏览器对 HEIC/HEIF 的支持仍可能有差异。如果转码失败，请刷新页面重试，或先在 iPhone 相册中复制、分享或导出为 JPEG 后再上传。

## 隐私说明

本工具没有后端，也不会上传照片或视频。文件通过浏览器 File API 读取，在本地完成 HEIC/HEIF 转码、Canvas 像素级调色和短视频逐帧调色，最终在本地导出 JPG 或视频。页面会从 CDN 加载 HEIC/HEIF 转码脚本和电脑端视频转码引擎，但照片和视频文件不会发送到 CDN 或服务器。
