import type { z } from "zod";
import { isTauri } from "../../../platform/runtime";
import {
  type ListRequest,
  type SaveRequest,
  walletCardSchema,
  walletGenerationSchema,
  walletPageSchema,
  walletReceiptSchema,
  walletSaveResultSchema,
  walletStatusSchema,
} from "../model/wallet-model";

const errorCodes = new Set([
  "invalid-input",
  "invalid-operation",
  "corrupt-vault",
  "unsupported-format",
  "write-failure",
  "invalid-credential",
  "conflict",
  "missing",
  "quota",
  "unavailable",
  "secure-store-unavailable",
  "locked",
  "denied",
  "already-initialized",
  "throttled",
  "invalid-cursor",
]);

export class WalletFailure extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

async function call<T>(
  command: string,
  args: Record<string, unknown>,
  schema: z.ZodType<T>,
): Promise<T> {
  if (!isTauri()) throw new WalletFailure("unavailable");
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const raw = await invoke<unknown>(command, args);
    const result = schema.safeParse(raw);
    if (!result.success) throw new WalletFailure("corrupt-vault");
    return result.data;
  } catch (error) {
    if (error instanceof WalletFailure) throw error;
    throw new WalletFailure(
      typeof error === "string" && errorCodes.has(error) ? error : "unavailable",
    );
  }
}

export const walletService = {
  async onLocked(callback: (generation: number) => void) {
    const { listen } = await import("@tauri-apps/api/event");
    return listen<unknown>("wallet-locked", (event) => {
      const generation = walletGenerationSchema.safeParse(event.payload);
      if (generation.success) callback(generation.data);
    });
  },
  activity: () => call("wallet_activity", {}, walletGenerationSchema),
  status: () => call("wallet_status", {}, walletStatusSchema),
  initialize: () => call("wallet_initialize", { mode: "device" }, walletStatusSchema),
  unlock: (method: "passcode" | "faceId" | "fingerprint") =>
    call("wallet_unlock", { method }, walletStatusSchema),
  list: (request: ListRequest) => call("wallet_list", { request }, walletPageSchema),
  read: (id: string) => call("wallet_read", { id }, walletCardSchema),
  save: (request: SaveRequest) => call("wallet_save", { request }, walletSaveResultSchema),
  delete: (id: string, operationId: string, expectedRevision: number) =>
    call("wallet_delete", { id, operationId, expectedRevision }, walletReceiptSchema),
  async lock() {
    if (!isTauri()) return;
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke<void>("wallet_lock");
  },
};
