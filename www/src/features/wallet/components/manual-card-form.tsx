import {
  BrushIcon,
  CameraIcon,
  ChevronRightIcon,
  LabeledContent,
  Section,
  SegmentedControl,
} from "@phe-rus/hino";
import { Button } from "@phe-rus/hino/button";
import { Toggle } from "@phe-rus/hino/toggle";
import { accents } from "@phe-rus/hino/tokens";
import { useForm } from "@tanstack/react-form";
import { useRef, useState } from "react";
import { PickerInput } from "@/components/form/form-fields";
import { t } from "@/i18n/i18n";
import type { CardReading } from "../lib/card-reader";
import { buildCardDraft } from "../model/build-card-draft";
import { backMatchesCard } from "../model/card-back";
import { cardFormDefaults, cardFormKeys } from "../model/card-form-defaults";
import { fieldLabels } from "../model/card-layout";
import { isSecretField } from "../model/card-secrets";
import type { CardFormValues, ManualCardFormProps } from "../model/types";
import { type CardDraft, type CardKind, cardKinds, kindMessageKeys } from "../model/wallet-model";
import { saveWalletCard, showWallet, useWallet } from "../store/wallet-store";
import { CardAppearanceSheet } from "./card-appearance-sheet";
import { CardBackCapture } from "./card-back-capture";
import { CardFace } from "./card-face";

export function ManualCardForm({ card, suggestions }: ManualCardFormProps) {
  const { busy } = useWallet();
  const id = useRef(card?.draft.id ?? crypto.randomUUID());
  const operation = useRef(crypto.randomUUID());
  const fieldIds = useRef(new Map(card?.draft.fields.map((field) => [field.key, field.id]) ?? []));
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
  const defaultValues = cardFormDefaults({ card, suggestions });
  const draftFor = (value: CardFormValues): CardDraft =>
    buildCardDraft(value, {
      card,
      suggestions,
      id: id.current,
      kind,
      fieldIds: fieldIds.current,
      backKeys,
      protectedKeys,
    });
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
    for (const key of cardFormKeys[kind]) {
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
                cardFormKeys[kind].some((key) => key === name),
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
        {cardFormKeys[kind]
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
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setBackOpen(true)}
          className="h-auto w-full justify-start rounded-none px-4 py-3 text-start text-subheadline font-normal [&>span]:w-full [&>span]:justify-start [&>span]:gap-3"
        >
          <CameraIcon size={18} className="text-accent-text" />
          <span className="grow">{t("wallet.scanBack")}</span>
          <ChevronRightIcon size={16} className="text-label-tertiary rtl:-scale-x-100" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          aria-haspopup="dialog"
          aria-expanded={appearanceOpen}
          onClick={() => setAppearanceOpen(true)}
          className="h-auto w-full justify-start rounded-none px-4 py-3 text-start text-subheadline font-normal [&>span]:w-full [&>span]:justify-start [&>span]:gap-3"
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
        </Button>
      </Section>
      <form.Field name="palette">
        {(field) => (
          <CardAppearanceSheet
            open={appearanceOpen}
            palette={field.state.value}
            onClose={() => setAppearanceOpen(false)}
            onChange={(value) => {
              operation.current = crypto.randomUUID();
              field.handleChange(value);
            }}
          />
        )}
      </form.Field>
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
