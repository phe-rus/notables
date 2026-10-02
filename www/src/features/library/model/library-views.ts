import type { NoteKind } from "@notables/core";
import { t } from "../../../i18n/i18n";
import type { Messages } from "../../../i18n/messages/en";
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

type ViewTitleKey = keyof Messages["views"];

/** Titles are read when shown, so they follow the app's language. */
const titled = (key: ViewTitleKey) => ({
  get title() {
    return t(`views.${key}`);
  },
});

const byKind = (id: NoteKind & ViewTitleKey): View => ({
  id,
  ...titled(id),
  kind: id,
  matches: (entry) => entry.kind === id,
});

const anyOf = (id: ViewId & ViewTitleKey, kinds: NoteKind[]): View => ({
  id,
  ...titled(id),
  kind: kinds[0] ?? "note",
  matches: (entry) => kinds.includes(entry.kind),
});

export const writingKinds: NoteKind[] = ["journal", "story", "article"];
export const readingKinds: NoteKind[] = ["manga", "comic"];
export const planningKinds: NoteKind[] = ["lesson", "plan"];

export const views: View[] = [
  { id: "all", ...titled("all"), kind: "note", matches: () => true },
  anyOf("writing", writingKinds),
  byKind("journal"),
  byKind("story"),
  byKind("article"),
  byKind("manga"),
  byKind("comic"),
  anyOf("planning", planningKinds),
  byKind("lesson"),
  byKind("plan"),
  {
    id: "published",
    ...titled("published"),
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

const option = (id: ViewId | "books", key: ViewTitleKey) => ({
  id,
  get label() {
    return t(`views.${key}`);
  },
});

const group = (id: GroupId, key: ViewTitleKey, options: ViewGroup["options"]): ViewGroup => ({
  id,
  get title() {
    return t(`views.${key}`);
  },
  options,
});

export const viewGroups: Record<GroupId, ViewGroup> = {
  writing: group("writing", "writing", [
    option("writing", "allShort"),
    option("journal", "journal"),
    option("story", "story"),
    option("article", "article"),
  ]),
  books: group("books", "books", [
    option("books", "books"),
    option("manga", "manga"),
    option("comic", "comic"),
  ]),
  planning: group("planning", "planning", [
    option("planning", "allShort"),
    option("lesson", "lesson"),
    option("plan", "plan"),
  ]),
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
