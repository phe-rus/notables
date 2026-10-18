import { cn } from "@phe-rus/hino";
import { type AccentId, accents } from "@phe-rus/hino/tokens";
import type { ReactNode } from "react";
import { t } from "../../../i18n/i18n";
import { cardFaceFields, ltrFieldKeys } from "../model/card-layout";
import { isSecretField } from "../model/card-secrets";
import {
  type CardKind,
  kindMessageKeys,
  type WalletCard,
  type WalletPreview,
} from "../model/wallet-model";

import { CardArtwork } from "./card-artwork";

/** Physical proportions and type-specific print, independent of the app theme. */
function CardSurface({
  palette,
  kind,
  className,
  children,
}: {
  palette: AccentId;
  kind: CardKind;
  className?: string;
  children: ReactNode;
}) {
  const colors = accents[palette].light;
  const dark = kind === "bank" || kind === "passport" || kind === "television";
  const paper = kind === "national-id" || kind === "sim" || kind === "other";
  const ink = accents.blush.light.onAccent;
  const paperColor = accents.graphite.light.onAccent;
  const ground = dark
    ? `color-mix(in srgb, ${colors.accent} 38%, ${ink})`
    : paper
      ? `color-mix(in srgb, ${colors.accent} 10%, ${paperColor})`
      : `color-mix(in srgb, ${colors.accent} 75%, ${paperColor})`;
  return (
    <div
      className={cn(
        "relative isolate flex aspect-[85.6/54] w-full shrink-0 flex-col overflow-hidden rounded-3xl p-5 shadow-sm ring-1 ring-inset ring-black/5 select-none",
        className,
      )}
      style={{
        backgroundColor: ground,
        backgroundImage: dark
          ? `linear-gradient(145deg, color-mix(in srgb, ${colors.accent} 55%, ${ink}), ${ground})`
          : undefined,
        color: dark ? paperColor : ink,
      }}
    >
      <CardArtwork kind={kind} />
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
        <span className="truncate text-headline font-semibold tracking-tight">{name}</span>
        {issuer && issuer.toLocaleLowerCase() !== name.toLocaleLowerCase() && (
          <span className="truncate text-footnote opacity-75">{issuer}</span>
        )}
      </div>
      <span className="max-w-[35%] shrink-0 pt-0.5 text-end text-caption2 font-medium opacity-65">
        {kind}
      </span>
    </div>
  );
}

/** A saved card at full size: its main identifier large, the rest along the bottom. */
export function CardFace({
  card,
  side = "front",
  revealSecrets = false,
}: {
  card: WalletCard;
  side?: "front" | "back";
  revealSecrets?: boolean;
}) {
  const { draft } = card;
  const value = (key: string) =>
    draft.fields.find((field) => field.key === key && field.side === side);
  const layout = cardFaceFields[draft.kind];
  const primary = value(layout.primary);
  const footer = layout.footer
    .flatMap((key) => value(key) ?? [])
    .filter((field) => field.value || field.redacted);
  const display = (field: WalletCard["draft"]["fields"][number]) =>
    field.redacted || (isSecretField(field) && !revealSecrets)
      ? "••••"
      : field.value || t("wallet.emptyField");
  const backFields = draft.fields
    .filter((field) => field.side === "back")
    .sort((a, b) => a.order - b.order);
  return (
    <CardSurface palette={draft.appearance.palette} kind={draft.kind}>
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
                {display(field)}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <>
          {(primary?.value || primary?.redacted) && primary && (
            <p
              dir="ltr"
              className={cn(
                "truncate font-mono text-title3 tracking-[0.08em]",
                draft.kind === "bank" ? "mb-4 mt-auto" : "my-auto",
                (draft.kind === "passport" ||
                  draft.kind === "national-id" ||
                  draft.kind === "sim") &&
                  "max-w-[72%]",
                draft.kind === "electricity" && "text-title2 font-semibold tracking-tight",
              )}
            >
              {display(primary)}
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
                  {display(field)}
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
    <CardSurface palette={card.appearance.palette} kind={card.kind}>
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
