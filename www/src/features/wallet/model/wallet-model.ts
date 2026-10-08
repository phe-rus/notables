import { z } from "zod";

export const cardKinds = [
  "bank",
  "national-id",
  "passport",
  "electricity",
  "television",
  "sim",
  "membership",
  "other",
] as const;
export const cardKindSchema = z.enum(cardKinds);
export type CardKind = z.infer<typeof cardKindSchema>;

export const walletGenerationSchema = z.number().int().positive();

export const walletFieldSchema = z.strictObject({
  id: z.uuid(),
  cardId: z.uuid(),
  key: z.string().max(80),
  label: z.string().min(1).max(80),
  value: z.string().max(4096),
  order: z.number().int().min(0).max(100),
  side: z.enum(["front", "back"]),
  source: z.enum(["manual", "recognition"]),
});
export const appearanceSchema = z.strictObject({
  formFactor: z.literal("landscape"),
  palette: z.enum(["blush", "honey", "sage", "ocean", "lavender", "rose", "graphite"]),
});
export const cardDraftSchema = z.strictObject({
  id: z.uuid(),
  kind: cardKindSchema,
  displayName: z.string().min(1).max(200),
  issuer: z.string().max(200).nullable(),
  templateId: z.enum([
    "bank-landscape",
    "national-id-landscape",
    "passport-landscape",
    "electricity-landscape",
    "television-landscape",
    "sim-landscape",
    "membership-landscape",
    "other-landscape",
  ]),
  templateVersion: z.literal(1),
  sideState: z.strictObject({
    front: z.enum(["available", "missing"]),
    back: z.enum(["available", "missing"]),
  }),
  fields: z.array(walletFieldSchema).max(100),
  appearance: appearanceSchema,
  retainSecurityCode: z.boolean(),
});
export const walletCardSchema = z.strictObject({
  formatVersion: z.literal(1),
  draft: cardDraftSchema,
  revision: z.number().int().positive(),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
});
export const walletPreviewSchema = z.strictObject({
  id: z.uuid(),
  revision: z.number().int().positive(),
  kind: cardKindSchema,
  displayName: z.string(),
  issuer: z.string().nullable(),
  appearance: appearanceSchema,
  lastFour: z.string().max(4).nullable(),
  updatedAt: z.number().int().nonnegative(),
});
export const walletStatusSchema = z.strictObject({
  initialized: z.boolean(),
  secureStoreAvailable: z.boolean(),
  protected: z.boolean(),
  locked: z.boolean(),
  systemAuthAvailable: z.boolean(),
  generation: z.number().int().positive(),
  formatVersion: z.literal(1),
});
export const walletPageSchema = z.strictObject({
  cards: z.array(walletPreviewSchema).max(50),
  nextCursor: z.string().nullable(),
});
export const walletSaveResultSchema = z.strictObject({
  id: z.uuid(),
  revision: z.number().int().positive(),
});
export const walletReceiptSchema = z.strictObject({
  record_revision: z.number().int().positive(),
  vault_revision: z.number().int().positive(),
  deleted: z.boolean(),
});

export type WalletCard = z.infer<typeof walletCardSchema>;
export type CardDraft = z.infer<typeof cardDraftSchema>;
export type WalletPreview = z.infer<typeof walletPreviewSchema>;
export type WalletStatus = z.infer<typeof walletStatusSchema>;
export interface ListRequest {
  cursor: string | null;
  limit: number;
  sort: "updated" | "name";
  search: string;
  kind: CardKind | null;
}
export interface SaveRequest {
  operationId: string;
  draft: CardDraft;
  expectedRevision: number | null;
}

export const kindMessageKeys = {
  bank: "wallet.kindBank",
  "national-id": "wallet.kindNationalId",
  passport: "wallet.kindPassport",
  electricity: "wallet.kindElectricity",
  television: "wallet.kindTelevision",
  sim: "wallet.kindSim",
  membership: "wallet.kindMembership",
  other: "wallet.kindOther",
} as const;
