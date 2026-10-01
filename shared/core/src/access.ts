import type { Access, Role } from "./schemas";

const RANK: Record<Role, number> = { viewer: 0, commenter: 1, editor: 2 };

export interface Viewer {
  /** `null` for signed-out visitors. */
  accountId: string | null;
  /** Circles the viewer belongs to. */
  circleIds: readonly string[];
}

/**
 * Resolves the viewer's role on a note, or `null` when they have no access.
 * Owners always have full access; public notes grant `commenter` so readers
 * can react, rate and comment on the publication.
 */
export function resolveRole(ownerId: string, access: Access, viewer: Viewer): Role | null {
  if (viewer.accountId === ownerId) return "editor";

  switch (access.visibility) {
    case "private":
      return null;
    case "people":
      return access.grants.find((g) => g.accountId === viewer.accountId)?.role ?? null;
    case "circle":
      return viewer.circleIds.includes(access.circleId) ? access.role : null;
    case "public":
      return viewer.accountId === null ? "viewer" : "commenter";
  }
}

export function can(role: Role | null, required: Role): boolean {
  return role !== null && RANK[role] >= RANK[required];
}
