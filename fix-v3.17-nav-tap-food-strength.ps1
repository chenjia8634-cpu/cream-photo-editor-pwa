$ErrorActionPreference = "Stop"

# v3.17 patch script
# - Disable iPhone double-tap zoom behavior on preview prev/next buttons.
# - Set universal_food default strength to 60% when that preset is selected.
# - Update app version, in-page changelog, README changelog, and service-worker cache.
# The script body is ASCII-only and writes project files as UTF-8 without BOM.

function U([string]$Text) {
  return [System.Text.RegularExpressions.Regex]::Unescape($Text)
}

$encoding = New-Object System.Text.UTF8Encoding($false)
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

$paths = @{
  Html = Join-Path $root "index.html"
  Style = Join-Path $root "style.css"
  Script = Join-Path $root "script.js"
  Readme = Join-Path $root "README.md"
  Sw = Join-Path $root "sw.js"
}

foreach ($path in $paths.Values) {
  if (-not (Test-Path $path)) {
    throw "Missing required file: $path"
  }
}

function Read-Utf8([string]$Path) {
  return [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
}

function Write-Utf8([string]$Path, [string]$Text) {
  [System.IO.File]::WriteAllText($Path, $Text, $encoding)
}

function Assert-Contains([string]$Text, [string]$Needle, [string]$Label) {
  if (-not $Text.Contains($Needle)) {
    throw "Self-check failed: $Label"
  }
}

function Assert-Regex([string]$Text, [string]$Pattern, [string]$Label) {
  if (-not [regex]::IsMatch($Text, $Pattern)) {
    throw "Self-check failed: $Label"
  }
}

function Backup-Files {
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $backupDir = Join-Path $root ".patch-backup-v3.17-$stamp"
  New-Item -ItemType Directory -Path $backupDir | Out-Null
  foreach ($entry in $paths.GetEnumerator()) {
    Copy-Item -LiteralPath $entry.Value -Destination (Join-Path $backupDir (Split-Path -Leaf $entry.Value)) -Force
  }
  return $backupDir
}

function Restore-Files([string]$BackupDir) {
  foreach ($entry in $paths.GetEnumerator()) {
    $source = Join-Path $BackupDir (Split-Path -Leaf $entry.Value)
    if (Test-Path $source) {
      Copy-Item -LiteralPath $source -Destination $entry.Value -Force
    }
  }
}

function Add-JsChangelog([string]$Script) {
  if ($Script.Contains('["v3.17"')) { return $Script }
  $entry = '  ["v3.17", "' +
    '\u4f18\u5316\u9884\u89c8\u4e0a\u4e00\u5f20\u002f\u4e0b\u4e00\u5f20\u6309\u94ae\uff0c\u51cf\u5c11\u0020\u0069\u0050\u0068\u006f\u006e\u0065\u0020\u8fde\u70b9\u89e6\u53d1\u9875\u9762\u53cc\u51fb\u653e\u5927\uff1b\u9009\u62e9\u4e07\u80fd\u7f8e\u98df\u8c03\u8272\u65f6\u9ed8\u8ba4\u5207\u5230\u0020\u0036\u0030\u0025\u0020\u5f3a\u5ea6\u3002' +
    '"],' + "`r`n"
  return $Script.Replace("const CHANGELOG = [`r`n", "const CHANGELOG = [`r`n$entry")
}

function Add-ReadmeChangelog([string]$Readme) {
  $versionLine = U '\u5f53\u524d\u7248\u672c\uff1a`v3.15`'
  $newVersionLine = U '\u5f53\u524d\u7248\u672c\uff1a`v3.17`'
  $versionPrefix = [regex]::Escape((U '\u5f53\u524d\u7248\u672c\uff1a'))
  $Readme = $Readme.Replace($versionLine, $newVersionLine)
  $Readme = [regex]::Replace($Readme, $versionPrefix + '`v3\.\d+`', $newVersionLine, 1)

  if ($Readme.Contains('`v3.17`')) { return $Readme }
  $heading = U '## \u66f4\u65b0\u65e5\u5fd7'
  $entry = U '- `v3.17`\uff1a\u4f18\u5316\u9884\u89c8\u4e0a\u4e00\u5f20/\u4e0b\u4e00\u5f20\u6309\u94ae\uff0c\u51cf\u5c11 iPhone \u8fde\u70b9\u89e6\u53d1\u9875\u9762\u53cc\u51fb\u653e\u5927\uff1b\u9009\u62e9\u4e07\u80fd\u7f8e\u98df\u8c03\u8272\u65f6\u9ed8\u8ba4\u5207\u5230 60% \u5f3a\u5ea6\u3002'
  $pattern = [regex]::Escape($heading) + '(\r?\n\r?\n)'
  return [regex]::Replace($Readme, $pattern, $heading + "`r`n`r`n" + $entry + "`r`n", 1)
}

$backup = Backup-Files

try {
  $html = Read-Utf8 $paths.Html
  $style = Read-Utf8 $paths.Style
  $script = Read-Utf8 $paths.Script
  $readme = Read-Utf8 $paths.Readme
  $sw = Read-Utf8 $paths.Sw

  # index.html version
  $html = $html.Replace("v3.15", "v3.17")
  $html = [regex]::Replace($html, 'v3\.\d+', 'v3.17')

  # style.css: target the preview nav controls only, so pinch zoom on the page remains available.
  $previewNavBlock = @'
.preview-nav {
  display: inline-flex;
  gap: 6px;
  margin-left: 8px;
  vertical-align: middle;
  touch-action: manipulation;
  -webkit-user-select: none;
  user-select: none;
}
'@

  $previewNavButtonBlock = @'
.preview-nav-button {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 1px solid rgba(137, 105, 69, 0.22);
  border-radius: 999px;
  color: #7a6047;
  background: #f5e6d1;
  font-size: 21px;
  font-weight: 760;
  line-height: 1;
  touch-action: manipulation;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
  -webkit-user-select: none;
  user-select: none;
}
'@

  $style = [regex]::Replace($style, '(?s)\.preview-nav\s*\{.*?\}', $previewNavBlock, 1)
  $style = [regex]::Replace($style, '(?s)\.preview-nav-button\s*\{.*?\}', $previewNavButtonBlock, 1)

  # script.js version + changelog
  $script = $script.Replace('const APP_VERSION = "v3.15";', 'const APP_VERSION = "v3.17";')
  $script = [regex]::Replace($script, 'const APP_VERSION = "v3\.\d+";', 'const APP_VERSION = "v3.17";', 1)
  $script = Add-JsChangelog $script

  # Add strength helper before preset change listener.
  if (-not $script.Contains("function setPresetStrength(percent)")) {
    $helper = @'
function setPresetStrength(percent) {
  const nextValue = Math.max(0, Math.min(100, Number(percent) || 0));
  strengthSlider.value = String(nextValue);
  presetStrength = nextValue / 100;
  strengthValue.textContent = `${nextValue}%`;
}

function applyPresetDefaultStrength() {
  if (activePresetId === "universal_food") {
    setPresetStrength(60);
  }
}

'@
    $script = $script.Replace('presetSelect.addEventListener("change", () => {', $helper + 'presetSelect.addEventListener("change", () => {')
  }

  # Replace preset change listener.
  $presetChangeBlock = @'
presetSelect.addEventListener("change", () => {
  activePresetId = presetSelect.value;
  applyPresetDefaultStrength();
  const presetName = COLOR_PRESETS[activePresetId]?.name || "\u5f53\u524d\u98ce\u683c";
  setStatus(`\u5df2\u5207\u6362\u5230\u300c${presetName}\u300d\uff0c\u5f53\u524d\u5f3a\u5ea6 ${strengthSlider.value}%\u3002\u5982\u9700\u5e94\u7528\u5230\u5f53\u524d\u56fe\u7247\uff0c\u8bf7\u70b9\u91cd\u65b0\u7528\u5f53\u524d\u5f3a\u5ea6\u5904\u7406\u3002`);
});
'@
  $script = [regex]::Replace($script, '(?s)presetSelect\.addEventListener\("change", \(\) => \{.*?\}\);', $presetChangeBlock, 1)

  # Use the helper for slider changes too.
  $strengthInputBlock = @'
strengthSlider.addEventListener("input", () => {
  setPresetStrength(strengthSlider.value);
});
'@
  $script = [regex]::Replace($script, '(?s)strengthSlider\.addEventListener\("input", \(\) => \{.*?\}\);', $strengthInputBlock, 1)

  # Replace prev/next click handlers with touch-safe binding.
  $navBindingBlock = @'
let previewNavLastTouchAt = 0;

function handlePreviewNavTap(direction, event) {
  if (event) {
    event.preventDefault();
    event.currentTarget?.blur?.();
  }

  if (event?.type === "click" && Date.now() - previewNavLastTouchAt < 260) {
    return;
  }

  if (event?.type === "touchend") {
    previewNavLastTouchAt = Date.now();
  }

  selectAdjacentBatchItem(direction);
}

function bindPreviewNavButton(button, direction) {
  button.addEventListener("touchend", (event) => {
    handlePreviewNavTap(direction, event);
  }, { passive: false });

  button.addEventListener("click", (event) => {
    handlePreviewNavTap(direction, event);
  });
}

bindPreviewNavButton(prevItemButton, -1);
bindPreviewNavButton(nextItemButton, 1);
'@
  $script = [regex]::Replace(
    $script,
    '(?s)(?:let previewNavLastTouchAt = 0;.*?bindPreviewNavButton\(nextItemButton, 1\);|prevItemButton\.addEventListener\("click", \(\) => \{\s*selectAdjacentBatchItem\(-1\);\s*\}\);\s*nextItemButton\.addEventListener\("click", \(\) => \{\s*selectAdjacentBatchItem\(1\);\s*\}\);)',
    $navBindingBlock,
    1
  )

  # README version + changelog
  $readme = Add-ReadmeChangelog $readme

  # service worker cache
  $sw = [regex]::Replace($sw, 'cream-photo-editor-v\d+', 'cream-photo-editor-v37', 1)

  Write-Utf8 $paths.Html $html
  Write-Utf8 $paths.Style $style
  Write-Utf8 $paths.Script $script
  Write-Utf8 $paths.Readme $readme
  Write-Utf8 $paths.Sw $sw

  # Self checks after writing.
  $html2 = Read-Utf8 $paths.Html
  $style2 = Read-Utf8 $paths.Style
  $script2 = Read-Utf8 $paths.Script
  $readme2 = Read-Utf8 $paths.Readme
  $sw2 = Read-Utf8 $paths.Sw

  Assert-Contains $html2 "v3.17" "index version"
  Assert-Contains $script2 'const APP_VERSION = "v3.17";' "script APP_VERSION"
  Assert-Contains $script2 '["v3.17"' "script changelog"
  Assert-Contains $script2 'function setPresetStrength(percent)' "strength helper"
  Assert-Contains $script2 'function applyPresetDefaultStrength()' "default strength helper"
  Assert-Contains $script2 'activePresetId === "universal_food"' "food preset default condition"
  Assert-Contains $script2 'setPresetStrength(60)' "food preset default 60"
  Assert-Contains $script2 'function handlePreviewNavTap(direction, event)' "preview nav tap handler"
  Assert-Contains $script2 'bindPreviewNavButton(prevItemButton, -1)' "prev nav binding"
  Assert-Contains $script2 'bindPreviewNavButton(nextItemButton, 1)' "next nav binding"
  Assert-Contains $style2 'touch-action: manipulation;' "touch action css"
  Assert-Contains $style2 '-webkit-touch-callout: none;' "touch callout css"
  Assert-Contains $style2 '.preview-nav-button' "preview nav button css"
  Assert-Contains $readme2 'v3.17' "README version/log"
  Assert-Contains $sw2 'cream-photo-editor-v37' "service worker cache"
  if ([regex]::IsMatch($script2, '(?<!Range)\bclamp\s*\(')) {
    throw "Self-check failed: unknown clamp() call remains"
  }

  Write-Host "Patch applied: v3.17 nav tap guard + universal food 60% default."
  Write-Host "Backup: $backup"
  Write-Host "Next: run git diff, then commit if it looks good."
  Write-Host (U 'Chinese commit: fix: \u4f18\u5316\u7ffb\u9875\u8fde\u70b9\u548c\u7f8e\u98df\u9ed8\u8ba4\u5f3a\u5ea6')
}
catch {
  Restore-Files $backup
  Write-Host "Patch failed. Restored files from: $backup"
  throw
}
