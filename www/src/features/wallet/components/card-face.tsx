import { type AccentId, accents } from "@ultrapeach/tokens";
import { cn } from "@ultrapeach/ui";
import type { ReactNode } from "react";
import { t } from "../../../i18n/i18n";
import { cardFaceFields, ltrFieldKeys } from "../model/card-layout";
import { kindMessageKeys, type WalletCard, type WalletPreview } from "../model/wallet-model";

/**
 * The card itself, drawn the way Apple Wallet draws one: in its own color,
 * at a physical card's proportions, with a soft sheen. Cards keep their
 * light colors in dark mode, as real cards do.
 */
function CardSurface({
  palette,
  className,
  children,
}: {
  palette: AccentId;
  className?: string;
  children: ReactNode;
}) {
  const colors = accents[palette].light;
  return (
    <div
      className={cn(
        "relative isolate flex aspect-[85.6/54] w-full flex-col overflow-hidden rounded-3xl p-5 shadow-[0_14px_34px_-16px_var(--color-shadow-floating)] select-none",
        className,
      )}
      style={{
        backgroundColor: colors.accent,
        backgroundImage: `linear-gradient(150deg, ${colors.accent}, color-mix(in srgb, ${colors.accent} 82%, ${colors.accentText}))`,
        color: colors.onAccent,
      }}
    >
      {/* The sheen across a laminated card. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(115deg,rgb(255_255_255/0.32),transparent_38%,transparent_72%,rgb(255_255_255/0.12))]"
      />
      {children}
    </div>
  );
}

function CardHeading({
  name,
  issuer,
  kind,
}: {
  name: string;
  issuer: string | null;
  kind: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-headline font-semibold">{name}</span>
        {issuer && <span className="truncate text-footnote opacity-75">{issuer}</span>}
      </div>
      <span className="shrink-0 pt-0.5 text-caption2 font-semibold tracking-[0.08em] uppercase opacity-70">
        {kind}
      </span>
    </div>
  );
}

/** A saved card at full size: its main identifier large, the rest along the bottom. */
export function CardFace({ card, side = "front" }: { card: WalletCard; side?: "front" | "back" }) {
  const { draft } = card;
  const value = (key: string) =>
    draft.fields.find((field) => field.key === key && field.side === side);
  const layout = cardFaceFields[draft.kind];
  const primary = value(layout.primary);
  const footer = layout.footer.flatMap((key) => value(key) ?? []);
  const backFields = draft.fields
    .filter((field) => field.side === "back")
    .sort((a, b) => a.order - b.order);
  return (
    <CardSurface palette={draft.appearance.palette}>
      <CardHeading
        name={draft.displayName}
        issuer={draft.issuer}
        kind={t(kindMessageKeys[draft.kind])}
      />
      {draft.sideState[side] === "missing" ? (
        <p className="my-auto text-center text-subheadline opacity-80">{t("wallet.missingSide")}</p>
      ) : side === "back" ? (
        <dl className="mt-auto grid grid-cols-2 gap-x-4 gap-y-2">
          {backFields.map((field) => (
            <div key={field.id} className="min-w-0">
              <dt className="truncate text-caption2 tracking-[0.06em] uppercase opacity-70">
                {field.label}
              </dt>
              <dd
                dir={ltrFieldKeys.has(field.key) ? "ltr" : "auto"}
                className="truncate text-subheadline font-medium"
              >
                {field.value || t("wallet.emptyField")}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <>
          {primary?.value && (
            <p dir="ltr" className="my-auto truncate font-mono text-title3 tracking-[0.12em]">
              {primary.value}
            </p>
          )}
          <dl className="mt-auto flex items-end justify-between gap-4">
            {footer.map((field) => (
              <div key={field.id} className="min-w-0 last:text-end">
                <dt className="truncate text-caption2 tracking-[0.06em] uppercase opacity-70">
                  {field.label}
                </dt>
                <dd
                  dir={ltrFieldKeys.has(field.key) ? "ltr" : "auto"}
                  className="truncate text-subheadline font-medium"
                >
                  {field.value || t("wallet.emptyField")}
                </dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </CardSurface>
  );
}

/** A card in the stack: name, kind and, for bank cards, only the last four digits. */
export function CardPreviewFace({ card }: { card: WalletPreview }) {
  return (
    <CardSurface palette={card.appearance.palette}>
      <CardHeading
        name={card.displayName}
        issuer={card.issuer}
        kind={t(kindMessageKeys[card.kind])}
      />
      {card.kind === "bank" && card.lastFour && (
        <p dir="ltr" className="mt-auto font-mono text-callout tracking-[0.12em] opacity-90">
          •••• {card.lastFour}
        </p>
      )}
    </CardSurface>
  );
}
