import { createStore, useSelector } from "@tanstack/react-store";
import { currentLanguage } from "../../../i18n/i18n";
import { isTauri } from "../../../platform/runtime";
import { cancelWalletNfc, readWalletNfc } from "../lib/card-nfc";
import type { CardReading } from "../lib/card-reader";
import {
  type CardSuggestions,
  cancelCardRecognition,
  prepareCardImage,
  recognizeCard,
  suggestCardFields,
} from "../lib/card-recognition";
import { walletAuthenticationPending, withWalletAuthentication } from "../lib/wallet-auth";
import { resumedWalletStatus, WalletFailure, walletService } from "../lib/wallet-service";
import { redactCard } from "../model/card-secrets";
import type {
  ListRequest,
  SaveRequest,
  WalletCard,
  WalletPreview,
  WalletStatus,
} from "../model/wallet-model";

interface WalletState {
  status: WalletStatus | null;
  captureReview: {
    suggestions: CardSuggestions;
    confidence: number;
    text: string;
    source?: "nfc";
  } | null;
  captureProgress: number | null;
  captureError: boolean;
  captureMethod: "image" | "nfc" | null;
  captureNfcUnsupported: boolean;
  cards: WalletPreview[];
  selected: WalletCard | null;
  view: "home" | "add" | "detail" | "edit" | "present";
  busy: boolean;
  error: string | null;
  nextCursor: string | null;
  query: ListRequest;
}

const initial = (): WalletState => ({
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
const wallet = createStore<WalletState>(initial());
let epoch = 0;
let listSequence = 0;
let pendingLock: Promise<void> = Promise.resolve();

export const useWallet = () => useSelector(wallet);
let accessTimer: ReturnType<typeof setTimeout> | undefined;
let secretTimer: ReturnType<typeof setTimeout> | undefined;
const update = (patch: Partial<WalletState>) => {
  if ("status" in patch) {
    clearTimeout(accessTimer);
    clearTimeout(secretTimer);
    if (patch.status?.unlockUntil) {
      const status = patch.status;
      accessTimer = setTimeout(
        () => {
          clearWallet();
          update({ status: { ...status, locked: true, sensitiveUntil: null, unlockUntil: null } });
        },
        Math.max(0, patch.status.unlockUntil - Date.now()),
      );
    }
    if (patch.status?.sensitiveUntil)
      secretTimer = setTimeout(
        () => {
          wallet.setState((state) => ({
            ...state,
            status: state.status ? { ...state.status, sensitiveUntil: null } : null,
            selected: state.selected ? redactCard(state.selected) : null,
          }));
        },
        Math.max(0, patch.status.sensitiveUntil - Date.now()),
      );
  }
  wallet.setState((state) => ({ ...state, ...patch }));
};

export function clearWallet() {
  clearTimeout(accessTimer);
  clearTimeout(secretTimer);
  cancelCardRecognition();
  cancelWalletNfc();
  epoch++;
  listSequence++;
  wallet.setState(() => initial());
}

export function showWallet(view: WalletState["view"]) {
  if (!wallet.get().busy) {
    if (view !== "add") {
      if (wallet.get().view === "add") epoch++;
      cancelCardRecognition();
      cancelWalletNfc();
      update({ captureReview: null, captureProgress: null, captureError: false });
    }
    update({ view, error: null });
  }
}

function fail(error: unknown) {
  const code = error instanceof WalletFailure ? error.code : "unavailable";
  if (code === "locked") {
    clearWallet();
    update({ error: code });
  } else update({ error: code });
}

async function run(work: (token: number) => Promise<void>) {
  if (wallet.get().busy) return;
  const token = epoch;
  update({ busy: true, error: null });
  try {
    await pendingLock;
    if (token === epoch) await work(token);
  } catch (error) {
    if (token === epoch) fail(error);
  } finally {
    if (token === epoch) update({ busy: false });
  }
}

export async function loadWalletPage(append = false) {
  const token = epoch;
  const sequence = ++listSequence;
  const state = wallet.get();
  if (!state.status?.initialized || state.status.locked) return;
  const query = { ...state.query, cursor: append ? state.nextCursor : null };
  try {
    const page = await walletService.list(query);
    if (token !== epoch || sequence !== listSequence) return;
    update({
      cards: append ? [...wallet.get().cards, ...page.cards] : page.cards,
      nextCursor: page.nextCursor,
    });
  } catch (error) {
    if (token === epoch && sequence === listSequence) fail(error);
  }
}

export function setWalletQuery(query: Partial<ListRequest>) {
  update({ query: { ...wallet.get().query, ...query, cursor: null }, nextCursor: null });
  void loadWalletPage();
}

async function applyStatus(status: WalletStatus, token: number) {
  if (token !== epoch) return;
  if (status.locked) {
    clearWallet();
    update({ status });
  } else {
    update({ status });
    await loadWalletPage();
  }
}

export const refreshWallet = () =>
  run(async (token) => applyStatus(await walletService.status(), token));
export const initializeWallet = () =>
  run(async (token) =>
    applyStatus(await withWalletAuthentication(() => walletService.initialize()), token),
  );

export const unlockWallet = () =>
  run(async (token) =>
    applyStatus(await withWalletAuthentication(() => walletService.unlock("passcode")), token),
  );

export function cancelWalletCapture() {
  epoch++;
  cancelCardRecognition();
  cancelWalletNfc();
  update({
    captureProgress: null,
    captureReview: null,
    captureError: false,
    captureMethod: null,
    captureNfcUnsupported: false,
  });
}

export function correctWalletCapture() {
  update({
    captureReview: {
      suggestions: {
        kind: "other",
        meter: "",
        account: "",
        displayName: "",
        holder: "",
        number: "",
        expiry: "",
        issuer: "",
        puk: "",
      },
      confidence: 0,
      text: "",
    },
  });
}

/** The camera session owns cancellation; only accept results into an accessible wallet. */
export function reviewWalletReading(review: CardReading) {
  const state = wallet.get();
  if (!state.status?.initialized || state.status.locked || state.view !== "add") return;
  update({ captureReview: review, captureProgress: null, captureError: false });
}

export async function recognizeWalletCanvas(canvas: HTMLCanvasElement) {
  const token = epoch;
  if (!wallet.get().status?.initialized || wallet.get().status?.locked) {
    canvas.width = 0;
    canvas.height = 0;
    return;
  }
  update({
    view: "add",
    captureProgress: 0,
    captureError: false,
    captureReview: null,
    captureMethod: "image",
    captureNfcUnsupported: false,
  });
  const job = recognizeCard(canvas, currentLanguage(), (value) => {
    if (token === epoch) update({ captureProgress: value });
  });
  try {
    const review = await job.result;
    if (token === epoch) update({ captureReview: review });
  } catch {
    if (token === epoch) update({ captureError: true });
  } finally {
    if (token === epoch) update({ captureProgress: null });
  }
}

export async function importWalletImage(file: File) {
  // A native file chooser may background the WebView. Only begin processing
  // its new selection after a fresh native status has reestablished access.
  try {
    const status = await resumedWalletStatus();
    await applyStatus(status, epoch);
  } catch (error) {
    fail(error);
    return;
  }
  const token = epoch;
  if (
    !wallet.get().status?.initialized ||
    wallet.get().status?.locked ||
    document.visibilityState !== "visible"
  )
    return;
  update({ view: "add", captureProgress: 0, captureError: false });
  try {
    const canvas = await prepareCardImage(file);
    if (token !== epoch) {
      canvas.width = 0;
      canvas.height = 0;
      return;
    }
    await recognizeWalletCanvas(canvas);
  } catch {
    if (token === epoch) update({ captureProgress: null, captureError: true });
  }
}

export const openWalletCard = (id: string) =>
  run(async (token) => {
    const card = await walletService.read(id);
    if (token === epoch) update({ selected: card, view: "detail" });
  });

export const saveWalletCard = (request: SaveRequest) =>
  run(async (token) => {
    const saved = await walletService.save(request);
    if (token !== epoch) return;
    const card = await walletService.read(saved.id);
    if (token !== epoch) return;
    update({ selected: card, view: "detail", captureReview: null });
    await loadWalletPage();
  });

export const deleteWalletCard = (id: string, operationId: string, revision: number) =>
  run(async (token) => {
    await walletService.delete(id, operationId, revision);
    if (token !== epoch) return;
    update({ selected: null, view: "home" });
    await loadWalletPage();
  });

export function lockWallet() {
  clearWallet();
  if (isTauri()) pendingLock = pendingLock.then(() => walletService.lock()).catch(() => {});
}

export function mountWallet() {
  if (!isTauri()) return () => clearWallet();
  void refreshWallet();
  let disposed = false;
  let unlisten: (() => void) | undefined;
  void walletService
    .onLocked((generation) => {
      if (walletAuthenticationPending()) return;
      const status = wallet.get().status;
      if (status && generation <= status.generation) return;
      clearWallet();
      if (status) update({ status: { ...status, locked: true, generation } });
    })
    .then((release) => {
      if (disposed) release();
      else unlisten = release;
    })
    .catch(() => {});
  const blur = () => {
    if (!walletAuthenticationPending()) clearWallet();
  };
  const focus = () => {
    if (document.visibilityState === "visible" && !walletAuthenticationPending())
      void refreshWallet();
  };
  const visibility = () => (document.visibilityState === "hidden" ? blur() : focus());
  let lastActivity = 0;
  const activity = () => {
    if (
      !wallet.get().status?.protected ||
      wallet.get().status?.locked ||
      Date.now() - lastActivity < 10_000
    )
      return;
    lastActivity = Date.now();
    const token = epoch;
    void walletService.activity().catch((error) => {
      if (token === epoch) fail(error);
    });
  };
  document.addEventListener("keydown", activity);
  document.addEventListener("pointerdown", activity);
  window.addEventListener("blur", blur);
  window.addEventListener("focus", focus);
  document.addEventListener("visibilitychange", visibility);
  const timer = window.setInterval(() => {
    if (
      document.visibilityState === "visible" &&
      document.hasFocus() &&
      !wallet.get().busy &&
      !walletAuthenticationPending()
    ) {
      const token = epoch;
      void walletService
        .status()
        .then((status) => {
          if (token !== epoch) return;
          if (status.locked) {
            clearWallet();
            update({ status });
          } else {
            update({ status });
            const selected = wallet.get().selected;
            if (
              selected &&
              !status.sensitiveUntil &&
              selected.draft.fields.some(
                (field) =>
                  (field.sensitive || field.key === "cvv" || field.key === "puk") &&
                  !field.redacted,
              )
            ) {
              void walletService
                .read(selected.draft.id)
                .then((card) => {
                  if (token === epoch) update({ selected: card });
                })
                .catch(() => {});
            }
          }
        })
        .catch((error) => {
          if (token === epoch) fail(error);
        });
    }
  }, 10_000);
  return () => {
    disposed = true;
    unlisten?.();
    window.clearInterval(timer);
    window.removeEventListener("blur", blur);
    window.removeEventListener("focus", focus);
    document.removeEventListener("visibilitychange", visibility);
    document.removeEventListener("keydown", activity);
    document.removeEventListener("pointerdown", activity);
    clearWallet();
  };
}

export async function scanWalletNfc() {
  const token = epoch;
  if (!wallet.get().status?.initialized || wallet.get().status?.locked) return;
  update({
    captureProgress: 0,
    captureError: false,
    captureReview: null,
    captureMethod: "nfc",
    captureNfcUnsupported: false,
  });
  try {
    const text = await readWalletNfc();
    if (token === epoch)
      update({
        captureReview: {
          text,
          confidence: 100,
          source: "nfc",
          suggestions: suggestCardFields(text),
        },
      });
  } catch (error) {
    if (token === epoch)
      update({
        captureError: true,
        captureNfcUnsupported: error instanceof Error && error.message === "no-readable-details",
      });
  } finally {
    if (token === epoch) update({ captureProgress: null });
  }
}
