import type { Worker } from "tesseract.js";
import { cardReadingStrength } from "../model/card-reading-strength";
import type { CardReading } from "../model/types";
import { readCardCodes } from "./card-codes";

export { suggestCardFields } from "./card-fields";

import { suggestCardFields } from "./card-fields";

// Chinese reads with the English model for now: card numbers, dates and
// Latin names come through, and chi_sim would add about 20 MB to the app.
const languages = { en: "eng", fr: "fra", es: "spa", pt: "por", sw: "swa", ar: "ara", zh: "eng" };
let active: (() => void) | null = null;

export function cancelCardRecognition() {
  active?.();
}

/** Own exactly one job. No engine default can fetch an asset from a CDN. */
export function recognizeCard(
  canvas: HTMLCanvasElement,
  locale: keyof typeof languages,
  progress: (value: number) => void,
  mode: "card" | "document" = "card",
) {
  cancelCardRecognition();
  let worker: Worker | null = null;
  let image: HTMLCanvasElement | null = canvas;
  let cancelled = false;
  let stopReader: (() => void) | undefined;
  let rejectJob: (error: Error) => void = () => {};
  const cancel = () => {
    cancelled = true;
    if (image) {
      image.width = 0;
      image.height = 0;
      image = null;
    }
    void worker?.terminate();
    stopReader?.();
    rejectJob(new Error("cancelled"));
  };
  active = cancel;
  const timer = window.setTimeout(cancel, 60_000);
  const result = new Promise<CardReading>((resolve, reject) => {
    rejectJob = reject;
    void (async () => {
      try {
        if (mode === "card") {
          const { createCardReader } = await import("./card-reader");
          if (cancelled || !image) return;
          const reader = createCardReader(locale);
          stopReader = () => reader.stop();
          let reading = await reader.read(image);
          const fields = reading.suggestions;
          if (
            fields.kind === "other" ||
            fields.numberUncertain ||
            (!fields.number && !fields.meter && !fields.account)
          ) {
            for (const angle of [90, 180, 270]) {
              if (cancelled || !image) return;
              const rotated = document.createElement("canvas");
              rotated.width = angle % 180 ? image.height : image.width;
              rotated.height = angle % 180 ? image.width : image.height;
              try {
                const context = rotated.getContext("2d");
                if (!context) continue;
                context.translate(rotated.width / 2, rotated.height / 2);
                context.rotate((angle * Math.PI) / 180);
                context.drawImage(image, -image.width / 2, -image.height / 2);
                const candidate = await reader.read(rotated);
                if (cardReadingStrength(candidate) > cardReadingStrength(reading))
                  reading = candidate;
                const found = reading.suggestions;
                if (
                  reading.confidence >= 75 &&
                  found.kind !== "other" &&
                  !found.numberUncertain &&
                  (found.number || found.meter || found.account)
                )
                  break;
              } finally {
                rotated.width = rotated.height = 0;
              }
            }
          }
          if (cancelled || !image) return;
          const codes = await readCardCodes(image).catch(() => []);
          if (cancelled) return;
          const text = [reading.text, ...codes].join("\n");
          if (!text.trim()) throw new Error("no-readable-details");
          progress(1);
          resolve({
            ...reading,
            text,
            suggestions: { ...suggestCardFields(text), palette: reading.suggestions.palette },
          });
          return;
        }
        const { createWorker, PSM } = await import("tesseract.js");
        if (cancelled) return;
        const language = languages[locale];
        const loaded = await createWorker(language === "eng" ? "eng" : `${language}+eng`, 1, {
          workerPath: new URL("/wallet-ocr/worker.min.js", location.origin).href,
          corePath: new URL("/wallet-ocr/core", location.origin).href,
          langPath: new URL("/wallet-ocr/models", location.origin).href,
          workerBlobURL: false,
          cacheMethod: "none",
          logger: (event) => {
            if (!cancelled && event.status === "recognizing text") progress(event.progress);
          },
          errorHandler: () => reject(new Error("recognition-failed")),
        });
        worker = loaded;
        if (cancelled || !image) {
          await loaded.terminate();
          return;
        }
        await loaded.setParameters({ tessedit_pageseg_mode: PSM.AUTO });
        if (cancelled || !image) return;
        const { data } = await loaded.recognize(image);
        const text = data.text;
        if (!cancelled)
          resolve({
            text: text.slice(0, 20_000),
            confidence: data.confidence,
            suggestions: suggestCardFields(text),
          });
      } catch {
        if (!cancelled) reject(new Error("recognition-failed"));
      } finally {
        if (image) {
          image.width = 0;
          image.height = 0;
          image = null;
        }
        void worker?.terminate();
        stopReader?.();
      }
    })();
  }).finally(() => {
    window.clearTimeout(timer);
    if (active === cancel) active = null;
  });
  return { result, cancel };
}

/** Decode only raster inputs and bound memory before passing pixels to OCR. */
export async function prepareCardImage(file: File): Promise<HTMLCanvasElement> {
  if (
    file.size > 20 * 1024 * 1024 ||
    !["image/png", "image/jpeg", "image/webp"].includes(file.type)
  )
    throw new Error("invalid-image");
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const png = header[0] === 137 && header[1] === 80 && header[2] === 78 && header[3] === 71;
  const jpeg = header[0] === 255 && header[1] === 216 && header[2] === 255;
  const webp =
    String.fromCharCode(...header.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...header.slice(8, 12)) === "WEBP";
  if (!png && !jpeg && !webp) throw new Error("invalid-image");
  const bitmap = await createImageBitmap(file);
  try {
    if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 20_000_000)
      throw new Error("invalid-image");
    const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("invalid-image");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    bitmap.close();
  }
}
