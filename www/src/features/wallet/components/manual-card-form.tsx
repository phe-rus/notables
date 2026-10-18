import {
  BrushIcon,
  Button,
  CameraIcon,
  ChevronRightIcon,
  LabeledContent,
  Section,
  SegmentedControl,
  Sheet,
  SwatchPicker,
} from "@phe-rus/hino";
import { Toggle } from "@phe-rus/hino/toggle";
import { type AccentId, accents } from "@phe-rus/hino/tokens";
import { useForm } from "@tanstack/react-form";
import { useRef, useState } from "react";
import { PickerInput } from "../../../components/form/form-fields";
import { t } from "../../../i18n/i18n";
import type { CardReading } from "../lib/card-reader";
import type { CardSuggestions } from "../lib/card-recognition";
import { backMatchesCard } from "../model/card-back";
import { fieldLabels } from "../model/card-layout";
import { isSecretField } from "../model/card-secrets";
import {
  type CardDraft,
  type CardKind,
  cardKinds,
  kindMessageKeys,
  type WalletCard,
} from "../model/wallet-model";
import { saveWalletCard, showWallet, useWallet } from "../store/wallet-store";
import { CardBackCapture } from "./card-back-capture";
import { CardFace } from "./card-face";

export function ManualCardForm({
  card,
  suggestions,
}: {
  card: WalletCard | null;
  suggestions?: CardSuggestions;
}) {
  const { busy } = useWallet();
  const id = useRef(card?.draft.id ?? crypto.randomUUID());
  const operation = useRef(crypto.randomUUID());
  const fieldIds = useRef(new Map(card?.draft.fields.map((field) => [field.key, field.id]) ?? []));
  const existing = (key: Exclude<keyof CardSuggestions, "numberUncertain">) =>
    card?.draft.fields.find((field) => field.key === key)?.value ?? suggestions?.[key] ?? "";
  const [backOpen, setBackOpen] = useState(false);
  const [backMismatch, setBackMismatch] = useState(false);
  const [backEmpty, setBackEmpty] = useState(false);
  const [backKeys, setBackKeys] = useState(
    () =>
      new Set(
        card?.draft.fields.filter((field) => field.side === "back").map((field) => field.key),
      ),
  );
  const [protectedKeys, setProtectedKeys] = useState(
    () =>
      new Set(
        card
          ? card.draft.fields.filter(isSecretField).map((field) => field.key)
          : [
              "cvv",
              "puk",
              ...(["bank", "national-id", "passport", "sim"].includes(suggestions?.kind ?? "other")
                ? ["number"]
                : []),
            ],
      ),
  );
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [previewSide, setPreviewSide] = useState<"front" | "back">("front");
  const [kind, setKind] = useState<CardKind>(card?.draft.kind ?? suggestions?.kind ?? "other");
  const kindKeys = {
    bank: ["holder", "number", "expiry", "cvv"],
    "national-id": ["holder", "number", "expiry"],
    passport: ["holder", "number", "expiry"],
    electricity: ["meter", "account", "holder"],
    television: ["account", "number", "holder"],
    sim: ["number", "account", "puk", "holder"],
    membership: ["holder", "number", "expiry"],
    other: ["holder", "number", "account"],
  } as const;
  const defaultValues = {
    meter: existing("meter"),
    account: existing("account"),
    displayName: card?.draft.displayName ?? suggestions?.displayName ?? "",
    holder: existing("holder"),
    number: existing("number"),
    expiry: existing("expiry"),
    issuer: card?.draft.issuer ?? suggestions?.issuer ?? "",
    cvv: existing("cvv"),
    puk: existing("puk"),
    retainSecurityCode: card?.draft.retainSecurityCode ?? false,
    backAvailable: card?.draft.sideState.back === "available",
    palette:
      card?.draft.appearance.palette ??
      suggestions?.palette ??
      (
        {
          bank: "ocean",
          "national-id": "sage",
          passport: "rose",
          electricity: "honey",
          television: "graphite",
          sim: "honey",
          membership: "lavender",
          other: "blush",
        } satisfies Record<CardKind, AccentId>
      )[kind],
  };
  const draftFor = (value: typeof defaultValues): CardDraft => {
    const labels = { ...fieldLabels(kind), cvv: t("wallet.securityCode") };
    const keys = kindKeys[kind];
    const fields = keys
      .filter(
        (key) =>
          key !== "cvv" ||
          (value.retainSecurityCode &&
            (value.cvv !== "" ||
              card?.draft.fields.some((field) => field.key === "cvv" && field.redacted))),
      )
      .map((key, order) => {
        let fieldId = fieldIds.current.get(key);
        if (!fieldId) {
          fieldId = crypto.randomUUID();
          fieldIds.current.set(key, fieldId);
        }
        return {
          id: fieldId,
          cardId: id.current,
          key,
          label: labels[key],
          value: value[key],
          order,
          side: key === "cvv" || backKeys.has(key) ? ("back" as const) : ("front" as const),
          sensitive: protectedKeys.has(key),
          redacted:
            card?.draft.fields.some((field) => field.key === key && field.redacted) &&
            value[key] === "",
          source:
            suggestions?.[key as keyof CardSuggestions] === value[key] && value[key] !== ""
              ? ("recognition" as const)
              : (card?.draft.fields.find((field) => field.key === key && field.value === value[key])
                  ?.source ?? ("manual" as const)),
        };
      });
    const draft: CardDraft = {
      id: id.current,
      kind,
      displayName: value.displayName,
      issuer: value.issuer || null,
      templateId: `${kind}-landscape`,
      templateVersion: 1,
      sideState: {
        front: "available",
        back:
          value.backAvailable || (value.retainSecurityCode && value.cvv !== "")
            ? "available"
            : "missing",
      },
      fields: [
        ...fields,
        ...(card?.draft.fields.filter((field) => field.key.startsWith("custom:")) ?? []),
      ],
      appearance: { formFactor: "landscape", palette: value.palette },
      retainSecurityCode: kind === "bank" && value.retainSecurityCode,
    };

    return draft;
  };
  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      await saveWalletCard({
        operationId: operation.current,
        draft: draftFor(value),
        expectedRevision: card?.revision ?? null,
      });
    },
  });
  const readBack = (reading: CardReading) => {
    const back = reading.suggestions;
    if (
      !backMatchesCard(
        kind,
        {
          number: form.getFieldValue("number"),
          meter: form.getFieldValue("meter"),
          account: form.getFieldValue("account"),
        },
        back,
      )
    ) {
      setBackEmpty(false);
      setBackMismatch(true);
      setBackOpen(false);
      return;
    }
    const merged = new Set(backKeys);
    let added = false;
    for (const key of kindKeys[kind]) {
      const value = back[key];
      if (
        value &&
        !form.getFieldValue(key) &&
        !card?.draft.fields.some((field) => field.key === key && field.redacted)
      ) {
        form.setFieldValue(key, value);
        merged.add(key);
        added = true;
      }
    }
    if (!added) {
      setBackEmpty(true);
      setBackMismatch(false);
      setBackOpen(false);
      return;
    }
    setBackEmpty(false);
    setBackKeys(merged);
    form.setFieldValue("backAvailable", true);
    operation.current = crypto.randomUUID();
    setBackOpen(false);
    setBackMismatch(false);
    setPreviewSide("back");
  };
  const labels = fieldLabels(kind);
  const textFields = [
    { name: "displayName", label: t("wallet.displayName"), max: 200 },
    { name: "meter", label: labels.meter, max: 4096 },
    { name: "account", label: labels.account, max: 4096 },
    { name: "puk", label: labels.puk, max: 4096 },
    { name: "holder", label: labels.holder, max: 4096 },
    { name: "number", label: labels.number, max: 4096 },
    { name: "expiry", label: labels.expiry, max: 4096 },
    { name: "issuer", label: t("wallet.issuer"), max: 200 },
  ] as const;
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
      className="mx-auto flex w-full max-w-md flex-col gap-5"
    >
      <form.Subscribe selector={(state) => state.values}>
        {(value) => (
          <section className="flex flex-col gap-3" aria-label={t("wallet.preview")}>
            <CardFace
              side={previewSide}
              card={{
                formatVersion: 1,
                draft: draftFor(value),
                revision: card?.revision ?? 1,
                createdAt: card?.createdAt ?? 0,
                updatedAt: card?.updatedAt ?? 0,
              }}
            />
            {(value.backAvailable || value.retainSecurityCode) && (
              <SegmentedControl
                label={t("wallet.preview")}
                value={previewSide}
                onChange={setPreviewSide}
                options={[
                  { value: "front", label: t("wallet.front") },
                  { value: "back", label: t("wallet.back") },
                ]}
              />
            )}
          </section>
        )}
      </form.Subscribe>
      {suggestions?.numberUncertain && (
        <p role="status" className="text-footnote text-warning">
          {t("wallet.checkScannedNumber")}
        </p>
      )}
      <fieldset disabled={busy} className="min-w-0">
        <legend className="sr-only">{t("wallet.cardDetails")}</legend>
        <Section title={t("wallet.cardDetails")} footer={t("wallet.manualHint")}>
          <LabeledContent label={t("wallet.cardKind")}>
            <PickerInput
              value={kind}
              label={t("wallet.cardKind")}
              options={cardKinds.map((value) => ({ value, label: t(kindMessageKeys[value]) }))}
              onChange={(value) => {
                setKind(value);
                operation.current = crypto.randomUUID();
              }}
            />
          </LabeledContent>
          {textFields
            .filter(
              ({ name }) =>
                name === "displayName" ||
                name === "issuer" ||
                kindKeys[kind].some((key) => key === name),
            )
            .map(({ name, label, max }) => (
              <form.Field key={name} name={name}>
                {(field) => (
                  <LabeledContent label={label}>
                    <input
                      aria-label={label}
                      className="w-full min-w-0 bg-transparent py-0.5 text-end text-footnote text-label-secondary outline-none placeholder:text-label-tertiary focus:text-label focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-accent"
                      type="text"
                      disabled={card?.draft.fields.some(
                        (item) => item.key === name && item.redacted,
                      )}
                      placeholder={
                        card?.draft.fields.some((item) => item.key === name && item.redacted)
                          ? "••••"
                          : undefined
                      }
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      maxLength={max}
                      autoComplete="off"
                      spellCheck={false}
                      required={name === "displayName"}
                      dir={
                        ["number", "expiry", "meter", "account", "puk"].includes(name)
                          ? "ltr"
                          : "auto"
                      }
                      onChange={(event) => {
                        operation.current = crypto.randomUUID();
                        field.handleChange(event.target.value);
                      }}
                    />
                  </LabeledContent>
                )}
              </form.Field>
            ))}
        </Section>
      </fieldset>
      <Section title={t("wallet.security")} footer={t("wallet.securityHint")}>
        {kindKeys[kind]
          .filter((key) => key !== "cvv" && key !== "puk")
          .map((key) => (
            <LabeledContent key={key} label={labels[key]}>
              <Toggle
                style="switch"
                labelHidden
                label={labels[key]}
                checked={protectedKeys.has(key)}
                disabled={card?.draft.fields.some((field) => field.key === key && field.redacted)}
                onChange={(checked) => {
                  setProtectedKeys((previous) => {
                    const next = new Set(previous);
                    if (checked) next.add(key);
                    else next.delete(key);
                    return next;
                  });
                  operation.current = crypto.randomUUID();
                }}
              />
            </LabeledContent>
          ))}
      </Section>
      <Section>
        <button
          type="button"
          onClick={() => setBackOpen(true)}
          className="flex w-full items-center gap-3 px-4 py-3 text-start text-subheadline hover:bg-fill/50"
        >
          <CameraIcon size={18} className="text-accent-text" />
          <span className="grow">{t("wallet.scanBack")}</span>
          <ChevronRightIcon size={16} className="text-label-tertiary rtl:-scale-x-100" />
        </button>
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={appearanceOpen}
          onClick={() => setAppearanceOpen(true)}
          className="flex w-full items-center gap-3 px-4 py-3 text-start text-subheadline hover:bg-fill/50"
        >
          <BrushIcon size={18} className="text-accent-text" />
          <span className="grow">{t("wallet.appearance")}</span>
          <form.Subscribe selector={(state) => state.values.palette}>
            {(palette) => (
              <span
                aria-hidden
                className="size-5 rounded-full border border-separator"
                style={{ background: accents[palette].swatch }}
              />
            )}
          </form.Subscribe>
          <ChevronRightIcon size={16} className="text-label-tertiary rtl:-scale-x-100" />
        </button>
      </Section>
      <Sheet
        open={appearanceOpen}
        onClose={() => setAppearanceOpen(false)}
        label={t("wallet.appearance")}
      >
        <div className="flex flex-col gap-5 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-headline font-semibold">{t("wallet.appearance")}</h2>
            <Button size="sm" variant="ghost" onClick={() => setAppearanceOpen(false)}>
              {t("common.done")}
            </Button>
          </div>
          <form.Field name="palette">
            {(field) => (
              <SwatchPicker
                value={field.state.value}
                label={t("setup.accentColour")}
                options={Object.values(accents).map((accent) => ({
                  value: accent.id,
                  label: t(`wallet.palette.${accent.id}`),
                  color: accent.swatch,
                  ink: accent.light.onAccent,
                }))}
                onChange={(value) => {
                  operation.current = crypto.randomUUID();
                  field.handleChange(value);
                }}
              />
            )}
          </form.Field>
        </div>
      </Sheet>
      <CardBackCapture open={backOpen} onClose={() => setBackOpen(false)} onRead={readBack} />
      {backEmpty && (
        <p role="status" className="text-footnote text-label-secondary">
          {t("wallet.backNoDetails")}
        </p>
      )}
      {backMismatch && (
        <p role="alert" className="text-footnote text-danger">
          {t("wallet.backMismatch")}
        </p>
      )}
      {kind === "bank" && (
        <Section title={t("wallet.security")} footer={t("wallet.securityHint")}>
          <form.Field name="retainSecurityCode">
            {(field) => (
              <LabeledContent label={t("wallet.keepSecurityCode")}>
                <Toggle
                  style="switch"
                  labelHidden
                  label={t("wallet.keepSecurityCode")}
                  checked={field.state.value}
                  onChange={(value) => {
                    operation.current = crypto.randomUUID();
                    field.handleChange(value);
                    if (!value) form.setFieldValue("cvv", "");
                  }}
                />
              </LabeledContent>
            )}
          </form.Field>
          <form.Subscribe selector={(state) => state.values.retainSecurityCode}>
            {(retain) =>
              retain && (
                <form.Field name="cvv">
                  {(field) => (
                    <LabeledContent label={t("wallet.securityCode")}>
                      <input
                        aria-label={t("wallet.securityCode")}
                        className="w-full min-w-0 bg-transparent text-end text-footnote outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        dir="ltr"
                        autoComplete="off"
                        type="password"
                        disabled={card?.draft.fields.some(
                          (item) => item.key === "cvv" && item.redacted,
                        )}
                        placeholder={
                          card?.draft.fields.some((item) => item.key === "cvv" && item.redacted)
                            ? "••••"
                            : undefined
                        }
                        inputMode="numeric"
                        maxLength={4}
                        value={field.state.value}
                        onChange={(event) => {
                          operation.current = crypto.randomUUID();
                          field.handleChange(event.target.value);
                        }}
                      />
                    </LabeledContent>
                  )}
                </form.Field>
              )
            }
          </form.Subscribe>
        </Section>
      )}
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() => showWallet(card ? "detail" : "home")}
        >
          {t("common.cancel")}
        </Button>
        <Button type="submit" size="sm" variant="default" disabled={busy}>
          {busy ? t("wallet.saving") : t("common.save")}
        </Button>
      </div>
    </form>
  );
}
