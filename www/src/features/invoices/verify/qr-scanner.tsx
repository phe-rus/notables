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
    const [found] = await detector.detect(canvas).catch(() => []);
    if (found) return found.rawValue;
  }
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  return (
    jsQR(image.data, image.width, image.height, { inversionAttempts: "dontInvert" })?.data ?? null
  );
}

/** Decodes a QR code in a photo or screenshot. */
export async function readCodeFromImage(file: Blob): Promise<string | null> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = window.document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return readCode(canvas, nativeDetector());
}

/**
 * The camera, looking for a QR code. Reports the first one it reads, or a
 * reason it can't scan (no camera, permission refused).
 */
export function QrScanner({
  onScan,
  onUnavailable,
}: {
  onScan: (text: string) => void;
  onUnavailable: (reason: string) => void;
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
        canvas.getContext("2d")?.drawImage(element, 0, 0);
        const text = await readCode(canvas, detector);
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
  }, [onScan, onUnavailable]);

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-[24px] bg-black">
      <video ref={video} muted playsInline className="size-full object-cover" />
      <div className="pointer-events-none absolute inset-[18%] rounded-[22px] border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
      {!ready && (
        <span className="absolute inset-0 flex items-center justify-center text-[14px] text-white/70">
          Starting camera…
        </span>
      )}
    </div>
  );
}
