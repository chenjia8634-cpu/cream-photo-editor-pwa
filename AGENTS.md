# AGENTS.md

## 项目

- 项目名：奶油感产品图自动调色工具。
- 类型：纯前端 PWA，部署到 GitHub Pages。
- 技术栈：HTML、CSS、JavaScript、Canvas API，不能使用 Python 后端，不能上传图片到服务器。
- 仓库路径：`D:\调色小工具\cream-photo-editor-pwa\cream-photo-editor-pwa`。
- 远程仓库：`https://github.com/chenjia8634-cpu/cream-photo-editor-pwa.git`。
- 主要文件：`index.html`、`style.css`、`script.js`、`manifest.json`、`sw.js`、`README.md`。

## 用户偏好

- 用户希望改完后如果明确说“提交并推送”，就直接 `git commit` 和 `git push origin main`。
- 每次更新都要给中文 commit 信息。
- 每次版本更新要同步：
  - `index.html` 页面标题和 `.version-badge`
  - `script.js` 里的 `APP_VERSION` 和 `CHANGELOG`
  - `README.md` 当前版本和更新日志
  - `sw.js` 的 `CACHE_NAME`，避免手机 Safari 吃旧缓存
- 最终回复要简短说明版本号、commit hash、是否已推送。

## 调色目标

- 目标风格接近小红书生活方式图：明亮但不过曝、暖粉棕、奶白、高光柔、暗部有对比。
- 不要把整张图压暗，不要让画面发灰、发白、发雾。
- 白色区域要保留层次，但不能为了防过曝把中间调整体拖黑。
- 深色区域需要适度加深，避免画面灰蒙蒙。
- 有颜色的区域要保留饱和度，尤其粉色、奶黄、暖棕、食物橙黄、包装蓝色不能被洗灰。

## 当前重要预设

- `cream_product`：老版奶油感产品图。
- `warm_brown_soft_clean`：暖棕清透轻调。
- `pink_brown_home_kawaii`：粉棕居家玩偶感，是当前重点优化预设。

`pink_brown_home_kawaii` 的方向：
- 参考图亮度统计大致：p50 多数在 `0.43-0.52`，p95 常在 `0.85-0.89`。
- 算法应使用自适应亮度分析，而不是固定大幅加减 EV。
- 需要 `luma_guard` 保护亮度层次，也需要 `color_depth_guard` 保留颜色和加深暗部。

## 常用检查

```powershell
& 'C:\Users\KIWIk-DEV-HW-06\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --check script.js
rg -n "v3\.|APP_VERSION|CACHE_NAME|pink_brown_home_kawaii|CHANGELOG" index.html script.js README.md sw.js
git status --short
git log -1 --oneline
```

## 提交示例

```powershell
git add README.md index.html script.js style.css sw.js AGENTS.md
git commit -m "fix: 优化粉棕居家预设对比和预览切换"
git push origin main
```

## 注意

- 不要引入后端。
- 不要引入 AI 图像生成。
- 图片和视频必须保持浏览器本地处理。
- 改 UI 时优先适配 iPhone 竖屏。
- GitHub Pages 推送后需要等部署变绿，手机端再刷新。
