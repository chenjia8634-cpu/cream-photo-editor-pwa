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
$script = [regex]::Replace($script, 'const APP_VERSION = "v3\.(11|12)";', 'const APP_VERSION = "v3.13";', 1)

$newFoodPreset = @'
  universal_food: {
    name: "\u4e07\u80fd\u7f8e\u98df\u8c03\u8272",
    mode: "config",
    base: {
      exposure_factor: 1.10,
      red_multiplier: 1.010,
      green_multiplier: 1.002,
      blue_multiplier: 0.990,
      black_lift: 0.000,
      contrast_factor: 1.045,
      saturation_factor: 1.09,
      gamma: 0.975,
    },
    tone_curve: [
      [0.00, 0.000],
      [0.18, 0.178],
      [0.50, 0.522],
      [0.72, 0.718],
      [0.88, 0.842],
      [1.00, 0.948],
    ],
    selective_colors: [
      { hue_range: [345, 15], saturation_multiplier: 1.06, lightness_shift: 0.000, hue_shift: 0 },
      { hue_range: [15, 45], saturation_multiplier: 1.09, lightness_shift: 0.000, hue_shift: -1 },
      { hue_range: [45, 85], saturation_multiplier: 1.07, lightness_shift: 0.000, hue_shift: -1 },
      { hue_range: [85, 165], saturation_multiplier: 1.00, lightness_shift: 0.000, hue_shift: -2 },
      { hue_range: [165, 210], saturation_multiplier: 0.98, lightness_shift: 0.000, hue_shift: -1 },
      { hue_range: [210, 255], saturation_multiplier: 0.96, lightness_shift: 0.000, hue_shift: 1 },
      { hue_range: [255, 305], saturation_multiplier: 0.98, lightness_shift: 0.000, hue_shift: 0 },
      { hue_range: [305, 345], saturation_multiplier: 1.03, lightness_shift: 0.000, hue_shift: 0 },
    ],
    highlight_protection: {
      enabled: true,
      start: 0.74,
      compression: 0.58,
    },
    shadow_handling: {
      lift: 0.000,
      softness: 0.18,
    },
    tonal_protection: {
      enabled: true,
      shadowStart: 0.28,
      highlightStart: 0.68,
      highlightEnd: 0.96,
      minHighlightExposure: 0.08,
      minHighlightSaturation: 0.28,
      minHighlightSharpen: 0.20,
      shadowExposure: 0.10,
      shadowSaturation: 0.55,
    },
    sharpening: {
      amount: 0.16,
    },
  },
'@

$script = [regex]::Replace(
  $script,
  '(?s)  universal_food: \{.*?\n  \},\r?\n\};',
  $newFoodPreset + "};",
  1
)

$newApplyConfigPreset = @'
function applyConfigPreset(source, target, preset, strengthAmount = 1) {
  const sourceContext = source.getContext("2d", { willReadFrequently: true });
  const targetContext = target.getContext("2d", { willReadFrequently: true });
  const imageData = sourceContext.getImageData(0, 0, source.width, source.height);
  const data = imageData.data;
  const amount = clamp01(strengthAmount);
  const base = preset.base;
  const stats = preset.adaptive ? analyzeImageStats(data) : null;
  const adaptive = preset.adaptive ? createAdaptivePresetSettings(preset, stats) : null;
  const exposureFactor = adaptive?.exposureFactor || base.exposure_factor;
  const blackLiftBoost = adaptive?.blackLiftBoost || 0;
  const highlightProtection = adaptive?.highlightProtection || preset.highlight_protection;
  const tonalProtection = preset.tonal_protection;
  const sharpenAmount = preset.sharpening?.amount || 0;
  let sharpenWeightSum = 0;

  for (let i = 0; i < data.length; i += 4) {
    const pixel = i / 4;
    const x = pixel % source.width;
    const y = Math.floor(pixel / source.width);
    const originalR = data[i] / 255;
    const originalG = data[i + 1] / 255;
    const originalB = data[i + 2] / 255;
    const originalLuma = getLuma(originalR, originalG, originalB);
    const highlightMask = tonalProtection?.enabled
      ? smoothstep(tonalProtection.highlightStart, tonalProtection.highlightEnd, originalLuma)
      : 0;
    const shadowMask = tonalProtection?.enabled
      ? 1 - smoothstep(0.04, tonalProtection.shadowStart, originalLuma)
      : 0;
    const exposureAmount = amount * (1 - highlightMask * (1 - tonalProtection?.minHighlightExposure || 0));
    const colorAmount = amount *
      (1 - highlightMask * (1 - (tonalProtection?.minHighlightSaturation || 1))) *
      (1 - shadowMask * (1 - (tonalProtection?.shadowSaturation || 1)));
    const localExposureFactor = mix(1, exposureFactor, exposureAmount);

    let r = originalR * localExposureFactor * mix(1, base.red_multiplier, colorAmount);
    let g = originalG * localExposureFactor * mix(1, base.green_multiplier, colorAmount);
    let b = originalB * localExposureFactor * mix(1, base.blue_multiplier, colorAmount);

    let hsl = rgbToHsl(r, g, b);

    for (const color of preset.selective_colors || []) {
      const mask = hueRangeMask(hsl.h, color.hue_range[0], color.hue_range[1]) * colorAmount;
      if (mask <= 0) continue;
      hsl.s *= mix(1, color.saturation_multiplier, mask);
      hsl.l = clamp01(hsl.l + color.lightness_shift * mask);
      hsl.h = normalizeHue(hsl.h + color.hue_shift * mask);
    }

    hsl.s *= mix(1, base.saturation_factor, colorAmount);
    [r, g, b] = hslToRgb(hsl.h, hsl.s, hsl.l);

    const shadowLift = (preset.shadow_handling?.lift || 0) * (1 - shadowMask);
    const blackLift = base.black_lift + shadowLift + blackLiftBoost;
    r = r * (1 - blackLift) + blackLift;
    g = g * (1 - blackLift) + blackLift;
    b = b * (1 - blackLift) + blackLift;

    const contrastAmount = amount * (1 - highlightMask * 0.35);
    r = (r - 0.5) * mix(1, base.contrast_factor, contrastAmount) + 0.5;
    g = (g - 0.5) * mix(1, base.contrast_factor, contrastAmount) + 0.5;
    b = (b - 0.5) * mix(1, base.contrast_factor, contrastAmount) + 0.5;

    const gammaPower = 1 / Math.max(0.01, mix(1, base.gamma, amount * (1 - highlightMask * 0.45)));
    r = Math.pow(clamp01(r), gammaPower);
    g = Math.pow(clamp01(g), gammaPower);
    b = Math.pow(clamp01(b), gammaPower);

    r = mix(r, applyToneCurve(r, preset.tone_curve), amount * (1 - highlightMask * 0.55));
    g = mix(g, applyToneCurve(g, preset.tone_curve), amount * (1 - highlightMask * 0.55));
    b = mix(b, applyToneCurve(b, preset.tone_curve), amount * (1 - highlightMask * 0.55));

    if (highlightProtection?.enabled) {
      r = protectHighlight(r, highlightProtection);
      g = protectHighlight(g, highlightProtection);
      b = protectHighlight(b, highlightProtection);
    }

    r = mix(originalR, r, amount);
    g = mix(originalG, g, amount);
    b = mix(originalB, b, amount);

    const dither = (deterministicDither(x, y) / 255) * amount * (1 - highlightMask * 0.75);
    data[i] = toByte(r + dither);
    data[i + 1] = toByte(g + dither);
    data[i + 2] = toByte(b + dither);

    if (sharpenAmount) {
      const sharpenWeight = amount *
        (1 - highlightMask * (1 - (tonalProtection?.minHighlightSharpen || 1))) *
        (1 - shadowMask * 0.45);
      sharpenWeightSum += sharpenWeight;
    }
  }

  if (sharpenAmount && sharpenWeightSum > 0) {
    const averageSharpenWeight = sharpenWeightSum / (data.length / 4);
    applySubtleSharpen(imageData, source.width, source.height, sharpenAmount * averageSharpenWeight);
  }

  targetContext.putImageData(imageData, 0, 0);
}
'@

$script = [regex]::Replace(
  $script,
  '(?s)function applyConfigPreset\(source, target, preset, strengthAmount = 1\) \{.*?\n\}\r?\n\r?\nfunction applySubtleSharpen',
  $newApplyConfigPreset + "`r`nfunction applySubtleSharpen",
  1
)

$script = Add-JsChangelog $script "v3.12" "\u4f18\u5316\u4e07\u80fd\u7f8e\u98df\u8c03\u8272\uff0c\u964d\u4f4e\u9ad8\u5149\u63d0\u4eae\u5e76\u4fdd\u7559\u767d\u8272\u7ec6\u8282\uff0c\u51cf\u5c11\u6697\u90e8\u63d0\u4eae\u4ee5\u589e\u5f3a\u753b\u9762\u5c42\u6b21\u3002"
$script = Add-JsChangelog $script "v3.13" "\u91cd\u505a\u4e07\u80fd\u7f8e\u98df\u8c03\u8272\u7684\u9ad8\u5149\u4fdd\u62a4\u987a\u5e8f\uff0c\u66dd\u5149\u548c\u9971\u548c\u4e3b\u8981\u4f5c\u7528\u4e8e\u4e2d\u95f4\u8c03\uff0c\u6697\u90e8\u4e0d\u989d\u5916\u63d0\u4eae\uff0c\u51cf\u5c11\u53c8\u6697\u53c8\u4e22\u9ad8\u5149\u7ec6\u8282\u7684\u95ee\u9898\u3002"
Write-Utf8 $scriptPath $script

$index = Read-Utf8 $indexPath
$index = [regex]::Replace($index, 'v3\.(11|12)', 'v3.13')
Write-Utf8 $indexPath $index

$readme = Read-Utf8 $readmePath
$readme = [regex]::Replace(
  $readme,
  '(?m)^' + [regex]::Escape((U '\u5f53\u524d\u7248\u672c\uff1a')) + '`v3\.(11|12)`$',
  (U '\u5f53\u524d\u7248\u672c\uff1a`v3.13`'),
  1
)
$readme = Add-ReadmeChangelog $readme "v3.12" (U '\u4f18\u5316\u4e07\u80fd\u7f8e\u98df\u8c03\u8272\uff0c\u964d\u4f4e\u9ad8\u5149\u63d0\u4eae\u5e76\u4fdd\u7559\u767d\u8272\u7ec6\u8282\uff0c\u51cf\u5c11\u6697\u90e8\u63d0\u4eae\u4ee5\u589e\u5f3a\u753b\u9762\u5c42\u6b21\u3002')
$readme = Add-ReadmeChangelog $readme "v3.13" (U '\u91cd\u505a\u4e07\u80fd\u7f8e\u98df\u8c03\u8272\u7684\u9ad8\u5149\u4fdd\u62a4\u987a\u5e8f\uff0c\u66dd\u5149\u548c\u9971\u548c\u4e3b\u8981\u4f5c\u7528\u4e8e\u4e2d\u95f4\u8c03\uff0c\u6697\u90e8\u4e0d\u989d\u5916\u63d0\u4eae\uff0c\u51cf\u5c11\u53c8\u6697\u53c8\u4e22\u9ad8\u5149\u7ec6\u8282\u7684\u95ee\u9898\u3002')
Write-Utf8 $readmePath $readme

$sw = Read-Utf8 $swPath
$sw = [regex]::Replace($sw, 'cream-photo-editor-v3[1-2]', 'cream-photo-editor-v33', 1)
Write-Utf8 $swPath $sw

$scriptCheck = Read-Utf8 $scriptPath
$indexCheck = Read-Utf8 $indexPath
$readmeCheck = Read-Utf8 $readmePath
$swCheck = Read-Utf8 $swPath

Assert-Contains $scriptCheck 'const APP_VERSION = "v3.13";' "script APP_VERSION v3.13"
Assert-Contains $scriptCheck '["v3.12",' "script CHANGELOG v3.12"
Assert-Contains $scriptCheck '["v3.13",' "script CHANGELOG v3.13"
Assert-Contains $scriptCheck 'tonal_protection' "food tonal protection"
Assert-Contains $indexCheck 'v3.13' "index v3.13"
Assert-Contains $readmeCheck '`v3.13`' "README current version v3.13"
Assert-Contains $readmeCheck '- `v3.12`' "README changelog v3.12"
Assert-Contains $readmeCheck '- `v3.13`' "README changelog v3.13"
Assert-Contains $swCheck 'cream-photo-editor-v33' "service worker cache v33"

Write-Host "Patch applied: v3.13 food tonal protection."
Write-Host "Self-check passed: script, HTML, README, and service worker were updated."
