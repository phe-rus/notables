import { describe, expect, it, mock } from "bun:test";
import { callWalletCommand } from "@/features/wallet/lib/call-wallet-command";
import { WalletFailure } from "@/features/wallet/lib/wallet-failure";
import { walletGenerationSchema, walletPageSchema } from "@/features/wallet/model/wallet-model";

async function withNativeRpc(
  invoke: (command: string, args: unknown) => Promise<unknown>,
  work: () => Promise<void>,
) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { __TAURI_INTERNALS__: { invoke } },
  });
  try {
    await work();
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  }
}

describe("Wallet command boundary", () => {
  it("decodes a valid native response and forwards the expected command arguments", async () => {
    const invoke = mock(async (_command: string, _args: unknown) => 7);
    await withNativeRpc(invoke, async () => {
      expect(await callWalletCommand("wallet_activity", {}, walletGenerationSchema)).toBe(7);
      expect(invoke).toHaveBeenCalledWith("wallet_activity", {}, undefined);
    });
  });

  it("rejects a native list that exposes full card values instead of previews", async () => {
    await withNativeRpc(
      async () => ({
        cards: [
          {
            id: "a0000000-0000-4000-8000-000000000001",
            revision: 1,
            kind: "bank",
            displayName: "Synthetic",
            issuer: null,
            appearance: { formFactor: "landscape", palette: "blush" },
            lastFour: "1111",
            updatedAt: 0,
            number: "4111111111111111",
            cvv: "123",
          },
        ],
        nextCursor: null,
      }),
      async () => {
        await expect(callWalletCommand("wallet_list", {}, walletPageSchema)).rejects.toMatchObject({
          code: "corrupt-vault",
        });
      },
    );
  });

  it("preserves known native failures and existing typed failures", async () => {
    await withNativeRpc(
      async () => {
        throw "locked";
      },
      async () => {
        await expect(
          callWalletCommand("wallet_status", {}, walletGenerationSchema),
        ).rejects.toMatchObject({ code: "locked" });
      },
    );
    const failure = new WalletFailure("quota");
    await withNativeRpc(
      async () => {
        throw failure;
      },
      async () => {
        await expect(callWalletCommand("wallet_save", {}, walletGenerationSchema)).rejects.toBe(
          failure,
        );
      },
    );
  });

  it("normalizes unknown native errors without exposing their message", async () => {
    await withNativeRpc(
      async () => {
        throw new Error("synthetic engine detail");
      },
      async () => {
        await expect(
          callWalletCommand("wallet_status", {}, walletGenerationSchema),
        ).rejects.toMatchObject({ code: "unavailable", message: "unavailable" });
      },
    );
  });
});
