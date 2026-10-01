import type { NoteKind } from "@notables/core";

/** Singular, human-facing names for each kind of note. */
export const noteKindLabels: Record<NoteKind, string> = {
  note: "Note",
  journal: "Journal",
  story: "Story",
  article: "Article",
  manga: "Manga",
  lesson: "Lesson",
  plan: "Plan",
};
