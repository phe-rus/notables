import { invoke } from "@tauri-apps/api/core";
import type { Worker } from "tesseract.js";
import { devicePlatform } from "../../../platform/device-platform";
import { isTauri } from "../../../platform/runtime";
import { readCardPalette } from "./card-colors";
import { suggestCardFields } from "./card-fields";

export interface CardReading {
  text: string;
  confidence: number;
  suggestions: ReturnType<typeof suggestCardFields>;
}

/** Useful identifiers outweigh a confident reading of unrelated background words. */
export function cardReadingStrength(reading: CardReading) {
  const fields = reading.suggestions;
  const identifiers = [fields.number, fields.meter, fields.account, fields.puk, fields.cvv].filter(
    Boolean,
  ).length;
  const details = [fields.holder, fields.expiry].filter(Boolean).length;
  return (
    ((identifiers * (fields.numberUncertain ? 60 : 150) +
      details * 15 +
      (fields.kind === "other" ? 0 : 30)) *
      Math.max(0, Math.min(100, reading.confidence))) /
    100
  );
}

/** A session owns one engine, one frame at a time, and no persistent images. */
export function createCardReader(locale: string) {
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
      let reading: { text: string; confidence: number } | undefined;
      if (native) {
        try {
          reading = await invoke("plugin:card-reader|recognize", {
            image: canvas.toDataURL("image/jpeg", 0.9).split(",")[1],
          });
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
      stopped = true;
      if (native) void invoke("plugin:card-reader|cancel").catch(() => {});
      void worker?.then((engine) => engine.terminate()).catch(() => {});
    },
  };
}

/** Do not accept a card until independent frames agree on its useful details. */
export function createCardStability(back = false) {
  let previous = "";
  return (reading: CardReading) => {
    const fields = reading.suggestions;
    const identifier =
      fields.meter || fields.account || fields.number || (back ? fields.cvv || fields.puk : "");
    if (
      reading.confidence < 65 ||
      !identifier ||
      fields.numberUncertain ||
      (!back && fields.kind === "other")
    ) {
      previous = "";
      return false;
    }
    const fingerprint = JSON.stringify([
      fields.kind,
      identifier.replace(/[ -]/g, ""),
      fields.expiry,
      fields.holder,
    ]);
    const stable = previous === fingerprint;
    previous = fingerprint;
    return stable;
  };
}
