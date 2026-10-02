import type { NoteKind } from "@notables/core";
import { t } from "../../../i18n/i18n";

const kinds: NoteKind[] = [
  "note",
  "journal",
  "story",
  "article",
  "manga",
  "comic",
  "lesson",
  "plan",
];

/** Labels read when shown, so they follow the app's language. */
function labels(group: "kinds" | "kindsPlural"): Record<NoteKind, string> {
  const result = {} as Record<NoteKind, string>;
  for (const kind of kinds) {
    Object.defineProperty(result, kind, {
      enumerable: true,
      get: () => t(`${group}.${kind}`),
    });
  }
  return result;
}

/** Singular, human-facing names for each kind of note. */
export const noteKindLabels: Record<NoteKind, string> = labels("kinds");

/** Lowercase plurals, for sentences: "Add stories…". */
export const noteKindPlural: Record<NoteKind, string> = labels("kindsPlural");
