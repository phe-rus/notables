import type { WalletErrorCode } from "../model/types";

export class WalletFailure extends Error {
  constructor(readonly code: WalletErrorCode) {
    super(code);
  }
}
