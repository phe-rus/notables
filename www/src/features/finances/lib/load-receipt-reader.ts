import type { ReceiptReaderTools } from "@/features/finances/model/types";
import { currentLanguage } from "@/i18n/i18n";

export async function loadReceiptReader(): Promise<ReceiptReaderTools<HTMLCanvasElement>> {
  const { prepareCardImage } = await import("@/features/wallet/lib/card-recognition");
  const { createCardReader } = await import("@/features/wallet/lib/card-reader");
  return {
    prepare: prepareCardImage,
    createReader: () => createCardReader(currentLanguage()),
  };
}
