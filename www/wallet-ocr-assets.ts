import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import type { Plugin } from "vite";

/** Build only native assets. All OCR URLs resolve inside the packaged app. */
export function walletOcrAssets(native: boolean): Plugin {
  const require = createRequire(import.meta.url);
  return {
    name: "wallet-offline-ocr",
    apply: "build",
    generateBundle() {
      if (!native || this.environment.name !== "client") return;
      const emit = (source: string, name: string) =>
        this.emitFile({
          type: "asset",
          fileName: `wallet-ocr/${name}`,
          source: readFileSync(source),
        });
      const tesseract = dirname(require.resolve("tesseract.js/package.json"));
      const coreRequire = createRequire(join(tesseract, "package.json"));
      const core = dirname(coreRequire.resolve("tesseract.js-core/package.json"));
      emit(join(tesseract, "dist/worker.min.js"), "worker.min.js");
      emit(join(tesseract, "dist/worker.min.js.LICENSE.txt"), "worker.LICENSE.txt");
      emit(join(core, "LICENSE"), "core/LICENSE");
      for (const file of readdirSync(core)) {
        if (file.startsWith("tesseract-core") && /\.(?:wasm|js)$/.test(file))
          emit(join(core, file), `core/${file}`);
      }
      // Barcode reading (PDF417 on IDs, QR codes), with its license.
      // zxing-wasm doesn't export its package.json, so find it from the wasm.
      const zxingReader = require.resolve("zxing-wasm/reader/zxing_reader.wasm");
      emit(zxingReader, "zxing_reader.wasm");
      emit(join(dirname(zxingReader), "../../LICENSE"), "licenses/zxing-wasm.LICENSE");
      for (const language of ["eng", "fra", "spa", "por", "swa", "ara"]) {
        const directory = dirname(require.resolve(`@tesseract.js-data/${language}/package.json`));
        emit(
          join(directory, "4.0.0", `${language}.traineddata.gz`),
          `models/${language}.traineddata.gz`,
        );
        emit(join(directory, "package.json"), `licenses/${language}.package.json`);
      }
    },
  };
}
