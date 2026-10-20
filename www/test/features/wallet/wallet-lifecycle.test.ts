import { expect, mock, spyOn, test } from "bun:test";
import { walletService } from "@/features/wallet/lib/wallet-service";
import { createWalletState } from "@/features/wallet/model/create-wallet-state";
import { mountWalletLifecycle } from "@/features/wallet/store/mount-wallet-lifecycle";

test("a native lock subscription arriving after disposal is immediately released", async () => {
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const oldDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: Object.assign(new EventTarget(), {
      __TAURI_INTERNALS__: {},
      setInterval,
      clearInterval,
    }),
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: Object.assign(new EventTarget(), {
      visibilityState: "visible",
      hasFocus: () => true,
    }),
  });
  const registration = Promise.withResolvers<() => void>();
  const subscription = spyOn(walletService, "onLocked").mockReturnValue(registration.promise);
  const unlisten = mock(() => {});
  const clear = mock(() => {});
  const release = mountWalletLifecycle({
    state: createWalletState,
    update: () => {},
    epoch: () => 1,
    clear,
    refresh: async () => {},
    fail: () => {},
  });
  try {
    release();
    registration.resolve(unlisten);
    await registration.promise;
    await Promise.resolve();
    expect(unlisten).toHaveBeenCalledTimes(1);
    expect(clear).toHaveBeenCalledTimes(1);
  } finally {
    subscription.mockRestore();
    if (oldWindow) Object.defineProperty(globalThis, "window", oldWindow);
    else Reflect.deleteProperty(globalThis, "window");
    if (oldDocument) Object.defineProperty(globalThis, "document", oldDocument);
    else Reflect.deleteProperty(globalThis, "document");
  }
});
