import { Button, LabeledContent, Section, SegmentedControl } from "@phe-rus/hino";
import { Toggle } from "@phe-rus/hino/toggle";
import { type AccentId, accents } from "@phe-rus/hino/tokens";
import { useForm } from "@tanstack/react-form";
import { useRef, useState } from "react";
import { PickerInput } from "../../../components/form/form-fields";
import { t } from "../../../i18n/i18n";
import type { CardSuggestions } from "../lib/card-recognition";
import { fieldLabels } from "../model/card-layout";
import {
  type CardDraft,
  type CardKind,
  cardKinds,
  kindMessageKeys,
  type WalletCard,
} from "../model/wallet-model";
import { saveWalletCard, showWallet, useWallet } from "../store/wallet-store";
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
  const existing = (key: string) =>
    card?.draft.fields.find((field) => field.key === key)?.value ??
    suggestions?.[key as keyof CardSuggestions] ??
    "";
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
    palette: card?.draft.appearance.palette ?? ("honey" as AccentId),
  };
  const draftFor = (value: typeof defaultValues): CardDraft => {
    const labels = { ...fieldLabels(kind), cvv: t("wallet.securityCode") };
    const keys = kindKeys[kind];
    const fields = keys
      .filter((key) => key !== "cvv" || (value.retainSecurityCode && value.cvv !== ""))
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
          side: key === "cvv" ? ("back" as const) : ("front" as const),
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
                      className="w-full min-w-0 bg-transparent py-0.5 text-end text-subheadline text-label-secondary outline-none placeholder:text-label-tertiary focus:text-label focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-accent"
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
      <details className="group">
        <summary className="cursor-pointer px-4 py-2 text-subheadline font-medium text-accent-text">
          {t("wallet.appearance")}
        </summary>
        <div className="mt-2">
          <Section>
            <form.Field name="palette">
              {(field) => (
                <LabeledContent label={t("wallet.appearance")}>
                  <PickerInput
                    value={field.state.value}
                    label={t("wallet.appearance")}
                    options={Object.values(accents).map((accent) => ({
                      value: accent.id,
                      label: t(`wallet.palette.${accent.id}`),
                    }))}
                    onChange={(value) => {
                      operation.current = crypto.randomUUID();
                      field.handleChange(value);
                    }}
                  />
                </LabeledContent>
              )}
            </form.Field>
            <form.Field name="backAvailable">
              {(field) => (
                <div className="px-4 py-3">
                  <Toggle
                    style="checkbox"
                    label={t("wallet.includeBack")}
                    checked={field.state.value}
                    onChange={(value) => {
                      operation.current = crypto.randomUUID();
                      field.handleChange(value);
                    }}
                  />
                </div>
              )}
            </form.Field>
          </Section>
        </div>
      </details>
      {kind === "bank" && (
        <Section>
          <form.Field name="retainSecurityCode">
            {(field) => (
              <div className="px-4 py-3">
                <Toggle
                  style="checkbox"
                  label={t("wallet.keepSecurityCode")}
                  checked={field.state.value}
                  onChange={(value) => {
                    operation.current = crypto.randomUUID();
                    field.handleChange(value);
                    if (!value) form.setFieldValue("cvv", "");
                  }}
                />
              </div>
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
                        className="w-full min-w-0 bg-transparent text-end text-subheadline outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        dir="ltr"
                        autoComplete="off"
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
