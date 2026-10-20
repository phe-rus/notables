import { describe, expect, it } from "bun:test";
import { buildCardDraft } from "@/features/wallet/model/build-card-draft";
import { cardFormDefaults } from "@/features/wallet/model/card-form-defaults";
import type { CardDraftContext } from "@/features/wallet/model/types";
import { cardDraftSchema, type WalletCard } from "@/features/wallet/model/wallet-model";

const cardId = "a0000000-0000-4000-8000-000000000001";
const numberId = "a0000000-0000-4000-8000-000000000002";
const codeId = "a0000000-0000-4000-8000-000000000003";
const customId = "a0000000-0000-4000-8000-000000000004";

function context(card: WalletCard | null = null): CardDraftContext {
  return {
    card,
    id: cardId,
    kind: "bank",
    fieldIds: new Map(card?.draft.fields.map((field) => [field.key, field.id])),
    backKeys: new Set(["cvv"]),
    protectedKeys: new Set(["number", "cvv"]),
  };
}

function protectedCard(): WalletCard {
  const values = cardFormDefaults({ card: null });
  values.displayName = "Test bank";
  values.retainSecurityCode = true;
  const draft = buildCardDraft(values, context());
  draft.fields = [
    {
      id: numberId,
      cardId,
      key: "number",
      label: "Number",
      value: "",
      order: 0,
      side: "front",
      source: "recognition",
      sensitive: true,
      redacted: true,
    },
    {
      id: codeId,
      cardId,
      key: "cvv",
      label: "Code",
      value: "",
      order: 1,
      side: "back",
      source: "manual",
      sensitive: true,
      redacted: true,
    },
    {
      id: customId,
      cardId,
      key: "custom:branch",
      label: "Branch",
      value: "Central",
      order: 2,
      side: "back",
      source: "manual",
    },
  ];
  draft.sideState.back = "available";
  return { formatVersion: 1, draft, revision: 3, createdAt: 1, updatedAt: 2 };
}

describe("wallet card draft assembly", () => {
  it("keeps masked fields and custom details when changing public information", () => {
    const card = protectedCard();
    const values = cardFormDefaults({ card });
    values.displayName = "Renamed bank";
    const draft = buildCardDraft(values, context(card));
    expect(cardDraftSchema.safeParse(draft).success).toBe(true);
    expect(draft.fields.find((field) => field.key === "number")).toMatchObject({
      id: numberId,
      value: "",
      redacted: true,
      sensitive: true,
      source: "recognition",
    });
    expect(draft.fields.find((field) => field.key === "cvv")).toMatchObject({
      id: codeId,
      value: "",
      redacted: true,
      side: "back",
    });
    expect(draft.fields.find((field) => field.key === "custom:branch")).toEqual(
      card.draft.fields[2],
    );
    expect(draft.sideState.back).toBe("available");
  });

  it("removes a previously retained masked security code when retention is disabled", () => {
    const card = protectedCard();
    const values = cardFormDefaults({ card });
    values.retainSecurityCode = false;
    const draft = buildCardDraft(values, context(card));
    expect(draft.retainSecurityCode).toBe(false);
    expect(draft.fields.some((field) => field.key === "cvv")).toBe(false);
  });

  it("keeps field identities stable between previews and saving", () => {
    const values = cardFormDefaults({ card: null });
    const state = context();
    const preview = buildCardDraft(values, state);
    values.holder = "Test holder";
    const saved = buildCardDraft(values, state);
    expect(saved.fields.map((field) => field.id)).toEqual(preview.fields.map((field) => field.id));
    expect(saved.fields.find((field) => field.key === "holder")?.value).toBe("Test holder");
  });

  it("retains recognition provenance for unchanged recognized values and marks edits manual", () => {
    const card = protectedCard();
    const number = card.draft.fields[0];
    if (!number) throw new Error("Missing test card number");
    card.draft.fields[0] = { ...number, value: "4111111111111111", redacted: false };
    const values = cardFormDefaults({ card });
    expect(
      buildCardDraft(values, context(card)).fields.find((f) => f.key === "number")?.source,
    ).toBe("recognition");
    values.number = "5555555555554444";
    expect(
      buildCardDraft(values, context(card)).fields.find((f) => f.key === "number")?.source,
    ).toBe("manual");
  });
});
