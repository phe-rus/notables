import type { NoteKind } from "@notables/core";
import type { LibraryEntry } from "./library";

export type ViewId = "all" | "published" | NoteKind;

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

export const views: View[] = [
  { id: "all", title: "All Notes", kind: "note", matches: () => true },
  byKind("journal", "Journal"),
  byKind("story", "Stories"),
  byKind("article", "Articles"),
  byKind("manga", "Manga"),
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

/** Apple Notes style: the first line is the title, the rest is the preview. */
export function summarize(text: string): { title: string; excerpt: string } {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const [first = "", ...rest] = lines;
  return { title: first.slice(0, 120), excerpt: rest.join(" ").slice(0, 200) };
}
