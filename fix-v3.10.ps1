$script = Get-Content -Raw -Path ".\script.js" -Encoding UTF8
$script = $script.Replace('const APP_VERSION = "v3.9";', 'const APP_VERSION = "v3.10";')

$script = [regex]::Replace($script, '(?s)  pink_brown_home_kawaii: \{.*?\n\},\r?\n\};', @'
  pink_brown_home_kawaii: {
    name: "粉棕居家玩偶感",
    mode: "config",
    base: {
      exposure_factor: 1.015,
      red_multiplier: 1.004,
      green_multiplier: 1.000,
      blue_multiplier: 0.994,
      black_lift: 0.003,
      contrast_factor: 1.018,
      saturation_factor: 1.01,
      gamma: 1.004,
    },
    tone_curve: [
      [0.00, 0.004],
      [0.25, 0.252],
      [0.50, 0.506],
      [0.75, 0.750],
      [0.90, 0.870],
      [1.00, 0.965],
    ],
    selective_colors: [
      { hue_range: [345, 15], saturation_multiplier: 1.006, lightness_shift: 0.000, hue_shift: 0 },
      { hue_range: [15, 42], saturation_multiplier: 1.012, lightness_shift: 0.000, hue_shift: -1 },
      { hue_range: [42, 78], saturation_multiplier: 1.006, lightness_shift: 0.000, hue_shift: -1 },
      { hue_range: [78, 165], saturation_multiplier: 0.94, lightness_shift: 0.000, hue_shift: -3 },
      { hue_range: [165, 205], saturation_multiplier: 0.94, lightness_shift: 0.000, hue_shift: -2 },
      { hue_range: [205, 252], saturation_multiplier: 0.98, lightness_shift: 0.000, hue_shift: 1 },
      { hue_range: [252, 300], saturation_multiplier: 0.98, lightness_shift: 0.000, hue_shift: 1 },
      { hue_range: [300, 345], saturation_multiplier: 1.012, lightness_shift: 0.000, hue_shift: 1 },
    ],
    highlight_protection: {
      enabled: true,
      start: 0.84,
      compression: 0.72,
    },
    shadow_handling: {
      lift: 0.004,
      softness: 0.24,
    },
  },
};
'@)

$script = [regex]::Replace($script, '(?s)function applyConfigPreset\(source, target, preset, strengthAmount = 1\) \{.*?\n\}\r?\n\r?\nfunction analyzeImageStats', @'
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

  for (let i = 0; i < data.length; i += 4) {
    const pixel = i / 4;
    const x = pixel % source.width;
    const y = Math.floor(pixel / source.width);
    const originalR = data[i] / 255;
    const originalG = data[i + 1] / 255;
    const originalB = data[i + 2] / 255;

    let r = originalR * exposureFactor * base.red_multiplier;
    let g = originalG * exposureFactor * base.green_multiplier;
    let b = originalB * exposureFactor * base.blue_multiplier;

    let hsl = rgbToHsl(r, g, b);

    for (const color of preset.selective_colors || []) {
      const mask = hueRangeMask(hsl.h, color.hue_range[0], color.hue_range[1]);
      if (mask <= 0) continue;
      hsl.s *= mix(1, color.saturation_multiplier, mask);
      hsl.l = clamp01(hsl.l + color.lightness_shift * mask);
      hsl.h = normalizeHue(hsl.h + color.hue_shift * mask);
    }

    hsl.s *= base.saturation_factor;
    [r, g, b] = hslToRgb(hsl.h, hsl.s, hsl.l);

    const blackLift = base.black_lift + (preset.shadow_handling?.lift || 0) + blackLiftBoost;
    r = r * (1 - blackLift) + blackLift;
    g = g * (1 - blackLift) + blackLift;
    b = b * (1 - blackLift) + blackLift;

    r = applyToneCurve(Math.pow(clamp01((r - 0.5) * base.contrast_factor + 0.5), 1 / Math.max(0.01, base.gamma)), preset.tone_curve);
    g = applyToneCurve(Math.pow(clamp01((g - 0.5) * base.contrast_factor + 0.5), 1 / Math.max(0.01, base.gamma)), preset.tone_curve);
    b = applyToneCurve(Math.pow(clamp01((b - 0.5) * base.contrast_factor + 0.5), 1 / Math.max(0.01, base.gamma)), preset.tone_curve);

    if (highlightProtection?.enabled) {
      r = protectHighlight(r, highlightProtection);
      g = protectHighlight(g, highlightProtection);
      b = protectHighlight(b, highlightProtection);
    }

    data[i] = toByte(mix(originalR, r, amount) + (deterministicDither(x, y) / 255) * amount);
    data[i + 1] = toByte(mix(originalG, g, amount) + (deterministicDither(x, y) / 255) * amount);
    data[i + 2] = toByte(mix(originalB, b, amount) + (deterministicDither(x, y) / 255) * amount);
  }

  targetContext.putImageData(imageData, 0, 0);
}

function analyzeImageStats
'@)

$script = [regex]::Replace($script, '(?s)\r?\nfunction getNeutralProtectionMask\(.*?\nfunction applyToneCurve', "`r`nfunction applyToneCurve")

$script = $script.Replace(
  '["v3.9", "修复粉棕居家玩偶感在白色高光区域出现发红、涂抹和色块的问题。"],',
  '["v3.9", "修复粉棕居家玩偶感在白色高光区域出现发红、涂抹和色块的问题。"],' + "`r`n" + '  ["v3.10", "将粉棕居家玩偶感改为稳定连续算法，减少白色区域发红、涂抹和色块。"],'
)

Set-Content -Path ".\script.js" -Value $script -Encoding UTF8

$sw = Get-Content -Raw -Path ".\sw.js" -Encoding UTF8
$sw = $sw.Replace('cream-photo-editor-v29', 'cream-photo-editor-v30')
Set-Content -Path ".\sw.js" -Value $sw -Encoding UTF8

Write-Host "OK"