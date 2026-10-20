import { expect, spyOn, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import * as nfc from "@/features/wallet/lib/card-nfc";
import { walletService } from "@/features/wallet/lib/wallet-service";
import {
  mountWallet,
  scanWalletNfc,
  showWallet,
  useWallet,
} from "@/features/wallet/store/wallet-store";

function Snapshot() {
  return <pre>{JSON.stringify(useWallet())}</pre>;
}

test.each(["blur", "background", "expiry"])(
  "NFC system sheet reconciles %s without granting access",
  async (mode) => {
    const oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
    const oldDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
    let poll: (() => void) | undefined;
    const nativeWindow = Object.assign(new EventTarget(), {
      __TAURI_INTERNALS__: {},
      setInterval,
      clearInterval,
      setTimeout,
      clearTimeout,
    });
    const nativeDocument = Object.assign(new EventTarget(), {
      visibilityState: "visible",
      hasFocus: () => true,
    });
    Object.defineProperty(globalThis, "window", { configurable: true, value: nativeWindow });
    Object.defineProperty(globalThis, "document", { configurable: true, value: nativeDocument });
    const status = {
      initialized: true,
      secureStoreAvailable: true,
      protected: true,
      locked: false,
      systemAuthAvailable: true,
      generation: 1,
      formatVersion: 1 as const,
    };
    const statusSpy = spyOn(walletService, "status").mockResolvedValue(status);
    let nativeLocked: ((generation: number) => void) | undefined;
    const listenerSpy = spyOn(walletService, "onLocked").mockImplementation(async (listener) => {
      nativeLocked = listener;
      return () => {};
    });
    const listSpy = spyOn(walletService, "list").mockResolvedValue({ cards: [], nextCursor: null });
    const readSpy = spyOn(nfc, "readWalletNfc").mockImplementation(async () => {
      nativeWindow.dispatchEvent(new Event("blur"));
      nativeLocked?.(2);
      statusSpy.mockResolvedValue({ ...status, locked: true });
      poll?.();
      statusSpy.mockResolvedValue({ ...status, generation: 2, locked: mode === "expiry" });
      if (mode === "background") {
        nativeDocument.visibilityState = "hidden";
        nativeDocument.dispatchEvent(new Event("visibilitychange"));
      }
      return "EXAMPLE MEMBERSHIP\nMember ID: QA123456";
    });
    let release: (() => void) | undefined;
    try {
      release = mountWallet();
      await new Promise<void>((resolve) => setImmediate(resolve));
      showWallet("add");
      await scanWalletNfc();
      const snapshot = renderToStaticMarkup(<Snapshot />);
      if (mode === "blur") {
        expect(snapshot).toContain("QA123456");
        expect(snapshot).toContain("&quot;locked&quot;:false");
        expect(statusSpy).toHaveBeenCalledTimes(2);
        nativeDocument.visibilityState = "hidden";
        nativeDocument.dispatchEvent(new Event("visibilitychange"));
        expect(renderToStaticMarkup(<Snapshot />)).not.toContain("QA123456");
      } else {
        expect(snapshot).not.toContain("QA123456");
        expect(snapshot).not.toContain("&quot;locked&quot;:false");
      }
    } finally {
      release?.();
      statusSpy.mockRestore();
      listenerSpy.mockRestore();
      listSpy.mockRestore();
      readSpy.mockRestore();
      if (oldWindow) Object.defineProperty(globalThis, "window", oldWindow);
      else Reflect.deleteProperty(globalThis, "window");
      if (oldDocument) Object.defineProperty(globalThis, "document", oldDocument);
      else Reflect.deleteProperty(globalThis, "document");
    }
  },
);
