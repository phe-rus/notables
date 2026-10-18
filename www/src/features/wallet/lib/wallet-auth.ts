let pending = 0;
export const walletAuthenticationPending = () => pending > 0;

/** An OS authentication activity is part of Wallet, not an unrelated app switch. */
export async function withWalletAuthentication<T>(work: () => Promise<T>): Promise<T> {
  pending++;
  try {
    return await work();
  } finally {
    pending--;
  }
}
