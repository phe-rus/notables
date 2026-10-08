/** A physical card's proportions (ISO/IEC 7810 ID-1): the viewfinder's shape. */
export const CARD_ASPECT = 85.6 / 54;

/** The guide sits this far inside the viewfinder; the photo keeps a little beyond it. */
const GUIDE_INSET = 0.04;

/**
 * Asks for the sharpest back camera the device has. Without a resolution,
 * phones often hand a web view 640 by 480: too small to read a card.
 */
export async function openCardCamera(): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: { ideal: "environment" },
      width: { ideal: 3840 },
      height: { ideal: 2160 },
    },
  });
  const [track] = stream.getVideoTracks();
  try {
    // Keep refocusing as the card moves closer; not every camera offers it.
    await track?.applyConstraints({
      advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet],
    });
  } catch {
    // Fixed focus cameras read fine at arm's length.
  }
  return stream;
}

/**
 * The part of the frame inside the card guide. The viewfinder shows the
 * video cropped to a card's shape (object-fit: cover), so this cuts the
 * same region from the full frame: only the card is read, not the table.
 */
export function captureCardFrame(video: HTMLVideoElement): HTMLCanvasElement {
  const width = video.videoWidth;
  const height = video.videoHeight;
  let cropWidth = width;
  let cropHeight = height;
  if (width / height > CARD_ASPECT) cropWidth = height * CARD_ASPECT;
  else cropHeight = width / CARD_ASPECT;
  const x = (width - cropWidth) / 2 + cropWidth * (GUIDE_INSET / 2);
  const y = (height - cropHeight) / 2 + cropHeight * (GUIDE_INSET / 2);
  cropWidth *= 1 - GUIDE_INSET;
  cropHeight *= 1 - GUIDE_INSET;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(cropWidth);
  canvas.height = Math.round(cropHeight);
  canvas
    .getContext("2d")
    ?.drawImage(video, x, y, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** Card text is small; below this width the recognizer misses characters. */
const READING_WIDTH = 1800;
const MAX_WIDTH = 2400;

/**
 * Prepares a picture for text recognition: grayscale, with its contrast
 * stretched so faint print on a colored card stands out, and enlarged
 * when the card fills only part of a small frame.
 */
export function enhanceForReading(source: HTMLCanvasElement): HTMLCanvasElement {
  const scale = Math.min(MAX_WIDTH / source.width, Math.max(1, READING_WIDTH / source.width));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(source.width * scale);
  canvas.height = Math.round(source.height * scale);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return source;
  context.imageSmoothingQuality = "high";
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = image.data;
  const histogram = new Uint32Array(256);
  for (let i = 0; i < pixels.length; i += 4) {
    const gray = Math.round(
      0.299 * (pixels[i] ?? 0) + 0.587 * (pixels[i + 1] ?? 0) + 0.114 * (pixels[i + 2] ?? 0),
    );
    pixels[i] = gray;
    histogram[gray] = (histogram[gray] ?? 0) + 1;
  }
  // Stretch between the 2nd and 98th percentiles, ignoring glare and shadow.
  const total = pixels.length / 4;
  const level = (fraction: number) => {
    let seen = 0;
    for (let g = 0; g < 256; g++) {
      seen += histogram[g] ?? 0;
      if (seen >= total * fraction) return g;
    }
    return 255;
  };
  const low = level(0.02);
  const high = Math.max(low + 1, level(0.98));
  for (let i = 0; i < pixels.length; i += 4) {
    const stretched = Math.min(255, Math.max(0, (((pixels[i] ?? 0) - low) * 255) / (high - low)));
    pixels[i] = pixels[i + 1] = pixels[i + 2] = stretched;
  }
  context.putImageData(image, 0, 0);
  source.width = 0;
  source.height = 0;
  return canvas;
}
