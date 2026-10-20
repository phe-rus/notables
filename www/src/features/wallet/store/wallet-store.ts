import { createStore, useSelector } from "@tanstack/react-store";
import { isTauri } from "@/platform/runtime";
import { cancelWalletNfc } from "../lib/card-nfc";
import { cancelCardRecognition } from "../lib/card-recognition";
import {
  walletAuthenticationPending,
  walletSystemPromptPending,
  withWalletAuthentication,
} from "../lib/wallet-auth";
import { resumedWalletStatus, WalletFailure, walletService } from "../lib/wallet-service";
import { redactCard } from "../model/card-secrets";
import { createWalletState } from "../model/create-wallet-state";
import type { WalletState } from "../model/types";
import type { ListRequest, SaveRequest, WalletStatus } from "../model/wallet-model";
import { createWalletCapture } from "./create-wallet-capture";

const wallet = createStore<WalletState>(createWalletState());
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
  wallet.setState(() => createWalletState());
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

export async function resumeWalletCapture() {
  if (!wallet.get().status?.initialized) return;
  const token = epoch;
  await applyStatus(await resumedWalletStatus(), token);
  if (token !== epoch || wallet.get().status?.locked) throw new WalletFailure("locked");
}

export const refreshWallet = () =>
  run(async (token) => applyStatus(await walletService.status(), token));
export const initializeWallet = () =>
  run((token) =>
    withWalletAuthentication(async () => applyStatus(await walletService.initialize(), token)),
  );

export const unlockWallet = () =>
  run((token) =>
    withWalletAuthentication(async () =>
      applyStatus(await walletService.unlock("passcode"), token),
    ),
  );

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
      if (walletAuthenticationPending() || walletSystemPromptPending()) return;
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
    if (!walletAuthenticationPending() && !walletSystemPromptPending()) clearWallet();
  };
  const focus = () => {
    if (
      document.visibilityState === "visible" &&
      !walletAuthenticationPending() &&
      !walletSystemPromptPending()
    )
      void refreshWallet();
  };
  const visibility = () => {
    if (document.visibilityState !== "hidden") focus();
    else if (walletSystemPromptPending() && !walletAuthenticationPending()) clearWallet();
    else blur();
  };
  let lastActivity = 0;
  const activity = () => {
    if (
      walletSystemPromptPending() ||
      !wallet.get().status?.protected ||
      wallet.get().status?.locked ||
      Date.now() - lastActivity < 10_000
    )
      return;
    lastActivity = Date.now();
    const token = epoch;
    void walletService.activity().catch((error) => {
      if (token === epoch && !walletSystemPromptPending()) fail(error);
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
      !walletAuthenticationPending() &&
      !walletSystemPromptPending()
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

const capture = createWalletCapture({
  state: () => wallet.get(),
  update,
  epoch: () => epoch,
  invalidate: () => {
    epoch++;
  },
  applyStatus,
  fail,
});

export const cancelWalletCapture = capture.cancel;
export const correctWalletCapture = capture.correct;
export const reviewWalletReading = capture.review;
export const recognizeWalletCanvas = capture.recognize;
export const importWalletImage = capture.importImage;
export const scanWalletNfc = capture.scanNfc;
