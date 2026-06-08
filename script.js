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
const saveSelectedButton = document.querySelector("#saveSelectedButton");
const downloadLink = document.querySelector("#downloadLink");
const batchSection = document.querySelector("#batchSection");
const batchResults = document.querySelector("#batchResults");
const batchCount = document.querySelector("#batchCount");
const presetSelect = document.querySelector("#presetSelect");
const strengthSlider = document.querySelector("#strengthSlider");
const strengthValue = document.querySelector("#strengthValue");
const compareButton = document.querySelector("#compareButton");
const reprocessButton = document.querySelector("#reprocessButton");
const applyAllButton = document.querySelector("#applyAllButton");
const currentIndexBadge = document.querySelector("#currentIndexBadge");
const prevItemButton = document.querySelector("#prevItemButton");
const nextItemButton = document.querySelector("#nextItemButton");
const changelogButton = document.querySelector("#changelogButton");
const changelogDialog = document.querySelector("#changelogDialog");
const changelogList = document.querySelector("#changelogList");

const MAX_EXPORT_EDGE = 6000;
const MAX_PREVIEW_EDGE = 1400;
const APP_VERSION = "v3.17";
const COMPAT_VIDEO_EDGE = 720;
const COMPAT_VIDEO_FPS = 24;
const COMPAT_VIDEO_BITRATE = 6_000_000;
const JPEG_QUALITY = 0.98;

let sourcePreviewUrl = "";
let resultPreviewUrl = "";
let batchItems = [];
let selectedItem = null;
let presetStrength = 1;
let activePresetId = "cream_product";
let ffmpegInstance = null;
let ffmpegHelpers = null;

const COLOR_PRESETS = {
  cream_product: {
    name: "奶油感产品图",
    mode: "legacy",
  },
  warm_brown_soft_clean: {
    name: "暖棕清透轻调",
    mode: "config",
    base: {
      exposure_factor: 0.975,
      red_multiplier: 1.014,
      green_multiplier: 1.000,
      blue_multiplier: 0.986,
      black_lift: 0.004,
      contrast_factor: 1.02,
      saturation_factor: 1.015,
      gamma: 0.985,
    },
    tone_curve: [
      [0.00, 0.008],
      [0.25, 0.265],
      [0.50, 0.500],
      [0.75, 0.735],
      [0.90, 0.850],
      [1.00, 0.955],
    ],
    selective_colors: [
      { hue_range: [345, 15], saturation_multiplier: 1.02, lightness_shift: 0.004, hue_shift: 1 },
      { hue_range: [15, 40], saturation_multiplier: 1.03, lightness_shift: 0.006, hue_shift: -1 },
      { hue_range: [40, 75], saturation_multiplier: 1.04, lightness_shift: 0.008, hue_shift: -2 },
      { hue_range: [75, 160], saturation_multiplier: 0.93, lightness_shift: 0.002, hue_shift: -3 },
      { hue_range: [160, 200], saturation_multiplier: 0.92, lightness_shift: 0.002, hue_shift: -2 },
      { hue_range: [200, 250], saturation_multiplier: 0.94, lightness_shift: 0.003, hue_shift: 2 },
      { hue_range: [250, 300], saturation_multiplier: 0.96, lightness_shift: 0.002, hue_shift: 1 },
    ],
    highlight_protection: {
      enabled: true,
      start: 0.76,
      compression: 0.52,
    },
    shadow_handling: {
      lift: 0.010,
      softness: 0.32,
    },
  },
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
};

const CHANGELOG = [
  ["v1.0", "完成首版 MVP，支持 JPG/PNG 上传、Canvas 本地调色、原图/调色后预览和 JPG 保存。"],
  ["v1.1", "提升导出质量，减少 JPG 压缩导致的马赛克和画质损失。"],
  ["v1.2", "修复手机端预览空白但可以下载的问题。"],
  ["v1.3", "增加 HEIC/HEIF 本地转码，iPhone 相册照片可直接导入调色。"],
  ["v1.4", "增加批量导入、批量调色和批量保存。"],
  ["v2.0", "尝试支持 Live Photo 转视频后的 MOV/MP4 视频调色。"],
  ["v2.1", "优化视频导出预览、首帧和音频保留方向，并给标题增加版本号。"],
  ["v2.2", "增加视频引擎下载进度提示。"],
  ["v2.3", "增加视频引擎初始化等待提示和超时提示。"],
  ["v2.4", "调整视频方案，避免 iPhone 端 ffmpeg 初始化长期卡住。"],
  ["v2.5", "恢复 iPhone 视频兼容导出，增加调色强度滑杆、按住原图对比、批量结果点选预览。"],
  ["v2.6", "精简预览区，只保留调色后预览框，原图改为按住按钮临时查看。"],
  ["v2.7", "修复 iPhone 长按原图对比按钮触发文字选取的问题。"],
  ["v2.8", "增加当前强度重新处理按钮，批量缩略图和当前预览显示对应序号。"],
  ["v2.9", "增加重新处理即时反馈、更新日志弹窗、多选保存，并让单项下载走系统保存弹窗。"],
  ["v3.0", "增加调色风格选择，并新增奶油暖白玩偶感预设。"],
  ["v3.1", "将新增风格调整为暖棕清透轻调，更克制地保留木质暖棕和日常清透感。"],
  ["v3.2", "微调暖棕清透轻调，降低曝光并加强高光保护，减少过曝感。"],
  ["v3.3", "继续降低暖棕清透轻调 EV，并更强压住白色高光区域。"],
  ["v3.4", "新增粉棕居家玩偶感预设，按图片亮度自适应降低 EV、稳住暗部并保护白色高光。"],
  ["v3.5", "重做粉棕居家玩偶感的自适应算法，加入亮度保护护栏，避免整图发黑并保留白色层次。"],
  ["v3.6", "增加预览上一张/下一张快捷按钮，并按参考图统计重调粉棕居家玩偶感，减少发灰、增强暗部对比和颜色保留。"],
  ["v3.7", "修复中性白色区域偏红和预览块状感，翻页按钮移动到序号旁，并增加应用到全部照片功能。"],
  ["v3.8", "重做粉棕居家玩偶感的中性白保护，避免白色区域被 HSL 色相染红或出现色块。"],
  ["v3.9", "修复粉棕居家玩偶感在白色高光区域出现发红、涂抹和色块的问题。"],
  ["v3.10", "将粉棕居家玩偶感改为稳定连续算法，移除局部中性保护和暗部遮罩，减少白色区域发红、涂抹和色块。"],
  ["v3.11", "新增万能美食调色预设，按曝光、鲜明度、高光、阴影、饱和、色温、锐度和清晰度参数做本地调色。"],
  ["v3.12", "优化万能美食调色，降低高光提亮并保留白色细节，减少暗部提亮以增强画面层次。"],
  ["v3.13", "重做万能美食调色的高光保护顺序，曝光和饱和主要作用于中间调，暗部不额外提亮，减少又暗又丢高光细节的问题。"],
  ["v3.14", "重做万能美食调色为专用算法，中间调提亮，高光先保护，暗部不额外提亮，用自然鲜明度保留食物色彩和细节。"],
  ["v3.15", "\u4f18\u5316\u4e07\u80fd\u7f8e\u98df\u8c03\u8272\uff0c\u589e\u52a0\u5c40\u90e8\u6e05\u6670\u5ea6\u548c\u9c9c\u660e\u5ea6\u903b\u8f91\uff0c\u5148\u4fdd\u62a4\u767d\u8272\u9ad8\u5149\u7ec6\u8282\uff0c\u518d\u589e\u5f3a\u98df\u7269\u6a59\u9ec4\u548c\u80cc\u666f\u84dd\u8272\u5c42\u6b21\u3002"],
  ["v3.17", "\u4f18\u5316\u9884\u89c8\u4e0a\u4e00\u5f20\u002f\u4e0b\u4e00\u5f20\u6309\u94ae\uff0c\u51cf\u5c11\u0020\u0069\u0050\u0068\u006f\u006e\u0065\u0020\u8fde\u70b9\u89e6\u53d1\u9875\u9762\u53cc\u51fb\u653e\u5927\uff1b\u9009\u62e9\u4e07\u80fd\u7f8e\u98df\u8c03\u8272\u65f6\u9ed8\u8ba4\u5207\u5230\u0020\u0036\u0030\u0025\u0020\u5f3a\u5ea6\u3002"],
];

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
presetSelect.addEventListener("change", () => {
  activePresetId = presetSelect.value;
  applyPresetDefaultStrength();
  const presetName = COLOR_PRESETS[activePresetId]?.name || "\u5f53\u524d\u98ce\u683c";
  setStatus(`\u5df2\u5207\u6362\u5230\u300c${presetName}\u300d\uff0c\u5f53\u524d\u5f3a\u5ea6 ${strengthSlider.value}%\u3002\u5982\u9700\u5e94\u7528\u5230\u5f53\u524d\u56fe\u7247\uff0c\u8bf7\u70b9\u91cd\u65b0\u7528\u5f53\u524d\u5f3a\u5ea6\u5904\u7406\u3002`);
});

strengthSlider.addEventListener("input", () => {
  setPresetStrength(strengthSlider.value);
});

reprocessButton.addEventListener("click", async () => {
  if (!selectedItem || selectedItem.kind !== "image") return;
  await reprocessSelectedImage();
});

applyAllButton.addEventListener("click", async () => {
  await applyCurrentSettingsToAllImages();
});

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

saveSelectedButton.addEventListener("click", async () => {
  const selectedItems = batchItems.filter((item) => item.selected);
  if (!selectedItems.length) return;
  await saveBatchItems(selectedItems);
});

changelogButton.addEventListener("click", () => {
  openChangelog();
});

changelogDialog.addEventListener("click", (event) => {
  if (event.target.closest("[data-close-modal]")) closeChangelog();
});

compareButton.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  showOriginalCompare();
});

compareButton.addEventListener("touchstart", (event) => {
  event.preventDefault();
  showOriginalCompare();
}, { passive: false });

compareButton.addEventListener("touchend", (event) => {
  event.preventDefault();
  restoreEditedCompare();
}, { passive: false });

compareButton.addEventListener("contextmenu", (event) => {
  event.preventDefault();
});

compareButton.addEventListener("selectstart", (event) => {
  event.preventDefault();
});

compareButton.addEventListener("pointerup", restoreEditedCompare);
compareButton.addEventListener("pointercancel", restoreEditedCompare);
compareButton.addEventListener("pointerleave", restoreEditedCompare);
compareButton.addEventListener("blur", restoreEditedCompare);
document.addEventListener("pointerup", restoreEditedCompare);

input.addEventListener("change", async (event) => {
  const files = Array.from(event.target.files || []);
  if (!files.length) return;

  resetOutput();
  setStatus(`已选择 ${files.length} 个文件，正在开始本地批量调色...`);

  let successCount = 0;

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];

    try {
      setStatus(`正在处理第 ${index + 1} / ${files.length} 个：${file.name}`);
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
    updateApplyAllButton();
    const totalSize = batchItems.reduce((sum, item) => sum + item.blob.size, 0);
    setStatus(`批量调色完成：成功 ${successCount} / ${files.length} 个，输出合计 ${formatBytes(totalSize)}。照片只在浏览器本地处理。`);
  } else {
    setStatus("没有文件处理成功，请换 JPG、PNG、HEIC、HEIF、MOV 或 MP4 再试。");
  }
});

saveButton.addEventListener("click", async () => {
  const item = selectedItem || batchItems[batchItems.length - 1];
  if (item) await saveBatchItem(item);
});

saveAllButton.addEventListener("click", async () => {
  if (!batchItems.length) return;
  await saveBatchItems(batchItems);
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
  const sourcePreviewUrlForItem = await createPreviewUrl(sourceCanvas);

  setStatus(`正在调色第 ${index + 1} / ${total} 张：${file.name}`);
  applyCreamPreset(sourceCanvas, resultCanvas, presetStrength);
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
    sourcePreviewUrl: sourcePreviewUrlForItem,
    name: outputName,
    type: "image/jpeg",
    kind: "image",
    sourceFile: imageFile,
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
  if (isIOSBrowser()) {
    return await processVideoFileCompat(file, index, total);
  }

  setStatus("正在加载高质量视频引擎，首次使用会稍慢...");

  const [metadata, posterUrl, ffmpeg] = await Promise.all([
    readVideoMetadata(file),
    createVideoPosterUrl(file),
    loadFfmpeg(),
  ]);

  const inputName = `input-${Date.now()}-${index}.${getVideoInputExtension(file.name)}`;
  const outputName = createVideoOutputName(file.name, "video/mp4");
  const outputFsName = `output-${Date.now()}-${index}.mp4`;
  const helpers = ffmpegHelpers;

  ffmpeg.on("progress", ({ progress }) => {
    const percent = Math.min(99, Math.max(0, Math.round((progress || 0) * 100)));
    setStatus(`正在高质量调色视频第 ${index + 1} / ${total} 个：${file.name}，${percent}%`);
  });

  await ffmpeg.writeFile(inputName, await helpers.fetchFile(file));

  const filter = createVideoFilter(presetStrength);

  const command = [
    "-i", inputName,
    "-map", "0:v:0",
    "-map", "0:a?",
    "-vf", filter,
    "-c:v", "libx264",
    "-preset", "slow",
    "-crf", "16",
    "-pix_fmt", "yuv420p",
    "-c:a", "copy",
    "-movflags", "+faststart",
    outputFsName,
  ];

  try {
    await ffmpeg.exec(command);
  } catch (error) {
    console.warn("Audio copy failed, retrying with AAC audio:", error);
    await safeDeleteFfmpegFile(ffmpeg, outputFsName);
    await ffmpeg.exec([
      "-i", inputName,
      "-map", "0:v:0",
      "-map", "0:a?",
      "-vf", filter,
      "-c:v", "libx264",
      "-preset", "slow",
      "-crf", "16",
      "-pix_fmt", "yuv420p",
      "-c:a", "aac",
      "-b:a", "192k",
      "-movflags", "+faststart",
      outputFsName,
    ]);
  }

  setStatus(`正在生成调色后视频：${file.name}`);
  const data = await ffmpeg.readFile(outputFsName);
  const blob = new Blob([data.buffer], { type: "video/mp4" });
  const url = URL.createObjectURL(blob);

  await safeDeleteFfmpegFile(ffmpeg, inputName);
  await safeDeleteFfmpegFile(ffmpeg, outputFsName);

  videoPreview.src = url;
  videoPreview.poster = posterUrl;
  videoPreview.muted = false;
  videoPreview.preload = "metadata";
  resultCard.classList.add("has-video");
  resultCard.classList.remove("has-image");
  sourceCard.classList.remove("has-image");

  downloadLink.href = url;
  downloadLink.download = outputName;

  return {
    blob,
    url,
    previewUrl: url,
    posterUrl,
    name: outputName,
    type: "video/mp4",
    kind: "video",
    audioPreserved: true,
    originalName: file.name,
    inputSize: file.size,
    outputSize: blob.size,
    inputWidth: metadata.width,
    inputHeight: metadata.height,
    outputWidth: metadata.width,
    outputHeight: metadata.height,
  };
}

async function processVideoFileCompat(file, index, total) {
  if (!supportsCompatVideoExport()) {
    throw new Error("当前浏览器不支持 iPhone 兼容视频调色。请升级 Safari，或在电脑浏览器中使用。");
  }

  setStatus(`正在使用 iPhone 兼容模式调色视频第 ${index + 1} / ${total} 个：${file.name}`);

  const sourceUrl = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.src = sourceUrl;
  video.muted = true;
  video.volume = 0;
  video.playsInline = true;
  video.preload = "auto";

  try {
    await waitForVideoMetadata(video);

    const size = fitSize(video.videoWidth, video.videoHeight, COMPAT_VIDEO_EDGE);
    sourceCanvas.width = size.width;
    sourceCanvas.height = size.height;
    resultCanvas.width = size.width;
    resultCanvas.height = size.height;

    const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true });
    await seekVideo(video, getVideoStartTime(video));
    drawVideoFrame(video, sourceContext, size);
    const posterUrl = await createPreviewUrl(resultCanvas);

    const stream = resultCanvas.captureStream(COMPAT_VIDEO_FPS);
    const mimeType = getCompatVideoMimeType();
    const recorderOptions = { videoBitsPerSecond: COMPAT_VIDEO_BITRATE };
    if (mimeType) recorderOptions.mimeType = mimeType;

    const recorder = new MediaRecorder(stream, recorderOptions);
    const chunks = [];
    recorder.addEventListener("dataavailable", (event) => {
      if (event.data && event.data.size) chunks.push(event.data);
    });

    const stopped = new Promise((resolve) => {
      recorder.addEventListener("stop", resolve, { once: true });
    });

    recorder.start(500);
    drawVideoFrame(video, sourceContext, size);
    await wait(100);
    await seekVideo(video, getVideoStartTime(video));
    await video.play();
    await renderCompatVideoFrames(video, sourceContext, size, file.name, index, total);
    stopStreamTracks(stream);
    if (recorder.state !== "inactive") recorder.stop();
    await Promise.race([stopped, wait(2500)]);

    const outputType = recorder.mimeType || mimeType || "video/mp4";
    const blob = new Blob(chunks, { type: outputType });
    const url = URL.createObjectURL(blob);
    const outputName = createVideoOutputName(file.name, outputType);

    videoPreview.src = url;
    videoPreview.poster = posterUrl;
    videoPreview.muted = false;
    videoPreview.preload = "metadata";
    resultCard.classList.add("has-video");
    resultCard.classList.remove("has-image");
    sourceCard.classList.remove("has-image");

    downloadLink.href = url;
    downloadLink.download = outputName;

    return {
      blob,
      url,
      previewUrl: url,
      posterUrl,
      name: outputName,
      type: outputType,
      kind: "video",
      audioPreserved: false,
      mode: "compat",
      originalName: file.name,
      inputSize: file.size,
      outputSize: blob.size,
      inputWidth: video.videoWidth,
      inputHeight: video.videoHeight,
      outputWidth: size.width,
      outputHeight: size.height,
    };
  } finally {
    video.pause();
    URL.revokeObjectURL(sourceUrl);
  }
}

function supportsCompatVideoExport() {
  return Boolean(window.MediaRecorder && HTMLCanvasElement.prototype.captureStream);
}

function getCompatVideoMimeType() {
  if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) return "";

  const candidates = [
    "video/mp4;codecs=avc1.42E01E",
    "video/mp4",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];

  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

async function renderCompatVideoFrames(video, sourceContext, size, fileName, index, total) {
  const startedAt = performance.now();
  let lastUpdate = 0;

  while (!isCompatVideoNearEnd(video)) {
    drawVideoFrame(video, sourceContext, size);

    const now = performance.now();
    if (now - lastUpdate > 450) {
      const percent = Number.isFinite(video.duration) && video.duration > 0
        ? Math.min(99, Math.round((video.currentTime / video.duration) * 100))
        : 0;
      setStatus(`正在兼容模式调色视频第 ${index + 1} / ${total} 个：${fileName}，${percent}%`);
      lastUpdate = now;
    }

    if (now - startedAt > 180000) {
      throw new Error("视频处理超过 3 分钟仍未完成，请先裁短视频或换一个更小的视频再试。");
    }

    await waitForCompatVideoFrame(video);
  }

  if (video.readyState >= 2) {
    drawVideoFrame(video, sourceContext, size);
  }

  video.pause();
  setStatus(`正在生成兼容调色视频：${fileName}，100%`);
}

function waitForCompatVideoFrame(video) {
  if (video.ended || isCompatVideoNearEnd(video)) return Promise.resolve();

  return new Promise((resolve) => {
    let settled = false;

    const done = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    const timeout = window.setTimeout(done, 320);
    video.addEventListener("ended", () => {
      window.clearTimeout(timeout);
      done();
    }, { once: true });

    if ("requestVideoFrameCallback" in video) {
      video.requestVideoFrameCallback(() => {
        window.clearTimeout(timeout);
        done();
      });
    }
  });
}

function isCompatVideoNearEnd(video) {
  if (video.ended) return true;
  if (!Number.isFinite(video.duration) || video.duration <= 0) return false;
  return video.currentTime >= video.duration - 0.08;
}

function stopStreamTracks(stream) {
  if (!stream) return;
  stream.getTracks().forEach((track) => track.stop());
}

function addBatchItem(item) {
  item.index = batchItems.length + 1;
  item.selected = false;
  batchItems.push(item);
  batchSection.classList.add("has-results");
  batchCount.textContent = `${batchItems.length} 张`;

  const article = document.createElement("article");
  article.className = "batch-item";

  const image = document.createElement(item.kind === "video" ? "video" : "img");
  image.className = "batch-thumb";
  image.src = item.previewUrl;
  if (item.kind === "video") {
    if (item.posterUrl) image.poster = item.posterUrl;
    image.muted = true;
    image.controls = true;
    image.playsInline = true;
  } else {
    image.alt = `${item.originalName} 调色预览`;
  }

  const thumbWrap = document.createElement("div");
  thumbWrap.className = "batch-thumb-wrap";

  const indexBadge = document.createElement("span");
  indexBadge.className = "thumb-index";
  indexBadge.textContent = String(item.index);

  const selectLabel = document.createElement("label");
  selectLabel.className = "item-select";
  selectLabel.setAttribute("aria-label", `选择第 ${item.index} 张`);

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.addEventListener("click", (event) => {
    event.stopPropagation();
  });
  checkbox.addEventListener("change", () => {
    item.selected = checkbox.checked;
    updateSelectedSaveState();
  });

  selectLabel.append(checkbox);
  thumbWrap.append(image, indexBadge, selectLabel);

  const meta = document.createElement("div");
  meta.className = "batch-meta";

  const name = document.createElement("div");
  name.className = "batch-name";
  name.textContent = item.originalName;

  const info = document.createElement("div");
  info.className = "batch-info";
  info.textContent = getBatchItemInfoText(item);

  const link = document.createElement("a");
  link.className = "item-download";
  link.href = item.url;
  link.download = item.name;
  link.textContent = "下载";
  link.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    await saveBatchItem(item);
  });

  item.element = article;
  item.thumbElement = image;
  item.infoElement = info;
  item.checkboxElement = checkbox;

  meta.append(name, info, link);
  article.append(thumbWrap, meta);
  article.addEventListener("click", (event) => {
    if (event.target.closest("a, button, video")) return;
    selectBatchItem(item, article);
  });
  batchResults.append(article);
  selectBatchItem(item, article);
}

function selectBatchItem(item, article) {
  selectedItem = item;
  batchResults.querySelectorAll(".batch-item").forEach((element) => {
    element.classList.toggle("is-selected", element === article);
  });

  downloadLink.href = item.url;
  downloadLink.download = item.name;
  saveButton.disabled = false;
  currentIndexBadge.textContent = item.index ? `第 ${item.index} 张` : "未选择";

  if (item.kind === "video") {
    sourceCard.classList.remove("has-image");
    resultCard.classList.remove("has-image");
    resultCard.classList.add("has-video");
    sourcePreview.removeAttribute("src");
    resultPreview.removeAttribute("src");
    videoPreview.src = item.previewUrl || item.url;
    if (item.posterUrl) {
      videoPreview.poster = item.posterUrl;
    } else {
      videoPreview.removeAttribute("poster");
    }
    videoPreview.muted = false;
    videoPreview.preload = "metadata";
    compareButton.disabled = true;
    reprocessButton.disabled = true;
    updateApplyAllButton();
    compareButton.textContent = "按住看原图";
    updatePreviewNavButtons();
    return;
  }

  sourceCard.classList.add("has-image");
  resultCard.classList.add("has-image");
  resultCard.classList.remove("has-video");
  videoPreview.removeAttribute("src");
  videoPreview.removeAttribute("poster");
  sourcePreview.src = item.sourcePreviewUrl || "";
  resultPreview.src = item.previewUrl;
  compareButton.disabled = !item.sourcePreviewUrl;
  reprocessButton.disabled = !item.sourceFile;
  updateApplyAllButton();
  compareButton.textContent = "按住看原图";
  updatePreviewNavButtons();
}

function selectAdjacentBatchItem(direction) {
  if (!selectedItem || batchItems.length < 2) return;
  const currentIndex = batchItems.indexOf(selectedItem);
  if (currentIndex < 0) return;

  const nextIndex = currentIndex + direction;
  if (nextIndex < 0 || nextIndex >= batchItems.length) return;

  const nextItem = batchItems[nextIndex];
  selectBatchItem(nextItem, nextItem.element);
}

function updatePreviewNavButtons() {
  const currentIndex = selectedItem ? batchItems.indexOf(selectedItem) : -1;
  const hasMultiple = batchItems.length > 1 && currentIndex >= 0;

  prevItemButton.disabled = !hasMultiple || currentIndex <= 0;
  nextItemButton.disabled = !hasMultiple || currentIndex >= batchItems.length - 1;
}

function updateApplyAllButton() {
  applyAllButton.disabled = !batchItems.some((item) => item.kind === "image" && item.sourceFile);
}

function showOriginalCompare() {
  if (!selectedItem || selectedItem.kind !== "image" || !selectedItem.sourcePreviewUrl) return;
  resultPreview.src = selectedItem.sourcePreviewUrl;
  compareButton.textContent = "松开看调色后";
}

function restoreEditedCompare() {
  if (!selectedItem || selectedItem.kind !== "image") return;
  resultPreview.src = selectedItem.previewUrl;
  compareButton.textContent = "按住看原图";
}

function getBatchItemInfoText(item) {
  const typeText = item.kind === "video" ? "视频" : "图片";
  const audioText = item.kind === "video" ? ` / ${item.audioPreserved ? "含声音" : "无声音"}` : "";
  return `${typeText} ${item.outputWidth}×${item.outputHeight} / ${formatBytes(item.outputSize)}${audioText}`;
}

async function reprocessSelectedImage() {
  const item = selectedItem;
  if (!item || item.kind !== "image" || !item.sourceFile) return;

  reprocessButton.disabled = true;
  applyAllButton.disabled = true;
  reprocessButton.classList.add("is-processing");
  reprocessButton.textContent = "正在重新处理...";
  saveButton.disabled = true;
  setStatus(`正在用 ${strengthSlider.value}% 强度重新处理第 ${item.index} 张：${item.originalName}`);
  await wait(60);

  try {
    await updateImageItemWithCurrentSettings(item);
    setStatus(`第 ${item.index} 张已按 ${strengthSlider.value}% 强度重新处理。`);
  } catch (error) {
    console.error(error);
    setStatus(error.message || "重新处理失败，请再试一次。");
  } finally {
    saveButton.disabled = false;
    reprocessButton.classList.remove("is-processing");
    reprocessButton.textContent = "重新用当前强度处理";
    reprocessButton.disabled = false;
    updateApplyAllButton();
  }
}

async function applyCurrentSettingsToAllImages() {
  const imageItems = batchItems.filter((item) => item.kind === "image" && item.sourceFile);
  if (!imageItems.length) return;

  const originalSelected = selectedItem;
  applyAllButton.disabled = true;
  reprocessButton.disabled = true;
  saveButton.disabled = true;
  saveAllButton.disabled = true;
  applyAllButton.classList.add("is-processing");
  applyAllButton.textContent = "正在应用到全部...";
  await wait(60);

  let successCount = 0;

  try {
    for (let index = 0; index < imageItems.length; index += 1) {
      const item = imageItems[index];
      setStatus(`正在应用到全部照片：${index + 1} / ${imageItems.length}，第 ${item.index} 张`);
      await updateImageItemWithCurrentSettings(item, { updatePreview: item === originalSelected });
      successCount += 1;
      await wait(20);
    }

    if (originalSelected && batchItems.includes(originalSelected)) {
      selectBatchItem(originalSelected, originalSelected.element);
    }

    const totalSize = batchItems.reduce((sum, item) => sum + item.blob.size, 0);
    setStatus(`已用当前色调和 ${strengthSlider.value}% 强度应用到 ${successCount} 张照片。输出合计 ${formatBytes(totalSize)}。`);
  } catch (error) {
    console.error(error);
    setStatus(error.message || "应用到全部照片失败，请再试一次。");
  } finally {
    applyAllButton.classList.remove("is-processing");
    applyAllButton.textContent = "应用到全部照片";
    saveButton.disabled = !selectedItem;
    saveAllButton.disabled = !batchItems.length;
    reprocessButton.disabled = !(selectedItem?.kind === "image" && selectedItem.sourceFile);
    updateApplyAllButton();
  }
}

async function updateImageItemWithCurrentSettings(item, options = {}) {
  const bitmap = await decodeImage(item.sourceFile);
  const size = fitSize(bitmap.width, bitmap.height, MAX_EXPORT_EDGE);
  drawSource(bitmap, size.width, size.height);

  applyCreamPreset(sourceCanvas, resultCanvas, presetStrength);

  const blob = await canvasToBlob(resultCanvas, "image/jpeg", JPEG_QUALITY);
  const nextUrl = URL.createObjectURL(blob);
  const nextPreviewUrl = await createPreviewUrl(resultCanvas);

  URL.revokeObjectURL(item.url);
  if (item.previewUrl !== item.url) URL.revokeObjectURL(item.previewUrl);

  item.blob = blob;
  item.url = nextUrl;
  item.previewUrl = nextPreviewUrl;
  item.outputSize = blob.size;
  item.outputWidth = size.width;
  item.outputHeight = size.height;

  if (item.thumbElement) item.thumbElement.src = nextPreviewUrl;
  if (item.infoElement) item.infoElement.textContent = getBatchItemInfoText(item);

  if (options.updatePreview !== false && item === selectedItem) {
    downloadLink.href = item.url;
    downloadLink.download = item.name;
    resultPreview.src = item.previewUrl;
    sourcePreview.src = item.sourcePreviewUrl || "";
  }
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
  await saveBatchItems([item]);
}

async function saveBatchItems(items) {
  const validItems = items.filter(Boolean);
  if (!validItems.length) return;

  const files = validItems.map((item) => new File([item.blob], item.name, { type: item.type }));

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

  for (const item of validItems) {
    triggerDownload(item);
    await wait(350);
  }
}

function updateSelectedSaveState() {
  const selectedCount = batchItems.filter((item) => item.selected).length;
  saveSelectedButton.disabled = selectedCount === 0;
  saveSelectedButton.textContent = selectedCount > 0 ? `保存已选结果（${selectedCount}）` : "保存已选结果";
}

function openChangelog() {
  if (!changelogList.dataset.rendered) {
    changelogList.textContent = "";
    for (const [version, text] of CHANGELOG.slice().reverse()) {
      const item = document.createElement("article");
      item.className = "changelog-item";

      const title = document.createElement("div");
      title.className = "changelog-version";
      title.textContent = version;

      const body = document.createElement("p");
      body.className = "changelog-text";
      body.textContent = text;

      item.append(title, body);
      changelogList.append(item);
    }
    changelogList.dataset.rendered = "true";
  }

  changelogDialog.hidden = false;
}

function closeChangelog() {
  changelogDialog.hidden = true;
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
  return Boolean(WebAssembly);
}

function isIOSBrowser() {
  const ua = navigator.userAgent || "";
  const iOSDevice = /iPad|iPhone|iPod/.test(ua);
  const iPadOSDesktopMode = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return iOSDevice || iPadOSDesktopMode;
}

async function loadFfmpeg() {
  if (ffmpegInstance) return ffmpegInstance;

  setStatus("正在加载视频引擎模块 1 / 3...");
  const { FFmpeg } = await importWithStatus(
    "https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.15/+esm",
    "视频引擎模块 1 / 3"
  );

  setStatus("正在加载视频工具模块 2 / 3...");
  const helpers = await importWithStatus(
    "https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.2/+esm",
    "视频工具模块 2 / 3"
  );

  const ffmpeg = new FFmpeg();
  ffmpegHelpers = helpers;
  ffmpeg.on("log", ({ message }) => console.log(message));

  const baseURL = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd";
  const coreURL = await downloadToBlobUrl(`${baseURL}/ffmpeg-core.js`, "text/javascript", "视频引擎 JS 3 / 3", 0, 15);
  const wasmURL = await downloadToBlobUrl(`${baseURL}/ffmpeg-core.wasm`, "application/wasm", "视频引擎 WASM 3 / 3", 15, 100);

  await initializeFfmpegWithStatus(ffmpeg, {
    coreURL,
    wasmURL,
  });

  ffmpegInstance = ffmpeg;
  return ffmpegInstance;
}

async function initializeFfmpegWithStatus(ffmpeg, config) {
  const startedAt = Date.now();
  setStatus("视频引擎下载完成，正在初始化，可能需要 10-30 秒...");

  const heartbeat = window.setInterval(() => {
    const seconds = Math.round((Date.now() - startedAt) / 1000);
    setStatus(`视频引擎正在初始化，已等待 ${seconds} 秒，请保持网页打开...`);
  }, 5000);

  try {
    await Promise.race([
      ffmpeg.load(config),
      wait(60000).then(() => {
        throw new Error("视频引擎初始化超时。iPhone Safari 可能内存不足或阻止了 WASM 初始化，请刷新后重试，或先处理更短的视频。");
      }),
    ]);
    setStatus("视频引擎初始化完成，正在准备调色...");
  } finally {
    window.clearInterval(heartbeat);
  }
}

async function importWithStatus(url, label) {
  const reminder = window.setTimeout(() => {
    setStatus(`${label} 仍在加载中，请保持网页打开...`);
  }, 8000);

  try {
    return await Promise.race([
      import(url),
      wait(45000).then(() => {
        throw new Error(`${label} 加载超时，请检查网络后刷新重试。`);
      }),
    ]);
  } finally {
    window.clearTimeout(reminder);
  }
}

async function downloadToBlobUrl(url, mimeType, label, startPercent, endPercent) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${label} 下载失败，请检查网络后重试。`);

  const total = Number(response.headers.get("content-length")) || 0;
  const reader = response.body && response.body.getReader ? response.body.getReader() : null;

  if (!reader) {
    setStatus(`正在下载${label}...`);
    const blob = await response.blob();
    setStatus(`${label} 下载完成：${formatBytes(blob.size)}`);
    return URL.createObjectURL(new Blob([blob], { type: mimeType }));
  }

  const chunks = [];
  let loaded = 0;
  let lastUpdate = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    chunks.push(value);
    loaded += value.byteLength;

    const now = performance.now();
    if (now - lastUpdate > 160) {
      const percent = total
        ? startPercent + (loaded / total) * (endPercent - startPercent)
        : null;
      const loadedText = total
        ? `${formatBytes(loaded)} / ${formatBytes(total)}`
        : `${formatBytes(loaded)}`;
      const percentText = percent === null ? "" : `，总进度 ${Math.min(99, Math.round(percent))}%`;
      setStatus(`正在下载${label}：${loadedText}${percentText}`);
      lastUpdate = now;
    }
  }

  const blob = new Blob(chunks, { type: mimeType });
  setStatus(`${label} 下载完成：${formatBytes(blob.size)}`);
  return URL.createObjectURL(blob);
}

async function readVideoMetadata(file) {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.src = url;
  video.preload = "metadata";
  video.muted = true;
  video.playsInline = true;

  try {
    await waitForVideoMetadata(video);
    return {
      width: video.videoWidth,
      height: video.videoHeight,
      duration: video.duration,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function createVideoPosterUrl(file) {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.src = url;
  video.preload = "auto";
  video.muted = true;
  video.playsInline = true;

  try {
    await waitForVideoMetadata(video);
    const size = fitSize(video.videoWidth, video.videoHeight, MAX_PREVIEW_EDGE);
    sourceCanvas.width = size.width;
    sourceCanvas.height = size.height;
    resultCanvas.width = size.width;
    resultCanvas.height = size.height;

    await seekVideo(video, getVideoStartTime(video));
    const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true });
    drawVideoFrame(video, sourceContext, size);
    return await createPreviewUrl(resultCanvas);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function getVideoInputExtension(fileName) {
  const match = fileName.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : "mov";
}

function createVideoFilter(strength) {
  const amount = clamp01(strength);
  if (amount <= 0.001) return "null";

  const preset = COLOR_PRESETS[activePresetId] || COLOR_PRESETS.cream_product;
  if (preset.mode === "config" || preset.mode === "food") {
    const base = preset.base;
    const brightness = ((base.exposure_factor - 1) * 0.65 * amount).toFixed(4);
    const contrast = (1 + (base.contrast_factor - 1) * amount).toFixed(4);
    const saturation = (1 + (base.saturation_factor - 1) * amount).toFixed(4);
    const gamma = (1 + (base.gamma - 1) * amount).toFixed(4);
    const rs = ((base.red_multiplier - 1) * 0.8 * amount).toFixed(4);
    const gs = ((base.green_multiplier - 1) * 0.8 * amount).toFixed(4);
    const bs = ((base.blue_multiplier - 1) * 0.8 * amount).toFixed(4);
    return [
      `eq=brightness=${brightness}:contrast=${contrast}:saturation=${saturation}:gamma=${gamma}`,
      `colorbalance=rs=${rs}:gs=${gs}:bs=${bs}:rm=${rs}:gm=${gs}:bm=${bs}`,
    ].join(",");
  }

  const brightness = (0.035 * amount).toFixed(4);
  const contrast = (1 + (0.96 - 1) * amount).toFixed(4);
  const saturation = (1 + (0.94 - 1) * amount).toFixed(4);
  const gamma = (1 + (0.98 - 1) * amount).toFixed(4);
  const rs = (0.025 * amount).toFixed(4);
  const gs = (-0.004 * amount).toFixed(4);
  const bs = (-0.018 * amount).toFixed(4);
  const rm = (0.012 * amount).toFixed(4);
  const gm = (-0.002 * amount).toFixed(4);
  const bm = (-0.01 * amount).toFixed(4);
  const mid1 = (0.25 + 0.03 * amount).toFixed(4);
  const mid2 = (0.65 + 0.03 * amount).toFixed(4);
  const high = (0.9 - 0.02 * amount).toFixed(4);
  const white = (1 - 0.03 * amount).toFixed(4);

  return [
    `eq=brightness=${brightness}:contrast=${contrast}:saturation=${saturation}:gamma=${gamma}`,
    `colorbalance=rs=${rs}:gs=${gs}:bs=${bs}:rm=${rm}:gm=${gm}:bm=${bm}`,
    `curves=all='0/0 0.25/${mid1} 0.65/${mid2} 0.9/${high} 1/${white}'`,
  ].join(",");
}

async function safeDeleteFfmpegFile(ffmpeg, fileName) {
  try {
    await ffmpeg.deleteFile(fileName);
  } catch (error) {
    console.warn("FFmpeg cleanup skipped:", fileName, error);
  }
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

function drawVideoFrame(video, sourceContext, size) {
  sourceContext.drawImage(video, 0, 0, size.width, size.height);
  applyCreamPreset(sourceCanvas, resultCanvas, presetStrength);
}

function getVideoStartTime(video) {
  if (!Number.isFinite(video.duration) || video.duration <= 0.2) return 0;
  return Math.min(0.08, video.duration / 10);
}

function seekVideo(video, time) {
  return new Promise((resolve, reject) => {
    const target = Math.min(Math.max(0, time), Math.max(0, (video.duration || 0) - 0.05));

    if (Math.abs(video.currentTime - target) < 0.02 && video.readyState >= 2) {
      resolve();
      return;
    }

    const timeout = window.setTimeout(() => resolve(), 1200);
    video.addEventListener("seeked", () => {
      window.clearTimeout(timeout);
      resolve();
    }, { once: true });
    video.addEventListener("error", () => {
      window.clearTimeout(timeout);
      reject(new Error("视频定位失败，请换一个 MOV 或 MP4 再试。"));
    }, { once: true });
    video.currentTime = target;
  });
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

  const sourceContext = source.getContext("2d", { willReadFrequently: true });
  const targetContext = target.getContext("2d", { willReadFrequently: true });
  const imageData = sourceContext.getImageData(0, 0, source.width, source.height);
  const data = imageData.data;
  const presetAmount = clamp01(strengthAmount);

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

    const strength = mix(0.82, 0.52, neutralProtection) * presetAmount;
    r = mix(originalR, r, strength);
    g = mix(originalG, g, strength);
    b = mix(originalB, b, strength);

    const dither = (deterministicDither(x, y) / 255) * presetAmount;
    data[i] = toByte(r + dither);
    data[i + 1] = toByte(g + dither);
    data[i + 2] = toByte(b + dither);
  }

  targetContext.putImageData(imageData, 0, 0);
}

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
function applySubtleSharpen(imageData, width, height, amount) {
  const strength = clampRange(amount, 0, 0.5);
  if (strength <= 0.001 || width < 3 || height < 3) return;

  const data = imageData.data;
  const source = new Uint8ClampedArray(data);

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = (y * width + x) * 4;

      for (let channel = 0; channel < 3; channel += 1) {
        const center = source[index + channel];
        const sharpened =
          center * 5 -
          source[index - 4 + channel] -
          source[index + 4 + channel] -
          source[index - width * 4 + channel] -
          source[index + width * 4 + channel];

        data[index + channel] = toByte((center + (sharpened - center) * strength) / 255);
      }
    }
  }
}

function analyzeImageStats(data) {
  const histogram = new Array(256).fill(0);
  const pixelCount = data.length / 4;
  const pixelStep = Math.max(1, Math.floor(pixelCount / 120000));
  const byteStep = pixelStep * 4;
  let samples = 0;
  let whiteSamples = 0;
  let warmSamples = 0;

  for (let i = 0; i < data.length; i += byteStep) {
    const r = data[i] / 255;
    const g = data[i + 1] / 255;
    const b = data[i + 2] / 255;
    const luma = clamp01(r * 0.299 + g * 0.587 + b * 0.114);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const colorfulness = max - min;

    histogram[Math.round(luma * 255)] += 1;
    samples += 1;

    if (luma > 0.82 && colorfulness < 0.16) whiteSamples += 1;
    if (r > b + 0.035 && r >= g - 0.02 && luma > 0.18 && luma < 0.86) warmSamples += 1;
  }

  return {
    p50: histogramPercentile(histogram, samples, 0.5),
    p90: histogramPercentile(histogram, samples, 0.9),
    p95: histogramPercentile(histogram, samples, 0.95),
    p99: histogramPercentile(histogram, samples, 0.99),
    whiteRatio: samples ? whiteSamples / samples : 0,
    warmRatio: samples ? warmSamples / samples : 0,
  };
}

function histogramPercentile(histogram, total, percentile) {
  if (!total) return 0.5;

  const target = total * percentile;
  let count = 0;

  for (let i = 0; i < histogram.length; i += 1) {
    count += histogram[i];
    if (count >= target) return i / 255;
  }

  return 1;
}

function createAdaptivePresetSettings(preset, stats) {
  const adaptive = preset.adaptive;
  const base = preset.base;
  const medianRatio = adaptive.targetMedian / Math.max(0.08, stats.p50);
  const highRatio = adaptive.targetP95 / Math.max(0.12, stats.p95);
  const whitePressure = smoothstep(0.025, 0.12, stats.whiteRatio);
  const highlightPressure = smoothstep(0.78, 0.96, stats.p95);
  const p99Pressure = smoothstep(adaptive.targetP99, 0.99, stats.p99);
  let exposureAdjust = medianRatio * 0.72 + highRatio * 0.28;

  exposureAdjust -= whitePressure * 0.055;
  exposureAdjust -= highlightPressure * 0.045;
  exposureAdjust -= p99Pressure * 0.035;
  exposureAdjust = clampRange(exposureAdjust, adaptive.maxDarken, adaptive.maxBrighten);

  const highlightStart = clampRange(
    preset.highlight_protection.start - highlightPressure * 0.07 - whitePressure * 0.05 - p99Pressure * 0.04,
    0.62,
    preset.highlight_protection.start,
  );
  const highlightCompression = clampRange(
    preset.highlight_protection.compression - highlightPressure * 0.12 - whitePressure * 0.12 - p99Pressure * 0.08,
    0.26,
    preset.highlight_protection.compression,
  );

  return {
    exposureFactor: base.exposure_factor * exposureAdjust,
    blackLiftBoost: stats.p50 < 0.28 ? 0.004 : 0,
    highlightProtection: {
      enabled: true,
      start: highlightStart,
      compression: highlightCompression,
    },
  };
}

function applyLumaGuard(originalR, originalG, originalB, r, g, b, config) {
  const originalLuma = getLuma(originalR, originalG, originalB);
  const targetLuma = getLuma(r, g, b);
  const highlightMask = smoothstep(config.highlightStart, 1, originalLuma);
  const maxDrop = mix(config.maxMidDrop, config.maxHighlightDrop, highlightMask);
  const minRatio = mix(config.minMidRatio, config.minHighlightRatio, highlightMask);
  const minLuma = Math.max(originalLuma - maxDrop, originalLuma * minRatio);
  let guardedLuma = Math.max(targetLuma, minLuma);

  if (highlightMask > 0) {
    const maxLuma = Math.min(config.maxHighlightLuma, originalLuma + config.maxHighlightRise);
    guardedLuma = Math.min(guardedLuma, maxLuma);
  }

  return shiftRgbToLuma(r, g, b, guardedLuma);
}

function shiftRgbToLuma(r, g, b, targetLuma) {
  const currentLuma = getLuma(r, g, b);
  const delta = clamp01(targetLuma) - currentLuma;
  return [
    clamp01(r + delta),
    clamp01(g + delta),
    clamp01(b + delta),
  ];
}

function getLuma(r, g, b) {
  return clamp01(r * 0.299 + g * 0.587 + b * 0.114);
}

function applyToneCurve(value, points) {
  const v = clamp01(value);
  if (!points || points.length < 2) return v;

  for (let i = 0; i < points.length - 1; i += 1) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    if (v >= x0 && v <= x1) {
      const t = (v - x0) / Math.max(0.0001, x1 - x0);
      return clamp01(mix(y0, y1, t));
    }
  }

  return clamp01(points[points.length - 1][1]);
}

function protectHighlight(value, config) {
  const v = clamp01(value);
  if (v <= config.start) return v;
  return clamp01(config.start + (v - config.start) * config.compression);
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

function hueRangeMask(hue, start, end) {
  const normalizedHue = normalizeHue(hue);
  const normalizedStart = normalizeHue(start);
  const normalizedEnd = normalizeHue(end);

  if (normalizedStart <= normalizedEnd) {
    return normalizedHue >= normalizedStart && normalizedHue <= normalizedEnd ? 1 : 0;
  }

  return normalizedHue >= normalizedStart || normalizedHue <= normalizedEnd ? 1 : 0;
}

function normalizeHue(hue) {
  return ((hue % 360) + 360) % 360;
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

  const blob = await canvasToBlob(previewCanvas, "image/jpeg", 0.96);
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
  saveSelectedButton.disabled = true;
  saveSelectedButton.textContent = "保存已选结果";
  selectedItem = null;
  compareButton.disabled = true;
  reprocessButton.disabled = true;
  reprocessButton.classList.remove("is-processing");
  reprocessButton.textContent = "重新用当前强度处理";
  applyAllButton.disabled = true;
  applyAllButton.classList.remove("is-processing");
  applyAllButton.textContent = "应用到全部照片";
  currentIndexBadge.textContent = "未选择";
  prevItemButton.disabled = true;
  nextItemButton.disabled = true;
  compareButton.textContent = "按住看原图";
  sourceCard.classList.remove("has-image");
  resultCard.classList.remove("has-image");
  resultCard.classList.remove("has-video");
  sourcePreview.removeAttribute("src");
  resultPreview.removeAttribute("src");
  videoPreview.removeAttribute("src");
  videoPreview.removeAttribute("poster");
  batchSection.classList.remove("has-results");
  batchResults.textContent = "";
  batchCount.textContent = "0 张";

  batchItems.forEach((item) => {
    URL.revokeObjectURL(item.url);
    if (item.previewUrl !== item.url) URL.revokeObjectURL(item.previewUrl);
    if (item.sourcePreviewUrl && item.sourcePreviewUrl !== item.previewUrl && item.sourcePreviewUrl !== item.url) {
      URL.revokeObjectURL(item.sourcePreviewUrl);
    }
    if (item.posterUrl && item.posterUrl !== item.url && item.posterUrl !== item.previewUrl) {
      URL.revokeObjectURL(item.posterUrl);
    }
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

function clampRange(value, min, max) {
  return Math.min(max, Math.max(min, value));
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
