import { z } from "zod";

export const walletErrorCodes = [
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
] as const;

export const walletErrorCodeSchema = z.enum(walletErrorCodes);
