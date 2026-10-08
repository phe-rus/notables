import type { Worker } from "tesseract.js";
import type { CardKind } from "../model/wallet-model";
import { readCardCodes } from "./card-codes";
import { enhanceForReading } from "./card-image";
import { readMrz } from "./mrz";

export interface CardSuggestions {
  kind: CardKind;
  meter: string;
  account: string;
  displayName: string;
  holder: string;
  number: string;
  expiry: string;
  issuer: string;
  puk: string;
}

/** Conservative suggestions only. Confirmation in review is always required. */
export function suggestCardFields(text: string): CardSuggestions {
  // A passport or ID card's machine-readable zone beats anything else on it.
  const mrz = readMrz(text);
  if (mrz) {
    const holder = `${mrz.givenNames} ${mrz.surname}`
      .trim()
      .toLowerCase()
      .replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());
    return {
      kind: mrz.kind,
      meter: "",
      account: "",
      displayName: holder || mrz.country,
      holder,
      number: mrz.number,
      expiry: mrz.expiry,
      issuer: mrz.country,
      puk: "",
    };
  }
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const number =
    text.match(/(?<!\d)(?:\d{4}[ -]){3}\d{4}(?!\d)|(?<!\d)\d{12,19}(?!\d)/)?.[0].trim() ?? "";
  const expiry = text.match(/\b(?:0[1-9]|1[0-2])\s*\/\s*\d{2}(?:\d{2})?\b/)?.[0] ?? "";
  const holder =
    lines
      .find((line) => /^(?:cardholder|holder|name|titulaire|titular|jina)\s*:/i.test(line))
      ?.replace(/^[^:]+:\s*/, "")
      .slice(0, 4096) ?? "";
  const electricity = /\b(?:umeme|yaka|electricity|electric|meter)\b/i.test(text);
  const labeled = (label: string) =>
    lines
      .find((line) => new RegExp(`^(?:${label})\\s*(?:number|no\\.?)?\\s*[:#-]`, "i").test(line))
      ?.replace(/^[^:#-]+[:#-]\s*/, "")
      .trim()
      .slice(0, 4096) ?? "";
  // A SIM card's ICCID: 19 or 20 digits starting with 89, often printed in groups.
  const iccid = electricity
    ? ""
    : (text.replace(/[ -]/g, "").match(/(?<!\d)89\d{17,18}(?!\d)/)?.[0] ?? "");
  return {
    kind: electricity ? "electricity" : iccid ? "sim" : number && expiry ? "bank" : "other",
    meter: labeled("meter"),
    account: iccid || labeled("account|customer"),
    displayName: lines[0]?.slice(0, 200) ?? "",
    holder,
    number: electricity || iccid ? "" : number,
    expiry: electricity ? "" : expiry,
    issuer: /\bumeme\b/i.test(text) ? "Umeme" : "",
    // PUK1 is the code that unlocks a blocked SIM; the holder card prints it.
    puk: iccid ? (text.match(/\bPUK\s*1?\s*[:.]?\s*(\d{8})\b/i)?.[1] ?? "") : "",
  };
}

const languages = { en: "eng", fr: "fra", es: "spa", pt: "por", sw: "swa", ar: "ara" };
let active: (() => void) | null = null;

export function cancelCardRecognition() {
  active?.();
}

/** Own exactly one job. No engine default can fetch an asset from a CDN. */
export function recognizeCard(
  canvas: HTMLCanvasElement,
  locale: keyof typeof languages,
  progress: (value: number) => void,
) {
  cancelCardRecognition();
  let worker: Worker | null = null;
  let image: HTMLCanvasElement | null = canvas;
  let cancelled = false;
  let rejectJob: (error: Error) => void = () => {};
  const cancel = () => {
    cancelled = true;
    if (image) {
      image.width = 0;
      image.height = 0;
      image = null;
    }
    void worker?.terminate();
    rejectJob(new Error("cancelled"));
  };
  active = cancel;
  const timer = window.setTimeout(cancel, 60_000);
  const result = new Promise<{ text: string; confidence: number; suggestions: CardSuggestions }>(
    (resolve, reject) => {
      rejectJob = reject;
      void (async () => {
        try {
          const { createWorker } = await import("tesseract.js");
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
          // Grayscale, stretched contrast and enough pixels for small print.
          image = enhanceForReading(image);
          // Barcodes often carry what the print says, more reliably (PDF417 on IDs).
          const codes = await readCardCodes(image).catch(() => []);
          if (cancelled || !image) return;
          const { data } = await loaded.recognize(image);
          const text = [data.text, ...codes].join("\n");
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
        }
      })();
    },
  ).finally(() => {
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
