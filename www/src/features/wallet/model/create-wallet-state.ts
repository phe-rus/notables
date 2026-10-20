import type { WalletState } from "./types";

export const createWalletState = (): WalletState => ({
  status: null,
  captureReview: null,
  captureProgress: null,
  captureError: false,
  captureMethod: null,
  captureNfcUnsupported: false,
  cards: [],
  selected: null,
  view: "home",
  busy: false,
  error: null,
  nextCursor: null,
  query: { cursor: null, limit: 25, sort: "updated", search: "", kind: null },
});
