import type { Worker } from "tesseract.js";
import { devicePlatform } from "@/platform/device-platform";
import { isTauri } from "@/platform/runtime";
import type { CardReader, CardReading, CardText } from "../model/types";
import { readCardPalette } from "./card-colors";
import { suggestCardFields } from "./card-fields";
import { cancelNativeCardReading, readNativeCardText } from "./native-card-reader";

/** A session owns one engine, one frame at a time, and no persistent images. */
export function createCardReader(locale: string): CardReader {
  let stopped = false;
  let worker: Promise<Worker> | null = null;
  let native =
    isTauri() &&
    ["android", "chromeos", "ios"].includes(devicePlatform().os) &&
    locale !== "ar" &&
    locale !== "zh";
  const fallback = () => {
    worker ??= (async () => {
      const { createWorker, PSM } = await import("tesseract.js");
      const languages: Record<string, string> = {
        fr: "fra",
        es: "spa",
        pt: "por",
        sw: "swa",
        ar: "ara",
      };
      const language = languages[locale];
      const engine = await createWorker(language ? `${language}+eng` : "eng", 1, {
        workerPath: new URL("/wallet-ocr/worker.min.js", location.origin).href,
        corePath: new URL("/wallet-ocr/core", location.origin).href,
        langPath: new URL("/wallet-ocr/models", location.origin).href,
        workerBlobURL: false,
        cacheMethod: "none",
      });
      if (stopped) {
        await engine.terminate();
        throw new Error("cancelled");
      }
      await engine.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
      return engine;
    })();
    return worker;
  };
  return {
    async read(canvas: HTMLCanvasElement): Promise<CardReading> {
      if (stopped) throw new Error("cancelled");
      let reading: CardText | undefined;
      if (native) {
        try {
          reading = await readNativeCardText(canvas);
        } catch (error) {
          if (stopped) throw new Error("cancelled");
          // Older installed shells do not expose the native reader yet.
          if (/not found|not registered|unknown plugin/i.test(String(error))) native = false;
          else throw error;
        }
      }
      if (!reading) {
        const engine = await fallback();
        if (stopped) throw new Error("cancelled");
        const { data } = await engine.recognize(canvas);
        reading = { text: data.text, confidence: data.confidence };
      }
      if (stopped) throw new Error("cancelled");
      const text = reading.text.slice(0, 20_000);
      return {
        text,
        confidence: reading.confidence,
        suggestions: { ...suggestCardFields(text), palette: readCardPalette(canvas) },
      };
    },
    stop() {
      if (stopped) return;
      stopped = true;
      if (native) void cancelNativeCardReading().catch(() => {});
      void worker?.then((engine) => engine.terminate()).catch(() => {});
    },
  };
}
