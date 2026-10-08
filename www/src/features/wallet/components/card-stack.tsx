import { Button, haptic, PlusIcon } from "@ultrapeach/ui";
import { motion } from "motion/react";
import { t } from "../../../i18n/i18n";
import { arrange, moveCardToFront, useCardOrder } from "../store/card-order";
import { loadWalletPage, openWalletCard, showWallet, useWallet } from "../store/wallet-store";
import { CardPreviewFace } from "./card-face";

/** How much of each card shows above the next one, as in Apple Wallet. */
const PEEK = 64;
/** How far, or how fast, a sideways swipe must go to move a card. */
const SWIPE_DISTANCE = 90;
const SWIPE_SPEED = 600;

/**
 * The wallet's home: cards stacked so each shows its top edge. Tapping a
 * card opens it; swiping one sideways brings it to the front.
 */
export function CardStack() {
  const { cards: loaded, busy, nextCursor } = useWallet();
  const cards = arrange(loaded, useCardOrder());
  if (cards.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-[440px] flex-col items-center gap-5 pt-6 text-center">
        <button
          type="button"
          onClick={() => showWallet("add")}
          className="flex aspect-[85.6/54] w-full flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-separator text-label-secondary transition-colors hover:bg-fill/50"
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-accent text-on-accent">
            <PlusIcon size={22} strokeWidth={2.2} />
          </span>
          <span className="text-headline font-semibold text-label">{t("wallet.addCard")}</span>
        </button>
        <div className="flex flex-col gap-1.5 px-4">
          <h2 className="text-title3 font-semibold">{t("wallet.emptyTitle")}</h2>
          <p className="text-subheadline text-label-secondary">{t("wallet.emptyHint")}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="@container mx-auto flex w-full max-w-[440px] flex-col pt-2">
      {cards.map((card, index) => (
        <motion.button
          key={card.id}
          layout="position"
          type="button"
          disabled={busy}
          aria-label={t("wallet.openCard", { name: card.displayName })}
          // A tap opens the card; a sideways swipe (not a tap) brings it to the front.
          onTap={() => void openWalletCard(card.id)}
          drag="x"
          dragSnapToOrigin
          dragElastic={0.5}
          onDragEnd={(_, info) => {
            if (
              Math.abs(info.offset.x) > SWIPE_DISTANCE ||
              Math.abs(info.velocity.x) > SWIPE_SPEED
            ) {
              haptic("light");
              moveCardToFront(
                card.id,
                cards.map((other) => other.id),
              );
            }
          }}
          transition={{ type: "spring", stiffness: 420, damping: 36 }}
          // Each card tucks under the one before, leaving its top edge in view.
          style={index > 0 ? { marginTop: `calc(${PEEK}px - 100cqw * 54 / 85.6)` } : undefined}
          className="relative rounded-3xl text-start outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60"
        >
          <CardPreviewFace card={card} />
        </motion.button>
      ))}
      {nextCursor && (
        <Button
          className="mt-6 self-center"
          disabled={busy}
          onClick={() => void loadWalletPage(true)}
        >
          {t("wallet.loadMore")}
        </Button>
      )}
    </div>
  );
}
