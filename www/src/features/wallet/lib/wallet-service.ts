import { t } from "@/i18n/i18n";
import { isTauri } from "@/platform/runtime";
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

import { callWalletCommand } from "./call-wallet-command";

export const walletService = {
  async onLocked(callback: (generation: number) => void) {
    const { listen } = await import("@tauri-apps/api/event");
    return listen<unknown>("wallet-locked", (event) => {
      const generation = walletGenerationSchema.safeParse(event.payload);
      if (generation.success) callback(generation.data);
    });
  },
  activity: () => callWalletCommand("wallet_activity", {}, walletGenerationSchema),
  status: () => callWalletCommand("wallet_status", {}, walletStatusSchema),
  initialize: () =>
    callWalletCommand(
      "wallet_initialize",
      { mode: "device", reason: t("wallet.authReason") },
      walletStatusSchema,
    ),
  unlock: (method: "passcode" | "faceId" | "fingerprint") =>
    callWalletCommand(
      "wallet_unlock",
      { method, reason: t("wallet.authReason") },
      walletStatusSchema,
    ),
  authorize: () =>
    callWalletCommand("wallet_authorize", { reason: t("wallet.secretReason") }, walletStatusSchema),
  configure: (minutes: number) =>
    callWalletCommand(
      "wallet_configure",
      { minutes, reason: t("wallet.authReason") },
      walletStatusSchema,
    ),
  reveal: (id: string, fieldId: string) =>
    callWalletCommand(
      "wallet_reveal_field",
      { id, fieldId, reason: t("wallet.secretReason") },
      walletCardSchema,
    ),
  list: (request: ListRequest) => callWalletCommand("wallet_list", { request }, walletPageSchema),
  read: (id: string) => callWalletCommand("wallet_read", { id }, walletCardSchema),
  save: (request: SaveRequest) =>
    callWalletCommand("wallet_save", { request }, walletSaveResultSchema),
  delete: (id: string, operationId: string, expectedRevision: number) =>
    callWalletCommand("wallet_delete", { id, operationId, expectedRevision }, walletReceiptSchema),
  async lock() {
    if (!isTauri()) return;
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke<void>("wallet_lock");
  },
};
