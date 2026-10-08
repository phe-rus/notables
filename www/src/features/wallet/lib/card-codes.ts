/**
 * Reads the barcodes printed on a card: the PDF417 on the back of many
 * national IDs and driving licences, QR codes, and the rest. Like text
 * recognition it runs on the device, with its engine bundled in the app;
 * nothing is fetched from a CDN.
 */
export async function readCardCodes(canvas: HTMLCanvasElement): Promise<string[]> {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context || !canvas.width || !canvas.height) return [];
  const { prepareZXingModule, readBarcodes } = await import("zxing-wasm/reader");
  prepareZXingModule({
    overrides: {
      locateFile: (path: string, prefix: string) =>
        path.endsWith(".wasm")
          ? new URL("/wallet-ocr/zxing_reader.wasm", location.origin).href
          : prefix + path,
    },
  });
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const results = await readBarcodes(image, {
    formats: ["PDF417", "QRCode", "DataMatrix", "Aztec", "Code128"],
    tryHarder: true,
    maxNumberOfSymbols: 4,
  });
  return results.filter((result) => result.isValid && result.text).map((result) => result.text);
}
