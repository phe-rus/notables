import {
  Button,
  CopyIcon,
  IconButton,
  LabeledContent,
  LockIcon,
  Section,
  SegmentedControl,
  toast,
  VisibleIcon,
} from "@phe-rus/hino";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { t } from "../../../i18n/i18n";
import { withWalletAuthentication } from "../lib/wallet-auth";
import { walletService } from "../lib/wallet-service";
import { ltrFieldKeys } from "../model/card-layout";
import type { WalletCard } from "../model/wallet-model";
import { openWalletCard, refreshWallet, showWallet, useWallet } from "../store/wallet-store";
import { CardFace } from "./card-face";
import { CardPresentation } from "./card-presentation";

/**
 * One card: the card itself, a way to show it to someone, and its details
 * as rows you can copy from, the way Apple Wallet's card details read.
 */
export function CardDetail({ card }: { card: WalletCard }) {
  const { view, status } = useWallet();
  const [side, setSide] = useState<"front" | "back">("front");
  const reducedMotion = useReducedMotion();
  const hasBack = card.draft.sideState.back === "available";
  const fields = card.draft.fields
    .filter((field) => field.value || field.redacted)
    .sort((a, b) => (a.side === b.side ? a.order - b.order : a.side === "front" ? -1 : 1));
  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast(t("wallet.copied"));
    } catch {
      // Clipboard refused (no permission): nothing to undo.
    }
  };
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5">
      <motion.div
        layoutId={reducedMotion ? undefined : `wallet-card-${card.draft.id}`}
        transition={{ type: "spring", stiffness: 380, damping: 34 }}
        className="[perspective:1200px]"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={side}
            initial={reducedMotion ? false : { rotateY: side === "back" ? -90 : 90, opacity: 0.6 }}
            animate={{ rotateY: 0, opacity: 1 }}
            exit={reducedMotion ? undefined : { rotateY: side === "back" ? 90 : -90, opacity: 0.6 }}
            transition={{ duration: reducedMotion ? 0 : 0.18 }}
          >
            <CardFace
              card={card}
              side={side}
              revealSecrets={!!status?.sensitiveUntil && status.sensitiveUntil > Date.now()}
            />
          </motion.div>
        </AnimatePresence>
      </motion.div>
      <div className="flex items-center justify-center gap-3">
        {hasBack && (
          <SegmentedControl
            label={t("wallet.cardDetails")}
            value={side}
            onChange={setSide}
            options={[
              { value: "front", label: t("wallet.front") },
              { value: "back", label: t("wallet.back") },
            ]}
          />
        )}
        <Button
          size="sm"
          variant="secondary"
          className="shrink-0 rounded-full"
          onClick={() => showWallet("present")}
        >
          <VisibleIcon size={16} />
          {t("wallet.present")}
        </Button>
      </div>
      {fields.length > 0 && (
        <Section title={t("wallet.cardDetails")}>
          {fields.map((field) => (
            <LabeledContent key={field.id} label={field.label}>
              <div className="flex min-w-0 items-center gap-1">
                <span
                  dir={ltrFieldKeys.has(field.key) ? "ltr" : "auto"}
                  className="truncate text-footnote text-label-secondary select-text"
                >
                  {field.redacted ? "••••" : field.value || t("wallet.emptyField")}
                </span>
                {field.redacted ? (
                  <IconButton
                    size="icon-xs"
                    variant="ghost"
                    label={t("wallet.revealSecret")}
                    onClick={() => {
                      void withWalletAuthentication(() =>
                        walletService.reveal(card.draft.id, field.id),
                      )
                        .then(async () => {
                          await refreshWallet();
                          await openWalletCard(card.draft.id);
                        })
                        .catch(() => {
                          toast.error(t("wallet.error"));
                        });
                    }}
                  >
                    <LockIcon size={15} />
                  </IconButton>
                ) : (
                  field.value && (
                    <IconButton
                      size="icon-xs"
                      variant="ghost"
                      label={t("wallet.copyValue", { label: field.label })}
                      onClick={() => void copy(field.value)}
                    >
                      <CopyIcon size={16} />
                    </IconButton>
                  )
                )}
              </div>
            </LabeledContent>
          ))}
        </Section>
      )}
      {view === "present" && <CardPresentation card={card} />}
    </div>
  );
}
