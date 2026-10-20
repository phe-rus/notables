import { isTauri } from "@/platform/runtime";
import { walletAuthenticationPending, walletSystemPromptPending } from "../lib/wallet-auth";
import { walletService } from "../lib/wallet-service";
import type { WalletLifecycleContext } from "../model/types";

export function mountWalletLifecycle(context: WalletLifecycleContext) {
  if (!isTauri()) return () => context.clear();
  void context.refresh();
  let disposed = false;
  let unlisten: (() => void) | undefined;
  void walletService
    .onLocked((generation) => {
      if (walletAuthenticationPending() || walletSystemPromptPending()) return;
      const status = context.state().status;
      if (status && generation <= status.generation) return;
      context.clear();
      if (status) context.update({ status: { ...status, locked: true, generation } });
    })
    .then((release) => {
      if (disposed) release();
      else unlisten = release;
    })
    .catch(() => {});
  const blur = () => {
    if (!walletAuthenticationPending() && !walletSystemPromptPending()) context.clear();
  };
  const focus = () => {
    if (
      document.visibilityState === "visible" &&
      !walletAuthenticationPending() &&
      !walletSystemPromptPending()
    )
      void context.refresh();
  };
  const visibility = () => {
    if (document.visibilityState !== "hidden") focus();
    else if (walletSystemPromptPending() && !walletAuthenticationPending()) context.clear();
    else blur();
  };
  let lastActivity = 0;
  const activity = () => {
    if (
      walletSystemPromptPending() ||
      !context.state().status?.protected ||
      context.state().status?.locked ||
      Date.now() - lastActivity < 10_000
    )
      return;
    lastActivity = Date.now();
    const token = context.epoch();
    void walletService.activity().catch((error) => {
      if (token === context.epoch() && !walletSystemPromptPending()) context.fail(error);
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
      !context.state().busy &&
      !walletAuthenticationPending() &&
      !walletSystemPromptPending()
    ) {
      const token = context.epoch();
      void walletService
        .status()
        .then((status) => {
          if (token !== context.epoch()) return;
          if (status.locked) {
            context.clear();
            context.update({ status });
          } else {
            context.update({ status });
            const selected = context.state().selected;
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
                  if (token === context.epoch()) context.update({ selected: card });
                })
                .catch(() => {});
            }
          }
        })
        .catch((error) => {
          if (token === context.epoch()) context.fail(error);
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
    context.clear();
  };
}
