/**
 * Sidebar places people can reorder or hide. All Notes, Search and
 * Settings are fixed and always present. Related kinds share one place
 * (see viewGroups) so the sidebar stays short.
 */
export type SidebarItemId =
  | "writing"
  | "books"
  | "planning"
  | "calendar"
  | "invoices"
  | "published";

export const sidebarItemIds: readonly SidebarItemId[] = [
  "writing",
  "books",
  "planning",
  "calendar",
  "invoices",
  "published",
];

export const sidebarItemTitles: Record<SidebarItemId, string> = {
  writing: "Writing",
  books: "Books",
  planning: "Plan & learn",
  calendar: "Calendar",
  invoices: "Invoices",
  published: "Published",
};

export function isSidebarItemId(value: unknown): value is SidebarItemId {
  return typeof value === "string" && (sidebarItemIds as readonly string[]).includes(value);
}
