import type { NoteKind } from "@notables/core";
import type { LibraryEntry } from "../store/library-store";

export type GroupId = "writing" | "books" | "planning";
export type ViewId = "all" | "published" | "writing" | "planning" | NoteKind;

export interface View {
  id: ViewId;
  title: string;
  /** The kind a new note gets when created from this view. */
  kind: NoteKind;
  matches: (entry: LibraryEntry) => boolean;
}

const byKind = (id: NoteKind, title: string): View => ({
  id,
  title,
  kind: id,
  matches: (entry) => entry.kind === id,
});

const anyOf = (id: ViewId, title: string, kinds: NoteKind[]): View => ({
  id,
  title,
  kind: kinds[0] ?? "note",
  matches: (entry) => kinds.includes(entry.kind),
});

export const writingKinds: NoteKind[] = ["journal", "story", "article"];
export const readingKinds: NoteKind[] = ["manga", "comic"];
export const planningKinds: NoteKind[] = ["lesson", "plan"];

export const views: View[] = [
  { id: "all", title: "All Notes", kind: "note", matches: () => true },
  anyOf("writing", "Writing", writingKinds),
  byKind("journal", "Journal"),
  byKind("story", "Stories"),
  byKind("article", "Articles"),
  byKind("manga", "Manga"),
  byKind("comic", "Comics"),
  anyOf("planning", "Plan & learn", planningKinds),
  byKind("lesson", "Lessons"),
  byKind("plan", "Plans"),
  {
    id: "published",
    title: "Published",
    kind: "article",
    matches: (entry) => entry.publicationId !== null,
  },
];

export function getView(id: string | undefined): View {
  return views.find((view) => view.id === id) ?? (views[0] as View);
}

/**
 * Related kinds share one place in the sidebar, with a switcher at the top
 * of the list: Writing (journal, stories, articles), Books (books, manga,
 * comics) and Plan & learn (lessons, plans).
 */
export interface ViewGroup {
  id: GroupId;
  title: string;
  /** "books" is the books shelf; the rest are note views. */
  options: Array<{ id: ViewId | "books"; label: string }>;
}

export const viewGroups: Record<GroupId, ViewGroup> = {
  writing: {
    id: "writing",
    title: "Writing",
    options: [
      { id: "writing", label: "All" },
      { id: "journal", label: "Journal" },
      { id: "story", label: "Stories" },
      { id: "article", label: "Articles" },
    ],
  },
  books: {
    id: "books",
    title: "Books",
    options: [
      { id: "books", label: "Books" },
      { id: "manga", label: "Manga" },
      { id: "comic", label: "Comics" },
    ],
  },
  planning: {
    id: "planning",
    title: "Plan & learn",
    options: [
      { id: "planning", label: "All" },
      { id: "lesson", label: "Lessons" },
      { id: "plan", label: "Plans" },
    ],
  },
};

/** The group a view belongs to, if any. */
export function groupOf(id: ViewId | "books"): GroupId | null {
  for (const group of Object.values(viewGroups)) {
    if (group.options.some((option) => option.id === id)) return group.id;
  }
  return null;
}

/** Apple Notes style: the first line is the title, the rest is the preview. */
export function summarize(text: string): { title: string; excerpt: string } {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const [first = "", ...rest] = lines;
  return { title: first.slice(0, 120), excerpt: rest.join(" ").slice(0, 200) };
}
