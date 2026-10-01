import { z } from "zod";
import { AccountId, Id } from "./primitives";

export const Role = z.enum(["viewer", "commenter", "editor"]);
export type Role = z.infer<typeof Role>;

export const Grant = z.object({
  accountId: AccountId,
  role: Role,
});
export type Grant = z.infer<typeof Grant>;

export const Access = z.discriminatedUnion("visibility", [
  z.object({ visibility: z.literal("private") }),
  z.object({ visibility: z.literal("people"), grants: z.array(Grant) }),
  z.object({ visibility: z.literal("circle"), circleId: Id, role: Role }),
  z.object({ visibility: z.literal("public"), publicationId: Id }),
]);
export type Access = z.infer<typeof Access>;

/** A named group of accounts, e.g. "Family" or "Close friends". */
export const Circle = z.object({
  id: Id,
  ownerId: AccountId,
  name: z.string().min(1).max(80),
  memberIds: z.array(AccountId),
});
export type Circle = z.infer<typeof Circle>;
