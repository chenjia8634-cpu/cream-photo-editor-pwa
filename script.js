const input = document.querySelector("#photoInput");
const sourceCanvas = document.querySelector("#sourceCanvas");
const resultCanvas = document.querySelector("#resultCanvas");
const sourcePreview = document.querySelector("#sourcePreview");
const resultPreview = document.querySelector("#resultPreview");
const videoPreview = document.querySelector("#videoPreview");
const sourceCard = sourceCanvas.closest(".preview-card");
const resultCard = resultCanvas.closest(".preview-card");
const statusText = document.querySelector("#statusText");
const saveButton = document.querySelector("#saveButton");
const saveAllButton = document.querySelector("#saveAllButton");
const downloadLink = document.querySelector("#downloadLink");
const batchSection = document.querySelector("#batchSection");
const batchResults = document.querySelector("#batchResults");
const batchCount = document.querySelector("#batchCount");

const MAX_EXPORT_EDGE = 6000;
const MAX_PREVIEW_EDGE = 1400;
const MAX_VIDEO_EDGE = 720;
const VIDEO_FPS = 15;
const JPEG_QUALITY = 0.98;

let sourcePreviewUrl = "";
let resultPreviewUrl = "";
let batchItems = [];

input.addEventListener("change", async (event) => {
  const files = Array.from(event.target.files || []);
  if (!files.length) return;

  resetOutput();
  setStatus(`已选择 ${files.length} 个文件，正在开始本地批量调色...`);

  let successCount = 0;

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];

    try {
      setStatus(`正在处理第 ${index + 1} / ${files.length} 张：${file.name}`);
      const item = isSupportedVideo(file)
        ? await processVideoFile(file, index, files.length)
        : await processFile(file, index, files.length);
      addBatchItem(item);
      successCount += 1;
    } catch (error) {
      console.error(error);
      addBatchError(file.name, error.message || "处理失败");
    }
  }

  input.value = "";

  if (successCount > 0) {
    saveButton.disabled = false;
    saveAllButton.disabled = false;
    const totalSize = batchItems.reduce((sum, item) => sum + item.blob.size, 0);
    setStatus(`批量调色完成：成功 ${successCount} / ${files.length} 张，输出合计 ${formatBytes(totalSize)}。照片只在浏览器本地处理。`);
  } else {
    setStatus("没有文件处理成功，请换 JPG、PNG、HEIC、HEIF、MOV 或 MP4 再试。");
  }
});

saveButton.addEventListener("click", async () => {
  const latestItem = batchItems[batchItems.length - 1];
  if (latestItem) await saveBatchItem(latestItem);
});

saveAllButton.addEventListener("click", async () => {
  if (!batchItems.length) return;

    const files = batchItems.map((item) => new File([item.blob], item.name, { type: item.type }));

  if (navigator.canShare && navigator.share && navigator.canShare({ files })) {
    try {
      await navigator.share({
        files,
        title: "奶油感产品图",
      });
      return;
    } catch (error) {
      if (error && error.name === "AbortError") return;
    }
  }

  for (const item of batchItems) {
    triggerDownload(item);
    await wait(350);
  }
});

async function processFile(file, index, total) {
  if (!isSupportedImage(file)) {
    throw new Error("请选择 JPG、JPEG、PNG、HEIC 或 HEIF 图片。");
  }

  const imageFile = await normalizeImageFile(file);
  const bitmap = await decodeImage(imageFile);
  const size = fitSize(bitmap.width, bitmap.height, MAX_EXPORT_EDGE);

  drawSource(bitmap, size.width, size.height);
  await updatePreviewImage(sourceCanvas, sourcePreview, "source");

  setStatus(`正在调色第 ${index + 1} / ${total} 张：${file.name}`);
  applyCreamPreset(sourceCanvas, resultCanvas);
  resultCard.classList.add("has-image");
  resultCard.classList.remove("has-video");
  videoPreview.removeAttribute("src");
  await updatePreviewImage(resultCanvas, resultPreview, "result");

  const blob = await canvasToBlob(resultCanvas, "image/jpeg", JPEG_QUALITY);
  const url = URL.createObjectURL(blob);
  const previewUrl = await createPreviewUrl(resultCanvas);
  const outputName = createOutputName(file.name);

  downloadLink.href = url;
  downloadLink.download = outputName;

  return {
    blob,
    url,
    previewUrl,
    name: outputName,
    type: "image/jpeg",
    kind: "image",
    originalName: file.name,
    inputSize: file.size,
    outputSize: blob.size,
    inputWidth: bitmap.width,
    inputHeight: bitmap.height,
    outputWidth: size.width,
    outputHeight: size.height,
  };
}

async function processVideoFile(file, index, total) {
  if (!supportsVideoExport()) {
    throw new Error("当前浏览器不支持视频导出，请在较新的 Safari 或 Chrome 中打开。");
  }

  setStatus(`正在读取视频第 ${index + 1} / ${total} 个：${file.name}`);

  const sourceUrl = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.src = sourceUrl;
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.crossOrigin = "anonymous";

  try {
    await waitForVideoMetadata(video);

    const size = fitSize(video.videoWidth, video.videoHeight, MAX_VIDEO_EDGE);
    sourceCanvas.width = size.width;
    sourceCanvas.height = size.height;
    resultCanvas.width = size.width;
    resultCanvas.height = size.height;

    const outputStream = resultCanvas.captureStream(VIDEO_FPS);
    const mimeType = getSupportedVideoMimeType();
    const recorderOptions = { videoBitsPerSecond: 4_000_000 };
    if (mimeType) recorderOptions.mimeType = mimeType;
    const recorder = new MediaRecorder(outputStream, recorderOptions);
    const chunks = [];

    recorder.addEventListener("dataavailable", (event) => {
      if (event.data && event.data.size) chunks.push(event.data);
    });

    const stopped = new Promise((resolve) => {
      recorder.addEventListener("stop", resolve, { once: true });
    });

    const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true });

    recorder.start(1000);
    video.currentTime = 0;
    await video.play();

    await renderVideoFrames(video, sourceContext, size, file.name, index, total);
    setStatus(`正在生成调色后视频：${file.name}`);

    await stopRecorder(recorder, stopped);

    const outputType = recorder.mimeType || mimeType || "video/mp4";
    const blob = new Blob(chunks, { type: outputType });
    const url = URL.createObjectURL(blob);
    const previewUrl = url;
    const outputName = createVideoOutputName(file.name, outputType);

    video.pause();
    videoPreview.src = url;
    videoPreview.muted = false;
    resultCard.classList.add("has-video");
    resultCard.classList.remove("has-image");
    sourceCard.classList.remove("has-image");

    downloadLink.href = url;
    downloadLink.download = outputName;

    return {
      blob,
      url,
      previewUrl,
      name: outputName,
      type: outputType,
      kind: "video",
      originalName: file.name,
      inputSize: file.size,
      outputSize: blob.size,
      inputWidth: video.videoWidth,
      inputHeight: video.videoHeight,
      outputWidth: size.width,
      outputHeight: size.height,
    };
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

function addBatchItem(item) {
  batchItems.push(item);
  batchSection.classList.add("has-results");
  batchCount.textContent = `${batchItems.length} 张`;

  const article = document.createElement("article");
  article.className = "batch-item";

  const image = document.createElement(item.kind === "video" ? "video" : "img");
  image.className = "batch-thumb";
  image.src = item.previewUrl;
  if (item.kind === "video") {
    image.muted = true;
    image.controls = true;
    image.playsInline = true;
  } else {
    image.alt = `${item.originalName} 调色预览`;
  }

  const meta = document.createElement("div");
  meta.className = "batch-meta";

  const name = document.createElement("div");
  name.className = "batch-name";
  name.textContent = item.originalName;

  const info = document.createElement("div");
  info.className = "batch-info";
  const typeText = item.kind === "video" ? "视频" : "图片";
  info.textContent = `${typeText} ${item.outputWidth}×${item.outputHeight} / ${formatBytes(item.outputSize)}`;

  const link = document.createElement("a");
  link.className = "item-download";
  link.href = item.url;
  link.download = item.name;
  link.textContent = "下载";

  meta.append(name, info, link);
  article.append(image, meta);
  batchResults.append(article);
}

function addBatchError(fileName, message) {
  batchSection.classList.add("has-results");

  const article = document.createElement("article");
  article.className = "batch-item error-item";

  const placeholder = document.createElement("div");
  placeholder.className = "batch-thumb error-thumb";
  placeholder.textContent = "失败";

  const meta = document.createElement("div");
  meta.className = "batch-meta";

  const name = document.createElement("div");
  name.className = "batch-name";
  name.textContent = fileName;

  const info = document.createElement("div");
  info.className = "batch-info";
  info.textContent = message;

  meta.append(name, info);
  article.append(placeholder, meta);
  batchResults.append(article);
}

async function saveBatchItem(item) {
  const file = new File([item.blob], item.name, { type: item.type });

  if (navigator.canShare && navigator.share && navigator.canShare({ files: [file] })) {
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

  triggerDownload(item);
}

function triggerDownload(item) {
  downloadLink.href = item.url;
  downloadLink.download = item.name;
  downloadLink.click();
}

function createOutputName(originalName) {
  const baseName = originalName.replace(/\.[^.]+$/, "") || "photo";
  return `${baseName}-cream-tone.jpg`;
}

function createVideoOutputName(originalName, mimeType) {
  const baseName = originalName.replace(/\.[^.]+$/, "") || "video";
  const extension = mimeType.includes("mp4") ? "mp4" : "webm";
  return `${baseName}-cream-tone.${extension}`;
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function isSupportedImage(file) {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();

  if (type === "image/jpeg" || type === "image/png") return true;
  if (type === "image/heic" || type === "image/heif") return true;
  if (/\.(jpe?g|png|heic|heif)$/.test(name)) return true;
  return false;
}

function isSupportedVideo(file) {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();

  if (type === "video/mp4" || type === "video/quicktime") return true;
  if (/\.(mp4|mov|m4v)$/i.test(name)) return true;
  return false;
}

function supportsVideoExport() {
  return Boolean(window.MediaRecorder && HTMLCanvasElement.prototype.captureStream);
}

function getSupportedVideoMimeType() {
  if (!MediaRecorder.isTypeSupported) return "";

  const candidates = [
    "video/mp4;codecs=avc1.42E01E",
    "video/mp4",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];

  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

function waitForVideoMetadata(video) {
  return new Promise((resolve, reject) => {
    if (video.readyState >= 1 && video.videoWidth && video.videoHeight) {
      resolve();
      return;
    }

    video.addEventListener("loadedmetadata", resolve, { once: true });
    video.addEventListener("error", () => reject(new Error("视频读取失败，请换 MOV 或 MP4 再试。")), { once: true });
  });
}

async function renderVideoFrames(video, sourceContext, size, fileName, index, total) {
  const startTime = performance.now();
  let lastStatusTime = 0;

  while (!isVideoNearEnd(video)) {
    sourceContext.drawImage(video, 0, 0, size.width, size.height);
    applyCreamPreset(sourceCanvas, resultCanvas);

    const now = performance.now();
    if (now - lastStatusTime > 500) {
      const progress = video.duration ? Math.min(98, Math.round((video.currentTime / video.duration) * 100)) : 0;
      setStatus(`正在调色视频第 ${index + 1} / ${total} 个：${fileName}，${progress}%`);
      lastStatusTime = now;
    }

    await waitForNextVideoFrame(video);

    if (performance.now() - startTime > 120000) {
      throw new Error("视频处理超时，请先裁短视频或选择较短 Live Photo 视频。");
    }
  }

  if (video.readyState >= 2) {
    sourceContext.drawImage(video, 0, 0, size.width, size.height);
    applyCreamPreset(sourceCanvas, resultCanvas);
  }
  video.pause();
  setStatus(`正在调色视频第 ${index + 1} / ${total} 个：${fileName}，100%`);
}

function waitForNextVideoFrame(video) {
  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    const timeout = window.setTimeout(done, 220);
    video.addEventListener("ended", done, { once: true });

    if ("requestVideoFrameCallback" in video) {
      video.requestVideoFrameCallback(() => {
        window.clearTimeout(timeout);
        done();
      });
    } else {
      window.setTimeout(done, 1000 / VIDEO_FPS);
    }
  });
}

function isVideoNearEnd(video) {
  if (video.ended) return true;
  if (!Number.isFinite(video.duration) || video.duration <= 0) return false;
  return video.currentTime >= Math.max(0, video.duration - 0.12);
}

async function stopRecorder(recorder, stopped) {
  if (recorder.state !== "inactive") recorder.stop();
  await Promise.race([
    stopped,
    wait(2500),
  ]);
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

async function updatePreviewImage(canvas, image, type) {
  const url = await createPreviewUrl(canvas);

  if (type === "source") {
    if (sourcePreviewUrl) URL.revokeObjectURL(sourcePreviewUrl);
    sourcePreviewUrl = url;
  } else {
    if (resultPreviewUrl) URL.revokeObjectURL(resultPreviewUrl);
    resultPreviewUrl = url;
  }

  image.src = url;
}

async function createPreviewUrl(canvas) {
  const previewSize = fitSize(canvas.width, canvas.height, MAX_PREVIEW_EDGE);
  const previewCanvas = document.createElement("canvas");
  const context = previewCanvas.getContext("2d");

  previewCanvas.width = previewSize.width;
  previewCanvas.height = previewSize.height;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(canvas, 0, 0, previewSize.width, previewSize.height);

  const blob = await canvasToBlob(previewCanvas, "image/jpeg", 0.9);
  return URL.createObjectURL(blob);
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
  saveAllButton.disabled = true;
  sourceCard.classList.remove("has-image");
  resultCard.classList.remove("has-image");
  sourcePreview.removeAttribute("src");
  resultPreview.removeAttribute("src");
  batchSection.classList.remove("has-results");
  batchResults.textContent = "";
  batchCount.textContent = "0 张";

  batchItems.forEach((item) => {
    URL.revokeObjectURL(item.url);
    if (item.previewUrl !== item.url) URL.revokeObjectURL(item.previewUrl);
  });
  batchItems = [];

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
