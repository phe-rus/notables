import { Button } from "@ultrapeach/ui";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { t } from "../../../i18n/i18n";
import type { WalletCard } from "../model/wallet-model";
import { showWallet } from "../store/wallet-store";
import { CardFace } from "./card-face";

export function CardPresentation({ card }: { card: WalletCard }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const title = useId();
  const [side, setSide] = useState<"front" | "back">("front");
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    element?.showModal();
    close.current?.focus();
    return () => {
      element?.close();
      previous?.focus();
    };
  }, []);
  return createPortal(
    <dialog
      ref={dialog}
      aria-labelledby={title}
      onCancel={() => showWallet("detail")}
      className="fixed inset-0 z-[90] m-0 h-dvh max-h-none w-screen max-w-none overflow-y-auto bg-paper p-5 text-label backdrop:bg-black/50 sm:p-10"
    >
      <div className="mx-auto flex min-h-full w-full max-w-[900px] flex-col gap-8 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 id={title} className="text-lg font-semibold">
            {card.draft.displayName}
          </h2>
          <Button ref={close} onClick={() => showWallet("detail")}>
            {t("common.close")}
          </Button>
        </div>
        <div className="my-auto">
          <CardFace card={card} side={side} />
        </div>
        <div className="flex justify-center gap-3">
          <Button aria-pressed={side === "front"} onClick={() => setSide("front")}>
            {t("wallet.front")}
          </Button>
          <Button aria-pressed={side === "back"} onClick={() => setSide("back")}>
            {t("wallet.back")}
          </Button>
        </div>
      </div>
    </dialog>,
    document.body,
  );
}
