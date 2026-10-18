import { CloseIcon, IconButton, SegmentedControl } from "@phe-rus/hino";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { t } from "../../../i18n/i18n";
import type { WalletCard } from "../model/wallet-model";
import { showWallet, useWallet } from "../store/wallet-store";
import { CardFace } from "./card-face";

export function CardPresentation({ card }: { card: WalletCard }) {
  const { status } = useWallet();
  const reducedMotion = useReducedMotion();
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
      <div className="mx-auto flex min-h-full w-full max-w-xl flex-col gap-8 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-between gap-3">
          <h2 id={title} className="min-w-0 grow truncate text-headline font-semibold">
            {card.draft.displayName}
          </h2>
          <IconButton
            ref={close}
            size="icon-sm"
            variant="secondary"
            label={t("common.close")}
            onClick={() => showWallet("detail")}
          >
            <CloseIcon size={18} />
          </IconButton>
        </div>
        <motion.div
          className="my-auto"
          initial={reducedMotion ? false : { opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <CardFace
            card={card}
            side={side}
            revealSecrets={!!status?.sensitiveUntil && status.sensitiveUntil > Date.now()}
          />
        </motion.div>
        {card.draft.sideState.back === "available" && (
          <div className="mx-auto w-full max-w-xs">
            <SegmentedControl
              label={t("wallet.cardDetails")}
              value={side}
              onChange={setSide}
              options={[
                { value: "front", label: t("wallet.front") },
                { value: "back", label: t("wallet.back") },
              ]}
            />
          </div>
        )}
      </div>
    </dialog>,
    document.body,
  );
}
