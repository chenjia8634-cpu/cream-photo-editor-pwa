# AGENTS.md

## 项目

- 项目名：奶油感产品图自动调色工具。
- 类型：纯前端 PWA，部署到 GitHub Pages。
- 技术栈：HTML、CSS、JavaScript、Canvas API。
- 不使用 Python 后端，不上传照片到服务器，不使用 AI 图像生成。
- 仓库路径：`D:\调色小工具\cream-photo-editor-pwa\cream-photo-editor-pwa`。
- 远程仓库：`https://github.com/chenjia8634-cpu/cream-photo-editor-pwa.git`。
- 主要文件：`index.html`、`style.css`、`script.js`、`manifest.json`、`sw.js`、`README.md`。

## 用户规则

- 默认不要修改文件。只有用户明确说“允许修改”“提交并推送”“帮我改”等，才可以编辑项目文件。
- 用户要求“生成脚本”时，只新增 `.ps1` 脚本文件，不直接执行脚本修改项目文件。
- 如果用户明确说“提交并推送”，再执行 `git add`、`git commit`、`git push origin main`。
- 每次需要提交时，都给中文 commit 信息。

## 版本更新硬规则

每次改版本必须同步这些位置：

- `index.html`：`<title>` 和 `.version-badge`。
- `script.js`：`APP_VERSION` 和 `CHANGELOG`。
- `README.md`：当前版本和更新日志。
- `sw.js`：`CACHE_NAME`，避免手机 Safari 吃旧缓存。

更新日志不能只改 README，也不能只改网页弹窗。`script.js` 的 `CHANGELOG` 是网页里“更新日志”弹窗的数据源。

## 编码规则

- 所有项目文件和补丁脚本都必须保存为 UTF-8 without BOM。
- 生成 PowerShell 脚本时，优先使用 ASCII 脚本正文；中文内容用 `\uXXXX` 加 `Regex.Unescape()` 生成，避免 PowerShell 乱码。
- 如果脚本必须直接包含中文，写入文件时必须使用：

```powershell
$encoding = [System.Text.UTF8Encoding]::new($false)
[System.IO.File]::WriteAllText($path, $text, $encoding)
```

- 脚本生成后必须先做语法检查：

```powershell
$errors = $null
[System.Management.Automation.Language.Parser]::ParseFile((Resolve-Path ".\fix-name.ps1"), [ref]$null, [ref]$errors) | Out-Null
if ($errors -and $errors.Count) { $errors | ForEach-Object { $_.Message } } else { "OK" }
```

## 脚本自检规则

补丁脚本必须在最后检查：

- `script.js` 是否包含目标 `APP_VERSION`。
- `script.js` 是否包含目标 `CHANGELOG` 版本号，例如 `["v3.14",`。
- `index.html` 是否包含目标版本号。
- `README.md` 是否包含目标当前版本和更新日志。
- `sw.js` 是否包含新的缓存名。
- 如果新增或切换预设算法，要检查预设 `mode` 和对应函数名。

不要用宽泛判断，例如只检查文件里有没有 `v3.14`。要检查具体位置或具体片段。

## 调色目标

- 目标风格接近小红书生活方式图：明亮但不过曝、暖粉棕、奶白、高光柔、暗部有对比。
- 不要让画面整体发灰、发白、发雾。
- 白色区域要保留层次，不能为了防过曝把中间调整体拖黑。
- 深色区域要适度加深，但不能压死。
- 有颜色的区域要保留饱和度，尤其粉色、奶黄、暖棕、食物橙黄、包装蓝色不能被洗灰。

## 当前重要预设

- `cream_product`：奶油感产品图。
- `warm_brown_soft_clean`：暖棕清透轻调。
- `pink_brown_home_kawaii`：粉棕居家玩偶感。
- `universal_food`：万能美食调色。

万能美食调色的注意点：

- 高光必须先保护，再做中间调提亮和鲜明度。
- 暗部不要额外提亮，否则画面没层次。
- 不要直接全局拉高饱和度，要用类似 vibrance 的方式，少影响白色和高饱和区域。
- 锐化/清晰度只做轻微，且避开高光和暗部，防止白色细节变成色块。

## 常用检查

```powershell
rg -n "APP_VERSION|CHANGELOG|CACHE_NAME|v3\." index.html script.js README.md sw.js
rg -n "瀹|澧|淇|鎻|绮|璋|銆|€|�" script.js README.md AGENTS.md
node --check script.js
git status --short
```

如果系统 `node` 被拒绝访问，使用 Codex bundled Node 或只做文本和浏览器检查。
