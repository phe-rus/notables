import { AccountId, Grant, type Role, resolveRole } from "@notables/core";
import { z } from "zod";

/**
 * Access list stored inside each note's Durable Object. Circles are expanded
 * into individual grants by the API worker, so the sync layer only needs to
 * know about accounts.
 */
export const DocumentAcl = z.object({
  ownerId: AccountId,
  grants: z.array(Grant),
});
export type DocumentAcl = z.infer<typeof DocumentAcl>;

export const AclUpdate = z.object({ grants: z.array(Grant) });

export function roleFor(acl: DocumentAcl | null, accountId: string): Role | null {
  // An unowned document is claimed by its first authenticated connection:
  // the creating device syncs before anyone else can know the note's id.
  if (!acl) return "editor";
  return resolveRole(
    acl.ownerId,
    { visibility: "people", grants: acl.grants },
    { accountId, circleIds: [] },
  );
}
