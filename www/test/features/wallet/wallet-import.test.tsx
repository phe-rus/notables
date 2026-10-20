import { expect, spyOn, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import * as recognition from "@/features/wallet/lib/card-recognition";
import { walletService } from "@/features/wallet/lib/wallet-service";
import type { WalletStatus } from "@/features/wallet/model/wallet-model";
import {
  cancelWalletCapture,
  clearWallet,
  importWalletImage,
  refreshWallet,
  showWallet,
  useWallet,
} from "@/features/wallet/store/wallet-store";

function Snapshot() {
  return <pre>{JSON.stringify(useWallet())}</pre>;
}

const status: WalletStatus = {
  initialized: true,
  secureStoreAvailable: true,
  protected: true,
  locked: false,
  systemAuthAvailable: true,
  generation: 1,
  formatVersion: 1,
};

async function withVisibleDocument(work: () => Promise<void>) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { visibilityState: "visible", hasFocus: () => true },
  });
  try {
    await work();
  } finally {
    clearWallet();
    if (previous) Object.defineProperty(globalThis, "document", previous);
    else Reflect.deleteProperty(globalThis, "document");
  }
}

test.each(["cancel", "clear", "late-error"])(
  "image import cannot restore a cancelled session after %s during status reconciliation",
  async (mode) =>
    withVisibleDocument(async () => {
      const pending = Promise.withResolvers<WalletStatus>();
      const statusSpy = spyOn(walletService, "status").mockResolvedValue(status);
      const listSpy = spyOn(walletService, "list").mockResolvedValue({
        cards: [],
        nextCursor: null,
      });
      try {
        await refreshWallet();
        statusSpy.mockImplementationOnce(() => pending.promise);
        const importing = importWalletImage(new File([], "synthetic.png", { type: "image/png" }));
        if (mode === "clear") clearWallet();
        else {
          cancelWalletCapture();
          showWallet("home");
        }
        if (mode === "late-error") pending.reject(new Error("unavailable"));
        else pending.resolve(status);
        await importing;
        const snapshot = renderToStaticMarkup(<Snapshot />);
        expect(snapshot).toContain("&quot;view&quot;:&quot;home&quot;");
        expect(snapshot).toContain("&quot;captureError&quot;:false");
        expect(snapshot).toContain("&quot;error&quot;:null");
        if (mode === "clear") expect(snapshot).toContain("&quot;status&quot;:null");
        expect(listSpy).toHaveBeenCalledTimes(1);
      } finally {
        statusSpy.mockRestore();
        listSpy.mockRestore();
      }
    }),
);

test("a decoded image arriving after cancellation is cleared without recognition", async () =>
  withVisibleDocument(async () => {
    // No pixel operations run: only the abandoned canvas dimensions are used.
    const canvas = { width: 800, height: 500 } as HTMLCanvasElement;
    const decoded = Promise.withResolvers<HTMLCanvasElement>();
    const started = Promise.withResolvers<void>();
    const statusSpy = spyOn(walletService, "status").mockResolvedValue(status);
    const listSpy = spyOn(walletService, "list").mockResolvedValue({ cards: [], nextCursor: null });
    const decodeSpy = spyOn(recognition, "prepareCardImage").mockImplementation(() => {
      started.resolve();
      return decoded.promise;
    });
    const recognizeSpy = spyOn(recognition, "recognizeCard");
    try {
      await refreshWallet();
      const importing = importWalletImage(new File([], "synthetic.png", { type: "image/png" }));
      await started.promise;
      cancelWalletCapture();
      showWallet("home");
      decoded.resolve(canvas);
      await importing;
      expect(canvas.width).toBe(0);
      expect(canvas.height).toBe(0);
      expect(recognizeSpy).not.toHaveBeenCalled();
      expect(renderToStaticMarkup(<Snapshot />)).toContain("&quot;view&quot;:&quot;home&quot;");
    } finally {
      statusSpy.mockRestore();
      listSpy.mockRestore();
      decodeSpy.mockRestore();
      recognizeSpy.mockRestore();
    }
  }));

test("a new picker selection can reconcile access after the picker cleared the old UI", async () =>
  withVisibleDocument(async () => {
    const canvas = { width: 800, height: 500 } as HTMLCanvasElement;
    const text = "UMEME\nMeter No 00123456789";
    const review = { text, confidence: 95, suggestions: recognition.suggestCardFields(text) };
    const statusSpy = spyOn(walletService, "status").mockResolvedValue(status);
    const listSpy = spyOn(walletService, "list").mockResolvedValue({ cards: [], nextCursor: null });
    const decodeSpy = spyOn(recognition, "prepareCardImage").mockResolvedValue(canvas);
    const recognizeSpy = spyOn(recognition, "recognizeCard").mockReturnValue({
      result: Promise.resolve(review),
      cancel: () => {},
    });
    try {
      await refreshWallet();
      clearWallet();
      await importWalletImage(new File([], "synthetic.png", { type: "image/png" }));
      const snapshot = renderToStaticMarkup(<Snapshot />);
      expect(snapshot).toContain("00123456789");
      expect(snapshot).toContain("&quot;view&quot;:&quot;add&quot;");
      expect(snapshot).toContain("&quot;captureError&quot;:false");
      expect(recognizeSpy).toHaveBeenCalledTimes(1);
    } finally {
      statusSpy.mockRestore();
      listSpy.mockRestore();
      decodeSpy.mockRestore();
      recognizeSpy.mockRestore();
    }
  }));
