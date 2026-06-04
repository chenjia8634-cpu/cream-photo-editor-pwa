const input = document.querySelector("#photoInput");
const sourceCanvas = document.querySelector("#sourceCanvas");
const resultCanvas = document.querySelector("#resultCanvas");
const sourcePreview = document.querySelector("#sourcePreview");
const resultPreview = document.querySelector("#resultPreview");
const sourceCard = sourceCanvas.closest(".preview-card");
const resultCard = resultCanvas.closest(".preview-card");
const statusText = document.querySelector("#statusText");
const saveButton = document.querySelector("#saveButton");
const downloadLink = document.querySelector("#downloadLink");

const MAX_EXPORT_EDGE = 6000;
const MAX_PREVIEW_EDGE = 1400;
const JPEG_QUALITY = 0.98;

let latestBlobUrl = "";
let latestFileName = "cream-tone-photo.jpg";
let sourcePreviewUrl = "";
let resultPreviewUrl = "";

input.addEventListener("change", async (event) => {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  resetOutput();
  setStatus("正在读取照片...");

  try {
    if (!isSupportedImage(file)) {
      throw new Error("请选择 JPG、JPEG、PNG、HEIC 或 HEIF 图片。");
    }

    const imageFile = await normalizeImageFile(file);
    const bitmap = await decodeImage(imageFile);
    const size = fitSize(bitmap.width, bitmap.height, MAX_EXPORT_EDGE);

    drawSource(bitmap, size.width, size.height);
    await updatePreviewImage(sourceCanvas, sourcePreview, "source");
    setStatus("正在本地调色...");

    applyCreamPreset(sourceCanvas, resultCanvas);
    resultCard.classList.add("has-image");
    await updatePreviewImage(resultCanvas, resultPreview, "result");

    const outputSize = await prepareDownload(file.name);
    const inputText = `${bitmap.width}×${bitmap.height} / ${formatBytes(file.size)}`;
    const outputText = `${size.width}×${size.height} / ${formatBytes(outputSize)}`;
    const compressedHint = file.size < 500 * 1024
      ? " 原图文件偏小，可能已经被微信或聊天软件压缩，建议从相册选择原图。"
      : "";
    setStatus(`调色完成。原图 ${inputText}，输出 ${outputText}。${compressedHint}照片只在浏览器本地处理。`);
  } catch (error) {
    console.error(error);
    resetOutput();
    setStatus(error.message || "照片处理失败，请换一张 JPG 或 PNG 再试。");
  }
});

saveButton.addEventListener("click", async () => {
  if (!latestBlobUrl) return;

  const canShareFile = Boolean(navigator.canShare && window.File);
  const blob = await fetch(latestBlobUrl).then((response) => response.blob());
  const file = new File([blob], latestFileName, { type: "image/jpeg" });

  if (canShareFile && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: "奶油感产品图",
      });
      return;
    } catch (error) {
      if (error && error.name === "AbortError") return;
    }
  }

  downloadLink.href = latestBlobUrl;
  downloadLink.click();
});

function isSupportedImage(file) {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();

  if (type === "image/jpeg" || type === "image/png") return true;
  if (type === "image/heic" || type === "image/heif") return true;
  if (/\.(jpe?g|png|heic|heif)$/.test(name)) return true;
  return false;
}

async function normalizeImageFile(file) {
  if (!isHeicFile(file)) return file;

  setStatus("正在本地转换 HEIC/HEIF...");

  try {
    await waitForHeicConverter();
    const converted = await window.heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.98,
    });
    const blob = Array.isArray(converted) ? converted[0] : converted;
    const name = file.name.replace(/\.(heic|heif)$/i, ".jpg");

    return new File([blob], name, {
      type: "image/jpeg",
      lastModified: file.lastModified || Date.now(),
    });
  } catch (error) {
    console.error(error);
    throw new Error("HEIC/HEIF 本地转码失败。请刷新页面重试，或先在 iPhone 相册中导出为 JPEG。");
  }
}

function isHeicFile(file) {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  return type === "image/heic" || type === "image/heif" || /\.(heic|heif)$/.test(name);
}

function waitForHeicConverter() {
  if (window.heic2any) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const start = Date.now();
    const timer = window.setInterval(() => {
      if (window.heic2any) {
        window.clearInterval(timer);
        resolve();
      } else if (Date.now() - start > 10000) {
        window.clearInterval(timer);
        reject(new Error("HEIC converter did not load."));
      }
    }, 100);
  });
}

async function decodeImage(file) {
  if ("createImageBitmap" in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch (error) {
      console.warn("createImageBitmap fallback:", error);
    }
  }

  return await decodeImageElement(file);
}

function decodeImageElement(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("图片读取失败，请确认文件是 JPG 或 PNG。"));
    };

    image.src = url;
  });
}

function fitSize(width, height, maxEdge) {
  const edge = Math.max(width, height);
  if (edge <= maxEdge) return { width, height };

  const scale = maxEdge / edge;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

function drawSource(image, width, height) {
  const context = sourceCanvas.getContext("2d", { willReadFrequently: true });
  sourceCanvas.width = width;
  sourceCanvas.height = height;
  resultCanvas.width = width;
  resultCanvas.height = height;

  context.clearRect(0, 0, width, height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, width, height);

  sourceCard.classList.add("has-image");
}

function applyCreamPreset(source, target) {
  const sourceContext = source.getContext("2d", { willReadFrequently: true });
  const targetContext = target.getContext("2d", { willReadFrequently: true });
  const imageData = sourceContext.getImageData(0, 0, source.width, source.height);
  const data = imageData.data;

  const exposureFactor = 1.055;
  const blackLift = 0.018;
  const contrastFactor = 0.94;
  const saturationFactor = 0.94;

  for (let i = 0; i < data.length; i += 4) {
    const pixel = i / 4;
    const x = pixel % source.width;
    const y = Math.floor(pixel / source.width);
    const originalR = data[i] / 255;
    const originalG = data[i + 1] / 255;
    const originalB = data[i + 2] / 255;

    let r = originalR;
    let g = originalG;
    let b = originalB;

    r *= exposureFactor * 1.025;
    g *= exposureFactor * 0.998;
    b *= exposureFactor * 0.985;

    r = r * (1 - blackLift) + blackLift;
    g = g * (1 - blackLift) + blackLift;
    b = b * (1 - blackLift) + blackLift;

    r = (r - 0.5) * contrastFactor + 0.5;
    g = (g - 0.5) * contrastFactor + 0.5;
    b = (b - 0.5) * contrastFactor + 0.5;

    r = toneCurve(r);
    g = toneCurve(g);
    b = toneCurve(b);

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const colorfulness = max - min;
    const neutralProtection = 1 - smoothstep(0.018, 0.11, colorfulness);
    const gray = r * 0.299 + g * 0.587 + b * 0.114;
    const localSaturation = mix(saturationFactor, 0.985, neutralProtection);

    r = gray + (r - gray) * localSaturation;
    g = gray + (g - gray) * localSaturation;
    b = gray + (b - gray) * localSaturation;

    const hsl = rgbToHsl(r, g, b);

    if (hsl.s > 0.1) {
      const yellowMask = hueMask(hsl.h, 35, 78);
      const greenMask = hueMask(hsl.h, 82, 168);
      const blueMask = hueMask(hsl.h, 195, 252);

      hsl.s *= 1 - yellowMask * 0.1;
      hsl.s *= 1 - greenMask * 0.12;
      hsl.s *= 1 - blueMask * 0.06;
      hsl.l = clamp01(hsl.l + yellowMask * 0.008);
    }

    [r, g, b] = hslToRgb(hsl.h, hsl.s, hsl.l);

    const strength = mix(0.82, 0.52, neutralProtection);
    r = mix(originalR, r, strength);
    g = mix(originalG, g, strength);
    b = mix(originalB, b, strength);

    const dither = deterministicDither(x, y) / 255;
    data[i] = toByte(r + dither);
    data[i + 1] = toByte(g + dither);
    data[i + 2] = toByte(b + dither);
  }

  targetContext.putImageData(imageData, 0, 0);
}

function toneCurve(value) {
  let v = clamp01(value);
  const midMask = 1 - Math.abs(v * 2 - 1);
  v += Math.max(0, midMask) * 0.025;

  const highlightStart = 0.86;
  if (v > highlightStart) {
    v = highlightStart + (v - highlightStart) * 0.72;
  }

  return clamp01(v);
}

function hueMask(hue, start, end) {
  return smoothstep(start, start + 10, hue) * (1 - smoothstep(end - 10, end, hue));
}

function mix(a, b, t) {
  return a + (b - a) * clamp01(t);
}

function smoothstep(edge0, edge1, value) {
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function deterministicDither(x, y) {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return (n - Math.floor(n) - 0.5) * 0.28;
}

function rgbToHsl(r, g, b) {
  r = clamp01(r);
  g = clamp01(g);
  b = clamp01(b);

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
        break;
    }

    h *= 60;
  }

  return { h, s, l };
}

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s = clamp01(s);
  l = clamp01(l);

  if (s === 0) return [l, l, l];

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hk = h / 360;

  return [
    hueToRgb(p, q, hk + 1 / 3),
    hueToRgb(p, q, hk),
    hueToRgb(p, q, hk - 1 / 3),
  ];
}

function hueToRgb(p, q, t) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

async function prepareDownload(originalName) {
  const baseName = originalName.replace(/\.[^.]+$/, "") || "photo";
  latestFileName = `${baseName}-cream-tone.jpg`;

  if (latestBlobUrl) URL.revokeObjectURL(latestBlobUrl);

  const blob = await canvasToBlob(resultCanvas, "image/jpeg", JPEG_QUALITY);
  latestBlobUrl = URL.createObjectURL(blob);
  downloadLink.href = latestBlobUrl;
  downloadLink.download = latestFileName;
  saveButton.disabled = false;
  return blob.size;
}

async function updatePreviewImage(canvas, image, type) {
  const previewSize = fitSize(canvas.width, canvas.height, MAX_PREVIEW_EDGE);
  const previewCanvas = document.createElement("canvas");
  const context = previewCanvas.getContext("2d");

  previewCanvas.width = previewSize.width;
  previewCanvas.height = previewSize.height;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(canvas, 0, 0, previewSize.width, previewSize.height);

  const blob = await canvasToBlob(previewCanvas, "image/jpeg", 0.9);
  const url = URL.createObjectURL(blob);

  if (type === "source") {
    if (sourcePreviewUrl) URL.revokeObjectURL(sourcePreviewUrl);
    sourcePreviewUrl = url;
  } else {
    if (resultPreviewUrl) URL.revokeObjectURL(resultPreviewUrl);
    resultPreviewUrl = url;
  }

  image.src = url;
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("导出图片失败，请重试。"));
      }
    }, type, quality);
  });
}

function resetOutput() {
  saveButton.disabled = true;
  sourceCard.classList.remove("has-image");
  resultCard.classList.remove("has-image");
  sourcePreview.removeAttribute("src");
  resultPreview.removeAttribute("src");

  if (latestBlobUrl) {
    URL.revokeObjectURL(latestBlobUrl);
    latestBlobUrl = "";
  }

  if (sourcePreviewUrl) {
    URL.revokeObjectURL(sourcePreviewUrl);
    sourcePreviewUrl = "";
  }

  if (resultPreviewUrl) {
    URL.revokeObjectURL(resultPreviewUrl);
    resultPreviewUrl = "";
  }
}

function setStatus(message) {
  statusText.textContent = message;
}

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function toByte(value) {
  return Math.round(clamp01(value) * 255);
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((error) => {
      console.warn("Service worker registration failed:", error);
    });
  });
}
