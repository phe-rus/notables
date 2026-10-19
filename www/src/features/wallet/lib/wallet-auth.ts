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

let systemPrompts = 0;
export const walletSystemPromptPending = () => systemPrompts > 0;

/** NFC and camera permission sheets may blur the WebView without backgrounding it. */
export async function withWalletSystemPrompt<T>(work: () => Promise<T>): Promise<T> {
  systemPrompts++;
  try {
    return await work();
  } finally {
    systemPrompts--;
  }
}
