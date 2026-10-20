import { WalletFailure } from "./wallet-failure";
import { walletService } from "./wallet-service";

/** Native pickers can return a file before the activity has finished resuming. */
export async function resumedWalletStatus() {
  for (let attempt = 0; attempt < 80; attempt++) {
    if (document.visibilityState === "visible" && document.hasFocus()) {
      const status = await walletService.status();
      if (!status.locked || !status.unlockUntil || status.unlockUntil <= Date.now()) return status;
    }
    await new Promise<void>((resolve) => window.setTimeout(resolve, 25));
  }
  throw new WalletFailure("locked");
}
