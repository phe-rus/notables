import type { NoteKind } from "@notables/core";

/** Singular, human-facing names for each kind of note. */
export const noteKindLabels: Record<NoteKind, string> = {
  note: "Note",
  journal: "Journal",
  story: "Story",
  article: "Article",
  manga: "Manga",
  comic: "Comic",
  lesson: "Lesson",
  plan: "Plan",
};

/** Lowercase plurals, for sentences: "Add stories…". */
export const noteKindPlural: Record<NoteKind, string> = {
  note: "notes",
  journal: "journal entries",
  story: "stories",
  article: "articles",
  manga: "manga",
  comic: "comics",
  lesson: "lessons",
  plan: "plans",
};
