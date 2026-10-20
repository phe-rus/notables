import type { z } from "zod";
import { isTauri } from "@/platform/runtime";
import { walletErrorCodeSchema } from "../model/wallet-error-codes";
import { WalletFailure } from "./wallet-failure";

export async function callWalletCommand<T>(
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
    const code = walletErrorCodeSchema.safeParse(error);
    throw new WalletFailure(code.success ? code.data : "unavailable");
  }
}
