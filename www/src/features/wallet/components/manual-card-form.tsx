import { useForm } from "@tanstack/react-form";
import { type AccentId, accents } from "@ultrapeach/tokens";
import { Button } from "@ultrapeach/ui";
import { useRef, useState } from "react";
import { Field, PickerInput, TextInput } from "../../../components/form/form-fields";
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
      className="flex flex-col gap-6"
    >
      <h2 className="font-serif text-2xl font-semibold">
        {card ? t("wallet.editCard") : t("wallet.addCard")}
      </h2>
      <p className="text-sm text-label-secondary">{t("wallet.manualHint")}</p>
      <fieldset disabled={busy} className="grid min-w-0 gap-4 sm:grid-cols-2">
        <legend className="sr-only">{t("wallet.cardDetails")}</legend>
        <Field label={t("wallet.cardKind")}>
          <PickerInput
            value={kind}
            label={t("wallet.cardKind")}
            options={cardKinds.map((value) => ({ value, label: t(kindMessageKeys[value]) }))}
            onChange={(value) => {
              setKind(value);
              operation.current = crypto.randomUUID();
            }}
          />
        </Field>
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
                <Field label={label}>
                  <TextInput
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    maxLength={max}
                    autoComplete="off"
                    spellCheck={false}
                    required={name === "displayName"}
                    dir={name === "number" || name === "expiry" ? "ltr" : "auto"}
                    onChange={(event) => {
                      operation.current = crypto.randomUUID();
                      field.handleChange(event.target.value);
                    }}
                  />
                </Field>
              )}
            </form.Field>
          ))}
        <form.Field name="palette">
          {(field) => (
            <Field label={t("wallet.appearance")}>
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
            </Field>
          )}
        </form.Field>
        <form.Field name="backAvailable">
          {(field) => (
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={field.state.value}
                onChange={(event) => {
                  operation.current = crypto.randomUUID();
                  field.handleChange(event.target.checked);
                }}
              />
              {t("wallet.includeBack")}
            </label>
          )}
        </form.Field>
        {kind === "bank" && (
          <form.Field name="retainSecurityCode">
            {(field) => (
              <label className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={field.state.value}
                  onChange={(event) => {
                    operation.current = crypto.randomUUID();
                    field.handleChange(event.target.checked);
                    if (!event.target.checked) form.setFieldValue("cvv", "");
                  }}
                />
                {t("wallet.keepSecurityCode")}
              </label>
            )}
          </form.Field>
        )}
        <form.Subscribe selector={(state) => kind === "bank" && state.values.retainSecurityCode}>
          {(retain) =>
            retain && (
              <form.Field name="cvv">
                {(field) => (
                  <Field label={t("wallet.securityCode")}>
                    <TextInput
                      dir="ltr"
                      autoComplete="off"
                      spellCheck={false}
                      maxLength={4096}
                      value={field.state.value}
                      onChange={(event) => {
                        operation.current = crypto.randomUUID();
                        field.handleChange(event.target.value);
                      }}
                    />
                  </Field>
                )}
              </form.Field>
            )
          }
        </form.Subscribe>
      </fieldset>
      <form.Subscribe selector={(state) => state.values}>
        {(value) => (
          <section className="flex max-w-[650px] flex-col gap-4" aria-label={t("wallet.preview")}>
            <h3 className="text-sm font-semibold">{t("wallet.preview")}</h3>
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
            <div className="flex gap-3">
              <Button
                aria-pressed={previewSide === "front"}
                onClick={() => setPreviewSide("front")}
              >
                {t("wallet.front")}
              </Button>
              <Button aria-pressed={previewSide === "back"} onClick={() => setPreviewSide("back")}>
                {t("wallet.back")}
              </Button>
            </div>
          </section>
        )}
      </form.Subscribe>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? t("wallet.saving") : t("common.save")}
        </Button>
        <Button disabled={busy} onClick={() => showWallet(card ? "detail" : "home")}>
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}
