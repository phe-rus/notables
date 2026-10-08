import {
  Button,
  CopyIcon,
  IconButton,
  LabeledContent,
  Section,
  SegmentedControl,
  toast,
} from "@ultrapeach/ui";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { t } from "../../../i18n/i18n";
import { ltrFieldKeys } from "../model/card-layout";
import type { WalletCard } from "../model/wallet-model";
import { showWallet, useWallet } from "../store/wallet-store";
import { CardFace } from "./card-face";
import { CardPresentation } from "./card-presentation";

/**
 * One card: the card itself, a way to show it to someone, and its details
 * as rows you can copy from, the way Apple Wallet's card details read.
 */
export function CardDetail({ card }: { card: WalletCard }) {
  const { view } = useWallet();
  const [side, setSide] = useState<"front" | "back">("front");
  const fields = [...card.draft.fields].sort((a, b) =>
    a.side === b.side ? a.order - b.order : a.side === "front" ? -1 : 1,
  );
  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast(t("wallet.copied"));
    } catch {
      // Clipboard refused (no permission): nothing to undo.
    }
  };
  return (
    <div className="mx-auto flex w-full max-w-[480px] flex-col gap-6">
      <div className="[perspective:1200px]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={side}
            initial={{ rotateY: side === "back" ? -90 : 90, opacity: 0.6 }}
            animate={{ rotateY: 0, opacity: 1 }}
            exit={{ rotateY: side === "back" ? 90 : -90, opacity: 0.6 }}
            transition={{ duration: 0.18 }}
          >
            <CardFace card={card} side={side} />
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="flex flex-col gap-3">
        <SegmentedControl
          label={t("wallet.cardDetails")}
          value={side}
          onChange={setSide}
          options={[
            { value: "front", label: t("wallet.front") },
            { value: "back", label: t("wallet.back") },
          ]}
        />
        <Button variant="primary" onClick={() => showWallet("present")}>
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
                  className="truncate text-subheadline text-label-secondary select-text"
                >
                  {field.value || t("wallet.emptyField")}
                </span>
                {field.value && (
                  <IconButton
                    label={t("wallet.copyValue", { label: field.label })}
                    onClick={() => void copy(field.value)}
                  >
                    <CopyIcon size={16} />
                  </IconButton>
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
