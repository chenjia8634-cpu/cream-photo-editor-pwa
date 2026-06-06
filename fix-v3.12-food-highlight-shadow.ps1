$ErrorActionPreference = "Stop"

function U([string]$Text) {
  return [System.Text.RegularExpressions.Regex]::Unescape($Text)
}

function Read-Utf8([string]$Path) {
  return [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
}

function Write-Utf8([string]$Path, [string]$Text) {
  $encoding = [System.Text.UTF8Encoding]::new($false)
  [System.IO.File]::WriteAllText($Path, $Text, $encoding)
}

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$scriptPath = Join-Path $root "script.js"
$indexPath = Join-Path $root "index.html"
$readmePath = Join-Path $root "README.md"
$swPath = Join-Path $root "sw.js"

foreach ($path in @($scriptPath, $indexPath, $readmePath, $swPath)) {
  if (-not (Test-Path $path)) {
    throw "Missing file: $path"
  }
}

$script = Read-Utf8 $scriptPath
$script = $script.Replace('const APP_VERSION = "v3.11";', 'const APP_VERSION = "v3.12";')

$newFoodPreset = @'
  universal_food: {
    name: "\u4e07\u80fd\u7f8e\u98df\u8c03\u8272",
    mode: "config",
    base: {
      exposure_factor: 1.08,
      red_multiplier: 1.012,
      green_multiplier: 1.002,
      blue_multiplier: 0.988,
      black_lift: 0.001,
      contrast_factor: 1.055,
      saturation_factor: 1.10,
      gamma: 0.985,
    },
    tone_curve: [
      [0.00, 0.000],
      [0.20, 0.205],
      [0.50, 0.515],
      [0.75, 0.738],
      [0.90, 0.825],
      [1.00, 0.935],
    ],
    selective_colors: [
      { hue_range: [345, 15], saturation_multiplier: 1.07, lightness_shift: 0.000, hue_shift: 0 },
      { hue_range: [15, 45], saturation_multiplier: 1.10, lightness_shift: 0.001, hue_shift: -1 },
      { hue_range: [45, 85], saturation_multiplier: 1.08, lightness_shift: 0.000, hue_shift: -1 },
      { hue_range: [85, 165], saturation_multiplier: 1.01, lightness_shift: 0.000, hue_shift: -2 },
      { hue_range: [165, 210], saturation_multiplier: 0.98, lightness_shift: 0.000, hue_shift: -1 },
      { hue_range: [210, 255], saturation_multiplier: 0.96, lightness_shift: 0.000, hue_shift: 1 },
      { hue_range: [255, 305], saturation_multiplier: 0.98, lightness_shift: 0.000, hue_shift: 0 },
      { hue_range: [305, 345], saturation_multiplier: 1.03, lightness_shift: 0.000, hue_shift: 0 },
    ],
    highlight_protection: {
      enabled: true,
      start: 0.70,
      compression: 0.36,
    },
    shadow_handling: {
      lift: 0.000,
      softness: 0.22,
    },
    sharpening: {
      amount: 0.18,
    },
  },
'@

$script = [regex]::Replace(
  $script,
  '(?s)  universal_food: \{.*?\n  \},\r?\n\};',
  $newFoodPreset + "};"
)

if ($script -notmatch 'v3\.12') {
  $scriptLine = '  ["v3.12", "\u4f18\u5316\u4e07\u80fd\u7f8e\u98df\u8c03\u8272\uff0c\u964d\u4f4e\u9ad8\u5149\u63d0\u4eae\u5e76\u4fdd\u7559\u767d\u8272\u7ec6\u8282\uff0c\u51cf\u5c11\u6697\u90e8\u63d0\u4eae\u4ee5\u589e\u5f3a\u753b\u9762\u5c42\u6b21\u3002"],'
  $script = [regex]::Replace(
    $script,
    '(?m)^  \["v3\.11", .*\],\s*$',
    { param($m) $m.Value + "`r`n" + $scriptLine },
    1
  )
}
Write-Utf8 $scriptPath $script

$index = Read-Utf8 $indexPath
$index = $index.Replace('v3.11', 'v3.12')
Write-Utf8 $indexPath $index

$readme = Read-Utf8 $readmePath
$readme = [regex]::Replace(
  $readme,
  '(?m)^' + [regex]::Escape((U '\u5f53\u524d\u7248\u672c\uff1a`v3.11`')) + '$',
  (U '\u5f53\u524d\u7248\u672c\uff1a`v3.12`'),
  1
)

if ($readme -notmatch 'v3\.12') {
  $readmeLine = U '- `v3.12`\uff1a\u4f18\u5316\u4e07\u80fd\u7f8e\u98df\u8c03\u8272\uff0c\u964d\u4f4e\u9ad8\u5149\u63d0\u4eae\u5e76\u4fdd\u7559\u767d\u8272\u7ec6\u8282\uff0c\u51cf\u5c11\u6697\u90e8\u63d0\u4eae\u4ee5\u589e\u5f3a\u753b\u9762\u5c42\u6b21\u3002'
  $readme = [regex]::Replace(
    $readme,
    '(?m)^- `v3\.11`.*$',
    { param($m) $m.Value + "`r`n" + $readmeLine },
    1
  )
}
Write-Utf8 $readmePath $readme

$sw = Read-Utf8 $swPath
$sw = $sw.Replace('cream-photo-editor-v31', 'cream-photo-editor-v32')
Write-Utf8 $swPath $sw

Write-Host "Patch applied: v3.12 food preset highlight/shadow tuning."
Write-Host "Next: run git diff, then commit and push if everything looks good."
