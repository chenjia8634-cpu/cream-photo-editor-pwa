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

$backupDir = Join-Path $root (".patch-backup-v3.16-" + (Get-Date -Format "yyyyMMdd-HHmmss"))
New-Item -ItemType Directory -Path $backupDir | Out-Null
foreach ($path in $files) {
  Copy-Item -LiteralPath $path -Destination (Join-Path $backupDir (Split-Path $path -Leaf))
}

try {
  $script = Read-Utf8 $scriptPath
  $script = [regex]::Replace($script, 'const APP_VERSION = "v3\.[0-9]+";', 'const APP_VERSION = "v3.16";', 1)

  $foodPreset = @'
  universal_food: {
    name: "\u4e07\u80fd\u7f8e\u98df\u8c03\u8272",
    mode: "food",
    base: {
      exposure_factor: 1.060,
      red_multiplier: 1.004,
      green_multiplier: 1.000,
      blue_multiplier: 0.994,
      contrast_factor: 1.058,
      saturation_factor: 1.105,
      gamma: 0.982,
    },
    highlight_protection: {
      enabled: true,
      start: 0.62,
      compression: 0.50,
    },
    clarity: {
      radius: 2,
      amount: 0.17,
    },
    sharpening: {
      amount: 0.035,
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
    const originalR = original[i] / 255;
    const originalG = original[i + 1] / 255;
    const originalB = original[i + 2] / 255;
    const originalLuma = lumaMap[pixel];
    const localDetail = originalLuma - blurredLuma[pixel];
    const originalHsl = rgbToHsl(originalR, originalG, originalB);

    const highlightMask = smoothstep(0.58, 0.93, originalLuma);
    const strongHighlightMask = smoothstep(0.72, 0.985, originalLuma);
    const shadowMask = 1 - smoothstep(0.08, 0.34, originalLuma);
    const midtoneMask = (1 - highlightMask * 0.70) * (1 - shadowMask * 0.38);
    const neutralWhiteMask = (1 - smoothstep(0.03, 0.17, originalHsl.s)) * smoothstep(0.42, 0.96, originalLuma);
    const warmWhiteMask = neutralWhiteMask * hueRangeMask(originalHsl.h, 28, 70);

    const exposureAmount = amount * midtoneMask * (1 - neutralWhiteMask * 0.48);
    const channelAmount = amount * (1 - strongHighlightMask * 0.86) * (1 - neutralWhiteMask * 0.70);

    let r = originalR * (1 + (base.exposure_factor - 1) * exposureAmount) * mix(1, base.red_multiplier, channelAmount);
    let g = originalG * (1 + (base.exposure_factor - 1) * exposureAmount) * mix(1, base.green_multiplier, channelAmount);
    let b = originalB * (1 + (base.exposure_factor - 1) * exposureAmount) * mix(1, base.blue_multiplier, channelAmount);

    const contrastAmount = amount * (1 - strongHighlightMask * 0.50) * (1 - neutralWhiteMask * 0.42);
    r = (r - 0.5) * mix(1, base.contrast_factor, contrastAmount) + 0.5;
    g = (g - 0.5) * mix(1, base.contrast_factor, contrastAmount) + 0.5;
    b = (b - 0.5) * mix(1, base.contrast_factor, contrastAmount) + 0.5;

    const gammaPower = 1 / Math.max(0.01, mix(1, base.gamma, amount * midtoneMask * (1 - neutralWhiteMask * 0.52)));
    r = Math.pow(clamp01(r), gammaPower);
    g = Math.pow(clamp01(g), gammaPower);
    b = Math.pow(clamp01(b), gammaPower);

    let hsl = rgbToHsl(r, g, b);
    const highSaturationMask = smoothstep(0.44, 0.9, originalHsl.s);
    const vibranceAmount = amount *
      (1 - neutralWhiteMask * 0.95) *
      (1 - strongHighlightMask * 0.70) *
      (1 - highSaturationMask * 0.46);

    hsl.s *= mix(1, base.saturation_factor, vibranceAmount);

    const redMask = hueRangeMask(hsl.h, 345, 18);
    const orangeMask = hueRangeMask(hsl.h, 14, 48);
    const yellowMask = hueRangeMask(hsl.h, 44, 82);
    const greenMask = hueRangeMask(hsl.h, 85, 165);
    const blueMask = hueRangeMask(hsl.h, 200, 255);
    const foodYellowMask = Math.max(orangeMask * 0.78, yellowMask);

    hsl.s *= 1 + redMask * 0.055 * vibranceAmount;
    hsl.s *= 1 + orangeMask * 0.070 * vibranceAmount;
    hsl.s *= 1 + yellowMask * 0.045 * vibranceAmount;
    hsl.s *= 1 + greenMask * 0.030 * amount * (1 - neutralWhiteMask);
    hsl.s *= 1 + blueMask * 0.055 * amount;
    hsl.l -= foodYellowMask * 0.016 * amount * (1 - shadowMask * 0.45);
    hsl.l -= blueMask * 0.016 * amount * (1 - highlightMask);
    hsl.l -= shadowMask * 0.010 * amount;
    hsl.l -= neutralWhiteMask * highlightMask * 0.018 * amount;
    hsl.h = normalizeHue(hsl.h - (orangeMask + yellowMask) * 0.45 * vibranceAmount);

    [r, g, b] = hslToRgb(hsl.h, hsl.s, hsl.l);

    const clarityAmount = (preset.clarity?.amount || 0) * amount *
      (1 - strongHighlightMask * 0.72) *
      (1 - neutralWhiteMask * 0.80) *
      (1 - shadowMask * 0.30);
    if (clarityAmount > 0.001) {
      const yellowDetailBoost = foodYellowMask * clampRange(-localDetail, 0, 0.08) * amount * 0.34;
      const detailBoost = clampRange(localDetail * clarityAmount * 1.05 - yellowDetailBoost, -0.050, 0.030);
      [r, g, b] = shiftRgbToLuma(r, g, b, clamp01(getLuma(r, g, b) + detailBoost));
    }

    if (warmWhiteMask > 0) {
      const creamyLuma = getLuma(r, g, b) - warmWhiteMask * highlightMask * 0.012 * amount;
      [r, g, b] = shiftRgbToLuma(r, g, b, creamyLuma);
      r = mix(r, r * 1.006, warmWhiteMask * amount);
      b = mix(b, b * 0.992, warmWhiteMask * amount);
    }

    const protectedR = protectHighlight(r, highlightProtection);
    const protectedG = protectHighlight(g, highlightProtection);
    const protectedB = protectHighlight(b, highlightProtection);
    const shoulderAmount = amount * smoothstep(0.60, 1, originalLuma);
    r = mix(r, protectedR, shoulderAmount);
    g = mix(g, protectedG, shoulderAmount);
    b = mix(b, protectedB, shoulderAmount);

    const targetLuma = getLuma(r, g, b);
    const maxHighlightRise = 0.018 + (1 - strongHighlightMask) * 0.070;
    const maxLuma = Math.min(0.940, originalLuma + maxHighlightRise * amount * (1 - neutralWhiteMask * 0.38));
    if (highlightMask > 0 && targetLuma > maxLuma) {
      [r, g, b] = shiftRgbToLuma(r, g, b, mix(targetLuma, maxLuma, highlightMask));
    }

    r = mix(originalR, r, amount);
    g = mix(originalG, g, amount);
    b = mix(originalB, b, amount);

    data[i] = toByte(r);
    data[i + 1] = toByte(g);
    data[i + 2] = toByte(b);

    sharpenWeightSum += amount * (1 - strongHighlightMask * 0.90) * (1 - neutralWhiteMask * 0.84) * (1 - shadowMask * 0.40);
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

  if (-not $script.Contains("function blurFloatMap")) {
    throw "Missing blurFloatMap after food function replacement."
  }

  $script = Add-JsChangelog $script "v3.16" "\u7ee7\u7eed\u4f18\u5316\u4e07\u80fd\u7f8e\u98df\u8c03\u8272\uff0c\u6536\u4f4e\u767d\u8272\u9ad8\u5149\u4eae\u5ea6\uff0c\u51cf\u5c11\u9ec4\u8272\u8367\u5149\u611f\uff0c\u5f3a\u5316\u9ec4\u533a\u6697\u7eb9\u5c42\u6b21\uff0c\u8ba9\u5976\u6cb9\u548c\u98df\u7269\u7eb9\u7406\u66f4\u63a5\u8fd1\u624b\u52a8\u8c03\u8272\u6548\u679c\u3002"
  Write-Utf8 $scriptPath $script

  $index = Read-Utf8 $indexPath
  $index = [regex]::Replace($index, 'v3\.[0-9]+', 'v3.16')
  Write-Utf8 $indexPath $index

  $readme = Read-Utf8 $readmePath
  $readme = [regex]::Replace(
    $readme,
    '(?m)^' + [regex]::Escape((U '\u5f53\u524d\u7248\u672c\uff1a')) + '`v3\.[0-9]+`$',
    (U '\u5f53\u524d\u7248\u672c\uff1a`v3.16`'),
    1
  )
  $readme = Add-ReadmeChangelog $readme "v3.16" (U '\u7ee7\u7eed\u4f18\u5316\u4e07\u80fd\u7f8e\u98df\u8c03\u8272\uff0c\u6536\u4f4e\u767d\u8272\u9ad8\u5149\u4eae\u5ea6\uff0c\u51cf\u5c11\u9ec4\u8272\u8367\u5149\u611f\uff0c\u5f3a\u5316\u9ec4\u533a\u6697\u7eb9\u5c42\u6b21\uff0c\u8ba9\u5976\u6cb9\u548c\u98df\u7269\u7eb9\u7406\u66f4\u63a5\u8fd1\u624b\u52a8\u8c03\u8272\u6548\u679c\u3002')
  Write-Utf8 $readmePath $readme

  $sw = Read-Utf8 $swPath
  $sw = [regex]::Replace($sw, 'cream-photo-editor-v[0-9]+', 'cream-photo-editor-v36', 1)
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

  Assert-Contains $scriptCheck 'const APP_VERSION = "v3.16";' "script APP_VERSION v3.16"
  Assert-Contains $scriptCheck 'mode: "food"' "food preset mode"
  Assert-Contains $scriptCheck 'function applyFoodPreset' "food algorithm function"
  Assert-Contains $scriptCheck 'function blurFloatMap' "local clarity helper"
  Assert-Contains $scriptCheck 'function clampRange' "clampRange helper exists"
  Assert-Contains $scriptCheck '["v3.16",' "script CHANGELOG v3.16"
  Assert-Contains $indexCheck 'v3.16' "index v3.16"
  Assert-Contains $readmeCheck '`v3.16`' "README current version v3.16"
  Assert-Contains $readmeCheck '- `v3.16`' "README changelog v3.16"
  Assert-Contains $swCheck 'cream-photo-editor-v36' "service worker cache v36"
  if ([regex]::IsMatch($scriptCheck, '\bclamp\(')) {
    throw "Self-check failed: unknown clamp helper call remains."
  }

  Write-Host "Patch applied: v3.16 food highlight texture tuning."
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
