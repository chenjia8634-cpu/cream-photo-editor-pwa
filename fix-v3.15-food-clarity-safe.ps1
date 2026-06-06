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

function Assert-Contains([string]$Text, [string]$Needle, [string]$Label) {
  if (-not $Text.Contains($Needle)) {
    throw "Self-check failed: $Label"
  }
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

function Remove-JsChangelog([string]$Text, [string]$Version) {
  $pattern = '(?m)^  \["' + [regex]::Escape($Version) + '", .*\],\r?\n?'
  return [regex]::Replace($Text, $pattern, '', 1)
}

function Remove-ReadmeChangelog([string]$Text, [string]$Version) {
  $pattern = '(?m)^- `' + [regex]::Escape($Version) + '`.*\r?\n?'
  return [regex]::Replace($Text, $pattern, '', 1)
}

function Replace-JsObjectProperty([string]$Text, [string]$PropertyName, [string]$Replacement) {
  $needle = "  " + $PropertyName + ": {"
  $start = $Text.IndexOf($needle)
  if ($start -lt 0) {
    throw "Cannot find object property: $PropertyName"
  }

  $brace = $Text.IndexOf("{", $start)
  $depth = 0
  $end = -1
  for ($i = $brace; $i -lt $Text.Length; $i++) {
    $ch = $Text[$i]
    if ($ch -eq "{") { $depth++ }
    elseif ($ch -eq "}") {
      $depth--
      if ($depth -eq 0) {
        $end = $i + 1
        break
      }
    }
  }
  if ($end -lt 0) {
    throw "Cannot find end of object property: $PropertyName"
  }

  while ($end -lt $Text.Length -and [char]::IsWhiteSpace($Text[$end])) {
    $end++
  }
  if ($end -lt $Text.Length -and $Text[$end] -eq ",") {
    $end++
  }

  return $Text.Substring(0, $start) + $Replacement + $Text.Substring($end)
}

function Replace-JsFunction([string]$Text, [string]$FunctionName, [string]$Replacement) {
  $needle = "function " + $FunctionName + "("
  $start = $Text.IndexOf($needle)
  if ($start -lt 0) {
    throw "Cannot find function: $FunctionName"
  }

  $brace = $Text.IndexOf("{", $start)
  $depth = 0
  $end = -1
  for ($i = $brace; $i -lt $Text.Length; $i++) {
    $ch = $Text[$i]
    if ($ch -eq "{") { $depth++ }
    elseif ($ch -eq "}") {
      $depth--
      if ($depth -eq 0) {
        $end = $i + 1
        break
      }
    }
  }
  if ($end -lt 0) {
    throw "Cannot find end of function: $FunctionName"
  }

  return $Text.Substring(0, $start) + $Replacement + $Text.Substring($end)
}

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$scriptPath = Join-Path $root "script.js"
$indexPath = Join-Path $root "index.html"
$readmePath = Join-Path $root "README.md"
$swPath = Join-Path $root "sw.js"

$files = @($scriptPath, $indexPath, $readmePath, $swPath)
foreach ($path in $files) {
  if (-not (Test-Path $path)) {
    throw "Missing file: $path"
  }
}

$backupDir = Join-Path $root (".patch-backup-v3.15-" + (Get-Date -Format "yyyyMMdd-HHmmss"))
New-Item -ItemType Directory -Path $backupDir | Out-Null
foreach ($path in $files) {
  Copy-Item -LiteralPath $path -Destination (Join-Path $backupDir (Split-Path $path -Leaf))
}

try {
  $script = Read-Utf8 $scriptPath
  $script = [regex]::Replace($script, 'const APP_VERSION = "v3\.[0-9]+";', 'const APP_VERSION = "v3.15";', 1)

  $foodPreset = @'
  universal_food: {
    name: "\u4e07\u80fd\u7f8e\u98df\u8c03\u8272",
    mode: "food",
    base: {
      exposure_factor: 1.075,
      red_multiplier: 1.006,
      green_multiplier: 1.000,
      blue_multiplier: 0.992,
      contrast_factor: 1.055,
      saturation_factor: 1.13,
      gamma: 0.972,
    },
    highlight_protection: {
      enabled: true,
      start: 0.66,
      compression: 0.58,
    },
    clarity: {
      radius: 2,
      amount: 0.24,
    },
    sharpening: {
      amount: 0.08,
    },
  },
'@

  $script = Replace-JsObjectProperty $script "universal_food" $foodPreset

  $applyFoodPreset = @'
function applyFoodPreset(source, target, preset, strengthAmount = 1) {
  const sourceContext = source.getContext("2d", { willReadFrequently: true });
  const targetContext = target.getContext("2d", { willReadFrequently: true });
  const imageData = sourceContext.getImageData(0, 0, source.width, source.height);
  const data = imageData.data;
  const original = new Uint8ClampedArray(data);
  const width = source.width;
  const height = source.height;
  const total = width * height;
  const amount = clamp01(strengthAmount);
  const base = preset.base;
  const highlightProtection = preset.highlight_protection;
  const lumaMap = new Float32Array(total);

  for (let p = 0, i = 0; p < total; p += 1, i += 4) {
    lumaMap[p] = getLuma(original[i] / 255, original[i + 1] / 255, original[i + 2] / 255);
  }

  const blurredLuma = blurFloatMap(lumaMap, width, height, preset.clarity?.radius || 2);
  let sharpenWeightSum = 0;

  for (let i = 0; i < data.length; i += 4) {
    const pixel = i / 4;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    const originalR = original[i] / 255;
    const originalG = original[i + 1] / 255;
    const originalB = original[i + 2] / 255;
    const originalLuma = lumaMap[pixel];
    const localDetail = originalLuma - blurredLuma[pixel];
    const originalHsl = rgbToHsl(originalR, originalG, originalB);

    const highlightMask = smoothstep(0.64, 0.94, originalLuma);
    const strongHighlightMask = smoothstep(0.78, 0.985, originalLuma);
    const shadowMask = 1 - smoothstep(0.08, 0.34, originalLuma);
    const midtoneMask = (1 - highlightMask * 0.76) * (1 - shadowMask * 0.42);
    const neutralWhiteMask = (1 - smoothstep(0.035, 0.18, originalHsl.s)) * smoothstep(0.48, 0.96, originalLuma);

    const exposureAmount = amount * midtoneMask * (1 - neutralWhiteMask * 0.32);
    const channelAmount = amount * (1 - strongHighlightMask * 0.82) * (1 - neutralWhiteMask * 0.62);

    let r = originalR * (1 + (base.exposure_factor - 1) * exposureAmount) * mix(1, base.red_multiplier, channelAmount);
    let g = originalG * (1 + (base.exposure_factor - 1) * exposureAmount) * mix(1, base.green_multiplier, channelAmount);
    let b = originalB * (1 + (base.exposure_factor - 1) * exposureAmount) * mix(1, base.blue_multiplier, channelAmount);

    const contrastAmount = amount * (1 - strongHighlightMask * 0.45) * (1 - neutralWhiteMask * 0.36);
    r = (r - 0.5) * mix(1, base.contrast_factor, contrastAmount) + 0.5;
    g = (g - 0.5) * mix(1, base.contrast_factor, contrastAmount) + 0.5;
    b = (b - 0.5) * mix(1, base.contrast_factor, contrastAmount) + 0.5;

    const gammaPower = 1 / Math.max(0.01, mix(1, base.gamma, amount * midtoneMask * (1 - neutralWhiteMask * 0.4)));
    r = Math.pow(clamp01(r), gammaPower);
    g = Math.pow(clamp01(g), gammaPower);
    b = Math.pow(clamp01(b), gammaPower);

    let hsl = rgbToHsl(r, g, b);
    const highSaturationMask = smoothstep(0.42, 0.9, originalHsl.s);
    const vibranceAmount = amount *
      (1 - neutralWhiteMask * 0.92) *
      (1 - strongHighlightMask * 0.62) *
      (1 - highSaturationMask * 0.38);

    hsl.s *= mix(1, base.saturation_factor, vibranceAmount);

    const redMask = hueRangeMask(hsl.h, 345, 18);
    const orangeMask = hueRangeMask(hsl.h, 14, 48);
    const yellowMask = hueRangeMask(hsl.h, 44, 82);
    const greenMask = hueRangeMask(hsl.h, 85, 165);
    const blueMask = hueRangeMask(hsl.h, 200, 255);

    hsl.s *= 1 + redMask * 0.07 * vibranceAmount;
    hsl.s *= 1 + orangeMask * 0.10 * vibranceAmount;
    hsl.s *= 1 + yellowMask * 0.08 * vibranceAmount;
    hsl.s *= 1 + greenMask * 0.04 * amount * (1 - neutralWhiteMask);
    hsl.s *= 1 + blueMask * 0.06 * amount;
    hsl.l -= blueMask * 0.018 * amount * (1 - highlightMask);
    hsl.l -= shadowMask * 0.012 * amount;
    hsl.h = normalizeHue(hsl.h - (orangeMask + yellowMask) * 0.7 * vibranceAmount);

    [r, g, b] = hslToRgb(hsl.h, hsl.s, hsl.l);

    const clarityAmount = (preset.clarity?.amount || 0) * amount *
      (1 - strongHighlightMask * 0.58) *
      (1 - neutralWhiteMask * 0.72) *
      (1 - shadowMask * 0.28);
    if (clarityAmount > 0.001) {
      const detailBoost = clampRange(localDetail * clarityAmount * 1.35, -0.045, 0.045);
      [r, g, b] = shiftRgbToLuma(r, g, b, clamp01(getLuma(r, g, b) + detailBoost));
    }

    const protectedR = protectHighlight(r, highlightProtection);
    const protectedG = protectHighlight(g, highlightProtection);
    const protectedB = protectHighlight(b, highlightProtection);
    const shoulderAmount = amount * smoothstep(0.66, 1, originalLuma);
    r = mix(r, protectedR, shoulderAmount);
    g = mix(g, protectedG, shoulderAmount);
    b = mix(b, protectedB, shoulderAmount);

    const targetLuma = getLuma(r, g, b);
    const maxHighlightRise = 0.035 + (1 - strongHighlightMask) * 0.085;
    const maxLuma = Math.min(0.965, originalLuma + maxHighlightRise * amount * (1 - neutralWhiteMask * 0.25));
    if (highlightMask > 0 && targetLuma > maxLuma) {
      [r, g, b] = shiftRgbToLuma(r, g, b, mix(targetLuma, maxLuma, highlightMask));
    }

    r = mix(originalR, r, amount);
    g = mix(originalG, g, amount);
    b = mix(originalB, b, amount);

    data[i] = toByte(r);
    data[i + 1] = toByte(g);
    data[i + 2] = toByte(b);

    sharpenWeightSum += amount * (1 - strongHighlightMask * 0.84) * (1 - neutralWhiteMask * 0.7) * (1 - shadowMask * 0.35);
  }

  const averageSharpenWeight = sharpenWeightSum / total;
  if (preset.sharpening?.amount && averageSharpenWeight > 0.001) {
    applySubtleSharpen(imageData, width, height, preset.sharpening.amount * averageSharpenWeight);
  }

  targetContext.putImageData(imageData, 0, 0);
}

function blurFloatMap(source, width, height, radius) {
  const r = Math.max(1, Math.round(radius || 1));
  const temp = new Float32Array(source.length);
  const output = new Float32Array(source.length);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      let count = 0;
      for (let dx = -r; dx <= r; dx += 1) {
        const xx = Math.min(width - 1, Math.max(0, x + dx));
        sum += source[y * width + xx];
        count += 1;
      }
      temp[y * width + x] = sum / count;
    }
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      let count = 0;
      for (let dy = -r; dy <= r; dy += 1) {
        const yy = Math.min(height - 1, Math.max(0, y + dy));
        sum += temp[yy * width + x];
        count += 1;
      }
      output[y * width + x] = sum / count;
    }
  }

  return output;
}

'@

  $script = Replace-JsFunction $script "applyFoodPreset" $applyFoodPreset.TrimEnd()

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

  $script = Remove-JsChangelog $script "v3.16"
  $script = Add-JsChangelog $script "v3.15" "\u4f18\u5316\u4e07\u80fd\u7f8e\u98df\u8c03\u8272\uff0c\u589e\u52a0\u5c40\u90e8\u6e05\u6670\u5ea6\u548c\u9c9c\u660e\u5ea6\u903b\u8f91\uff0c\u5148\u4fdd\u62a4\u767d\u8272\u9ad8\u5149\u7ec6\u8282\uff0c\u518d\u589e\u5f3a\u98df\u7269\u6a59\u9ec4\u548c\u80cc\u666f\u84dd\u8272\u5c42\u6b21\u3002"
  Write-Utf8 $scriptPath $script

  $index = Read-Utf8 $indexPath
  $index = [regex]::Replace($index, 'v3\.[0-9]+', 'v3.15')
  Write-Utf8 $indexPath $index

  $readme = Read-Utf8 $readmePath
  $readme = [regex]::Replace(
    $readme,
    '(?m)^' + [regex]::Escape((U '\u5f53\u524d\u7248\u672c\uff1a')) + '`v3\.[0-9]+`$',
    (U '\u5f53\u524d\u7248\u672c\uff1a`v3.15`'),
    1
  )
  $readme = Remove-ReadmeChangelog $readme "v3.16"
  $readme = Add-ReadmeChangelog $readme "v3.15" (U '\u4f18\u5316\u4e07\u80fd\u7f8e\u98df\u8c03\u8272\uff0c\u589e\u52a0\u5c40\u90e8\u6e05\u6670\u5ea6\u548c\u9c9c\u660e\u5ea6\u903b\u8f91\uff0c\u5148\u4fdd\u62a4\u767d\u8272\u9ad8\u5149\u7ec6\u8282\uff0c\u518d\u589e\u5f3a\u98df\u7269\u6a59\u9ec4\u548c\u80cc\u666f\u84dd\u8272\u5c42\u6b21\u3002')
  Write-Utf8 $readmePath $readme

  $sw = Read-Utf8 $swPath
  $sw = [regex]::Replace($sw, 'cream-photo-editor-v[0-9]+', 'cream-photo-editor-v35', 1)
  Write-Utf8 $swPath $sw

  $node = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
  if (Test-Path $node) {
    & $node --check $scriptPath | Out-Null
    if ($LASTEXITCODE -ne 0) {
      throw "node --check failed."
    }
  }

  $scriptCheck = Read-Utf8 $scriptPath
  $indexCheck = Read-Utf8 $indexPath
  $readmeCheck = Read-Utf8 $readmePath
  $swCheck = Read-Utf8 $swPath

  Assert-Contains $scriptCheck 'const APP_VERSION = "v3.15";' "script APP_VERSION v3.15"
  Assert-Contains $scriptCheck 'mode: "food"' "food preset mode"
  Assert-Contains $scriptCheck 'function applyFoodPreset' "food algorithm function"
  Assert-Contains $scriptCheck 'function blurFloatMap' "local clarity helper"
  Assert-Contains $scriptCheck 'function clampRange' "clampRange helper exists"
  Assert-Contains $scriptCheck '["v3.15",' "script CHANGELOG v3.15"
  Assert-Contains $indexCheck 'v3.15' "index v3.15"
  Assert-Contains $readmeCheck '`v3.15`' "README current version v3.15"
  Assert-Contains $readmeCheck '- `v3.15`' "README changelog v3.15"
  Assert-Contains $swCheck 'cream-photo-editor-v35' "service worker cache v35"
  if ([regex]::IsMatch($scriptCheck, '\bclamp\(')) {
    throw "Self-check failed: unknown clamp helper call remains."
  }
  if ($scriptCheck.Contains('["v3.16",') -or $readmeCheck.Contains('- `v3.16`')) {
    throw "Self-check failed: v3.16 changelog remains after restoring v3.15."
  }

  Write-Host "Patch applied: v3.15 food local clarity and highlight protection."
  Write-Host "Backup kept at: $backupDir"
}
catch {
  Write-Host "Patch failed. Restoring backup..." -ForegroundColor Yellow
  foreach ($path in $files) {
    $backup = Join-Path $backupDir (Split-Path $path -Leaf)
    if (Test-Path $backup) {
      Copy-Item -LiteralPath $backup -Destination $path -Force
    }
  }
  Write-Host "Backup restored: $backupDir" -ForegroundColor Yellow
  throw
}
