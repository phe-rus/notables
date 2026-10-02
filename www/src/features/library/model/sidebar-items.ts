import type { ViewId } from "./library-views";

/**
 * Sidebar entries people can reorder or hide. All Notes, Search and
 * Settings are fixed and always present.
 */
export type SidebarItemId = Exclude<ViewId, "all" | "note"> | "books";

export const sidebarItemIds: readonly SidebarItemId[] = [
  "journal",
  "story",
  "article",
  "manga",
  "lesson",
  "plan",
  "books",
  "published",
];

export const sidebarItemTitles: Record<SidebarItemId, string> = {
  journal: "Journal",
  story: "Stories",
  article: "Articles",
  manga: "Manga",
  lesson: "Lessons",
  plan: "Plans",
  books: "Books",
  published: "Published",
};

export function isSidebarItemId(value: unknown): value is SidebarItemId {
  return typeof value === "string" && (sidebarItemIds as readonly string[]).includes(value);
}
