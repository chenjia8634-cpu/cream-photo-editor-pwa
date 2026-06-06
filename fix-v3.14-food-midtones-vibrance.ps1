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

function Add-JsChangelog([string]$Text, [string]$Version, [string]$EscapedMessage) {
  if ($Text -match ('\["' + [regex]::Escape($Version) + '",')) {
    return $Text
  }

  $line = '  ["' + $Version + '", "' + $EscapedMessage + '"],'
  $pattern = '(?m)^  \["v[0-9]+\.[0-9]+", .*\],\s*$'
  $matches = [regex]::Matches($Text, $pattern)
  if ($matches.Count -eq 0) {
    throw "Cannot find JS CHANGELOG insertion point."
  }

  $last = $matches[$matches.Count - 1]
  return $Text.Substring(0, $last.Index + $last.Length) + "`r`n" + $line + $Text.Substring($last.Index + $last.Length)
}

function Add-ReadmeChangelog([string]$Text, [string]$Version, [string]$Message) {
  if ($Text -match ('- `' + [regex]::Escape($Version) + '`')) {
    return $Text
  }

  $line = '- `' + $Version + '`' + [string][char]0xff1a + $Message
  $pattern = '(?m)^- `v[0-9]+\.[0-9]+`.*$'
  $matches = [regex]::Matches($Text, $pattern)
  if ($matches.Count -eq 0) {
    throw "Cannot find README changelog insertion point."
  }

  $last = $matches[$matches.Count - 1]
  return $Text.Substring(0, $last.Index + $last.Length) + "`r`n" + $line + $Text.Substring($last.Index + $last.Length)
}

function Assert-Contains([string]$Text, [string]$Needle, [string]$Label) {
  if (-not $Text.Contains($Needle)) {
    throw "Self-check failed: $Label"
  }
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
$script = [regex]::Replace($script, 'const APP_VERSION = "v3\.(11|12|13)";', 'const APP_VERSION = "v3.14";', 1)

$newFoodPreset = @'
  universal_food: {
    name: "\u4e07\u80fd\u7f8e\u98df\u8c03\u8272",
    mode: "food",
    base: {
      exposure_factor: 1.10,
      red_multiplier: 1.010,
      green_multiplier: 1.002,
      blue_multiplier: 0.990,
      contrast_factor: 1.045,
      saturation_factor: 1.08,
      gamma: 0.985,
    },
    highlight_protection: {
      enabled: true,
      start: 0.76,
      compression: 0.62,
    },
    sharpening: {
      amount: 0.14,
    },
  },
'@

$script = [regex]::Replace(
  $script,
  '(?s)  universal_food: \{.*?\n  \},\s*\};',
  $newFoodPreset + "};",
  1
)

$creamHeader = @'
function applyCreamPreset(source, target, strengthAmount = 1) {
  const preset = COLOR_PRESETS[activePresetId] || COLOR_PRESETS.cream_product;
  if (preset.mode === "food") {
    applyFoodPreset(source, target, preset, strengthAmount);
    return;
  }

  if (preset.mode === "config") {
    applyConfigPreset(source, target, preset, strengthAmount);
    return;
  }

  const sourceContext =
'@

$script = [regex]::Replace(
  $script,
  '(?s)function applyCreamPreset\(source, target, strengthAmount = 1\) \{\s*const preset = COLOR_PRESETS\[activePresetId\] \|\| COLOR_PRESETS\.cream_product;.*?const sourceContext =',
  $creamHeader,
  1
)

$foodFunction = @'
function applyFoodPreset(source, target, preset, strengthAmount = 1) {
  const sourceContext = source.getContext("2d", { willReadFrequently: true });
  const targetContext = target.getContext("2d", { willReadFrequently: true });
  const imageData = sourceContext.getImageData(0, 0, source.width, source.height);
  const data = imageData.data;
  const amount = clamp01(strengthAmount);
  const base = preset.base;
  const highlightProtection = preset.highlight_protection;
  let sharpenWeightSum = 0;

  for (let i = 0; i < data.length; i += 4) {
    const pixel = i / 4;
    const x = pixel % source.width;
    const y = Math.floor(pixel / source.width);
    const originalR = data[i] / 255;
    const originalG = data[i + 1] / 255;
    const originalB = data[i + 2] / 255;
    const originalLuma = getLuma(originalR, originalG, originalB);
    const highlightMask = smoothstep(0.68, 0.96, originalLuma);
    const strongHighlightMask = smoothstep(0.82, 0.99, originalLuma);
    const shadowMask = 1 - smoothstep(0.06, 0.32, originalLuma);
    const midtoneMask = (1 - highlightMask * 0.88) * (1 - shadowMask * 0.62);
    const foodExposure = 1 + (base.exposure_factor - 1) * amount * midtoneMask;
    const channelAmount = amount * (1 - strongHighlightMask * 0.78) * (1 - shadowMask * 0.28);

    let r = originalR * foodExposure * mix(1, base.red_multiplier, channelAmount);
    let g = originalG * foodExposure * mix(1, base.green_multiplier, channelAmount);
    let b = originalB * foodExposure * mix(1, base.blue_multiplier, channelAmount);

    const contrastAmount = amount * (1 - strongHighlightMask * 0.52) * (1 - shadowMask * 0.18);
    r = (r - 0.5) * mix(1, base.contrast_factor, contrastAmount) + 0.5;
    g = (g - 0.5) * mix(1, base.contrast_factor, contrastAmount) + 0.5;
    b = (b - 0.5) * mix(1, base.contrast_factor, contrastAmount) + 0.5;

    const gammaPower = 1 / Math.max(0.01, mix(1, base.gamma, amount * midtoneMask));
    r = Math.pow(clamp01(r), gammaPower);
    g = Math.pow(clamp01(g), gammaPower);
    b = Math.pow(clamp01(b), gammaPower);

    let hsl = rgbToHsl(r, g, b);
    const originalHsl = rgbToHsl(originalR, originalG, originalB);
    const neutralMask = 1 - smoothstep(0.025, 0.16, originalHsl.s);
    const highSaturationMask = smoothstep(0.42, 0.86, originalHsl.s);
    const vibranceAmount = amount *
      (1 - neutralMask * 0.78) *
      (1 - highSaturationMask * 0.58) *
      (1 - strongHighlightMask * 0.74) *
      (1 - shadowMask * 0.25);

    hsl.s *= mix(1, base.saturation_factor, vibranceAmount);

    const warmFoodMask = Math.max(
      hueRangeMask(hsl.h, 12, 48),
      hueRangeMask(hsl.h, 48, 82) * 0.82,
    );
    const redFoodMask = hueRangeMask(hsl.h, 345, 18);
    const greenMask = hueRangeMask(hsl.h, 85, 165);
    const blueMask = hueRangeMask(hsl.h, 205, 255);

    hsl.s *= 1 + warmFoodMask * 0.045 * vibranceAmount;
    hsl.s *= 1 + redFoodMask * 0.035 * vibranceAmount;
    hsl.s *= 1 - greenMask * 0.035 * amount;
    hsl.s *= 1 - blueMask * 0.035 * amount;
    hsl.h = normalizeHue(hsl.h - warmFoodMask * 1.2 * vibranceAmount);

    [r, g, b] = hslToRgb(hsl.h, hsl.s, hsl.l);

    const shoulderAmount = amount * smoothstep(0.72, 1, originalLuma);
    r = mix(r, protectHighlight(r, highlightProtection), shoulderAmount);
    g = mix(g, protectHighlight(g, highlightProtection), shoulderAmount);
    b = mix(b, protectHighlight(b, highlightProtection), shoulderAmount);

    const targetLuma = getLuma(r, g, b);
    const maxHighlightRise = 0.035 + (1 - strongHighlightMask) * 0.055;
    const maxLuma = originalLuma + maxHighlightRise * amount * (1 - shadowMask);
    if (highlightMask > 0 && targetLuma > maxLuma) {
      [r, g, b] = shiftRgbToLuma(r, g, b, mix(targetLuma, maxLuma, highlightMask));
    }

    const minShadowLuma = originalLuma - 0.018 * amount;
    if (shadowMask > 0 && getLuma(r, g, b) < minShadowLuma) {
      [r, g, b] = shiftRgbToLuma(r, g, b, minShadowLuma);
    }

    r = mix(originalR, r, amount);
    g = mix(originalG, g, amount);
    b = mix(originalB, b, amount);

    const dither = (deterministicDither(x, y) / 255) * amount * (1 - strongHighlightMask * 0.82);
    data[i] = toByte(r + dither);
    data[i + 1] = toByte(g + dither);
    data[i + 2] = toByte(b + dither);

    sharpenWeightSum += amount * (1 - strongHighlightMask * 0.78) * (1 - shadowMask * 0.38);
  }

  const averageSharpenWeight = sharpenWeightSum / (data.length / 4);
  if (preset.sharpening?.amount && averageSharpenWeight > 0.001) {
    applySubtleSharpen(imageData, source.width, source.height, preset.sharpening.amount * averageSharpenWeight);
  }

  targetContext.putImageData(imageData, 0, 0);
}

'@

if ($script -notmatch 'function applyFoodPreset') {
  $script = $script.Replace('function applyConfigPreset(source, target, preset, strengthAmount = 1) {', $foodFunction + 'function applyConfigPreset(source, target, preset, strengthAmount = 1) {')
} else {
  $script = [regex]::Replace(
    $script,
    '(?s)function applyFoodPreset\(source, target, preset, strengthAmount = 1\) \{.*?\n\}\r?\n\r?\nfunction applyConfigPreset',
    $foodFunction + 'function applyConfigPreset',
    1
  )
}

$script = Add-JsChangelog $script "v3.14" "\u91cd\u505a\u4e07\u80fd\u7f8e\u98df\u8c03\u8272\u4e3a\u4e13\u7528\u7b97\u6cd5\uff0c\u4e2d\u95f4\u8c03\u63d0\u4eae\uff0c\u9ad8\u5149\u5148\u4fdd\u62a4\uff0c\u6697\u90e8\u4e0d\u989d\u5916\u63d0\u4eae\uff0c\u7528\u81ea\u7136\u9c9c\u660e\u5ea6\u4fdd\u7559\u98df\u7269\u8272\u5f69\u548c\u7ec6\u8282\u3002"
Write-Utf8 $scriptPath $script

$index = Read-Utf8 $indexPath
$index = [regex]::Replace($index, 'v3\.(11|12|13)', 'v3.14')
Write-Utf8 $indexPath $index

$readme = Read-Utf8 $readmePath
$readme = [regex]::Replace(
  $readme,
  '(?m)^' + [regex]::Escape((U '\u5f53\u524d\u7248\u672c\uff1a')) + '`v3\.(11|12|13)`$',
  (U '\u5f53\u524d\u7248\u672c\uff1a`v3.14`'),
  1
)
$readme = Add-ReadmeChangelog $readme "v3.14" (U '\u91cd\u505a\u4e07\u80fd\u7f8e\u98df\u8c03\u8272\u4e3a\u4e13\u7528\u7b97\u6cd5\uff0c\u4e2d\u95f4\u8c03\u63d0\u4eae\uff0c\u9ad8\u5149\u5148\u4fdd\u62a4\uff0c\u6697\u90e8\u4e0d\u989d\u5916\u63d0\u4eae\uff0c\u7528\u81ea\u7136\u9c9c\u660e\u5ea6\u4fdd\u7559\u98df\u7269\u8272\u5f69\u548c\u7ec6\u8282\u3002')
Write-Utf8 $readmePath $readme

$sw = Read-Utf8 $swPath
$sw = [regex]::Replace($sw, 'cream-photo-editor-v3[1-3]', 'cream-photo-editor-v34', 1)
Write-Utf8 $swPath $sw

$scriptCheck = Read-Utf8 $scriptPath
$indexCheck = Read-Utf8 $indexPath
$readmeCheck = Read-Utf8 $readmePath
$swCheck = Read-Utf8 $swPath

Assert-Contains $scriptCheck 'const APP_VERSION = "v3.14";' "script APP_VERSION v3.14"
Assert-Contains $scriptCheck 'mode: "food"' "food preset mode"
Assert-Contains $scriptCheck 'function applyFoodPreset' "food algorithm function"
Assert-Contains $scriptCheck '["v3.14",' "script CHANGELOG v3.14"
Assert-Contains $indexCheck 'v3.14' "index v3.14"
Assert-Contains $readmeCheck '`v3.14`' "README current version v3.14"
Assert-Contains $readmeCheck '- `v3.14`' "README changelog v3.14"
Assert-Contains $swCheck 'cream-photo-editor-v34' "service worker cache v34"

Write-Host "Patch applied: v3.14 dedicated food preset algorithm."
Write-Host "Self-check passed: script, HTML, README, and service worker were updated."
