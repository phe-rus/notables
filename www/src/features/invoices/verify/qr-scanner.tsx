import { HIDDEN_MARK_PREFIX } from "@notables/core";
import jsQR from "jsqr";
import { useEffect, useRef, useState } from "react";

interface DetectorLike {
  detect(source: CanvasImageSource): Promise<Array<{ rawValue: string }>>;
}
type DetectorConstructor = new (options: { formats: string[] }) => DetectorLike;

/** The platform's QR detector where there is one (Chromium, Safari). */
function nativeDetector(): DetectorLike | null {
  const Detector = (window as unknown as { BarcodeDetector?: DetectorConstructor }).BarcodeDetector;
  try {
    return Detector ? new Detector({ formats: ["qr_code"] }) : null;
  } catch {
    return null;
  }
}

/** Reads a QR code from a canvas, natively or with jsQR. */
async function readCode(canvas: HTMLCanvasElement, detector: DetectorLike | null) {
  if (detector) {
    const found = await detector.detect(canvas).catch(() => []);
    // A document also carries its faint hidden mark; that's checked separately.
    const visible = found.find((code) => !code.rawValue.startsWith(HIDDEN_MARK_PREFIX));
    if (visible) return visible.rawValue;
  }
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  const image = withoutHiddenInk(context.getImageData(0, 0, canvas.width, canvas.height));
  return (
    jsQR(image.data, image.width, image.height, { inversionAttempts: "dontInvert" })?.data ?? null
  );
}

/**
 * The picture as the red channel alone. Pale yellow is as bright as white
 * in red, so the hidden mark disappears and only the black code remains.
 */
function withoutHiddenInk(image: ImageData): ImageData {
  const { data } = image;
  for (let index = 0; index < data.length; index += 4) {
    const red = data[index] ?? 0;
    data[index + 1] = red;
    data[index + 2] = red;
  }
  return image;
}

/** Decodes a QR code in a photo or screenshot. */
export async function readCodeFromImage(file: Blob): Promise<string | null> {
  const detector = nativeDetector();
  const bitmap = await createImageBitmap(file);
  // The seal's code is dense and readers are fussy about scale and clutter,
  // so a whole-page photo is tried in parts (the code sits low on the page)
  // and at a few widths until one reads.
  const regions: Array<[number, number, number, number]> = [
    [0, 0, 1, 1],
    [0, 0.5, 1, 0.5],
    [0.4, 0.55, 0.6, 0.45],
    [0.5, 0, 0.5, 1],
    [0, 0, 1, 0.5],
  ];
  for (const width of [1600, 1200, 2000, 1000]) {
    for (const [x, y, w, h] of regions) {
      const canvas = window.document.createElement("canvas");
      const scale = Math.min(1, width / (bitmap.width * w));
      canvas.width = Math.round(bitmap.width * w * scale);
      canvas.height = Math.round(bitmap.height * h * scale);
      canvas
        .getContext("2d", { willReadFrequently: true })
        ?.drawImage(
          bitmap,
          bitmap.width * x,
          bitmap.height * y,
          bitmap.width * w,
          bitmap.height * h,
          0,
          0,
          canvas.width,
          canvas.height,
        );
      const text = await readCode(canvas, detector);
      if (text) return text;
    }
  }
  return null;
}

/** Reads a camera frame or photo: the visible code, or something else such as a hidden mark. */
export type FrameReader = (canvas: HTMLCanvasElement) => Promise<string | null> | string | null;

/** A picture, scaled down to at most `limit` pixels across, on a canvas. */
export async function imageCanvas(file: Blob, limit: number): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, limit / Math.max(bitmap.width, bitmap.height));
  const canvas = window.document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas
    .getContext("2d", { willReadFrequently: true })
    ?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/**
 * The camera, looking for a QR code. Reports the first one it reads, or a
 * reason it can't scan (no camera, permission refused). A custom reader
 * can look for something else in each frame.
 */
export function QrScanner({
  onScan,
  onUnavailable,
  read,
  hint,
}: {
  onScan: (text: string) => void;
  onUnavailable: (reason: string) => void;
  read?: FrameReader;
  hint?: string;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const canvas = window.document.createElement("canvas");
    const detector = nativeDetector();

    const tick = async () => {
      const element = video.current;
      if (stopped || !element) return;
      if (element.readyState >= 2 && element.videoWidth) {
        canvas.width = element.videoWidth;
        canvas.height = element.videoHeight;
        canvas.getContext("2d", { willReadFrequently: true })?.drawImage(element, 0, 0);
        const text = read ? await read(canvas) : await readCode(canvas, detector);
        if (text && !stopped) {
          onScan(text);
          return;
        }
      }
      timer = setTimeout(tick, 180);
    };

    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((media) => {
        if (stopped) {
          for (const track of media.getTracks()) track.stop();
          return;
        }
        stream = media;
        if (video.current) {
          video.current.srcObject = media;
          void video.current.play();
        }
        setReady(true);
        void tick();
      })
      .catch(() =>
        onUnavailable("The camera isn’t available. Choose a photo of the code instead."),
      );
    if (!navigator.mediaDevices) onUnavailable("This device has no camera access here.");

    return () => {
      stopped = true;
      clearTimeout(timer);
      for (const track of stream?.getTracks() ?? []) track.stop();
    };
  }, [onScan, onUnavailable, read]);

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-[24px] bg-black">
      <video ref={video} muted playsInline className="size-full object-cover" />
      <div className="pointer-events-none absolute inset-[18%] rounded-[22px] border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
      {hint && ready && (
        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pt-8 pb-4 text-center text-[13px] text-white">
          {hint}
        </span>
      )}
      {!ready && (
        <span className="absolute inset-0 flex items-center justify-center text-[14px] text-white/70">
          Starting camera…
        </span>
      )}
    </div>
  );
}
