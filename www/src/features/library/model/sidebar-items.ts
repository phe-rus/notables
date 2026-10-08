import { t } from "../../../i18n/i18n";

/**
 * Sidebar places people can reorder or hide. All notables, Calendar,
 * Search and Settings are fixed and always present. Related kinds share one place
 * (see viewGroups) so the sidebar stays short.
 */
export type SidebarItemId = "writing" | "books" | "planning" | "invoices" | "published";

export const sidebarItemIds: readonly SidebarItemId[] = [
  "writing",
  "books",
  "planning",
  "invoices",
  "published",
];

export const sidebarItemTitles: Record<SidebarItemId, string> = {
  get writing() {
    return t("nav.writing");
  },
  get books() {
    return t("nav.books");
  },
  get planning() {
    return t("nav.planning");
  },
  get invoices() {
    return t("nav.invoices");
  },
  get published() {
    return t("nav.published");
  },
};

/**
 * Books and Invoices are places of their own, listed under Search beside
 * Calendar and Wallet; the rest are views of your notes, listed after All
 * Notes in the order people choose.
 */
export const sidebarItemSections: Record<SidebarItemId, "places" | "notes"> = {
  books: "places",
  invoices: "places",
  writing: "notes",
  planning: "notes",
  published: "notes",
};

export function isSidebarItemId(value: unknown): value is SidebarItemId {
  return typeof value === "string" && (sidebarItemIds as readonly string[]).includes(value);
}
