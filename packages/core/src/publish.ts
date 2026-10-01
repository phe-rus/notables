import * as Y from "yjs";
import { noteDoc, toPlainText } from "./document";
import type { NoteKind } from "./schemas";

export const EXCERPT_LENGTH = 280;

export interface PublicationSnapshot {
  title: string;
  kind: NoteKind;
  excerpt: string;
  /** Full Yjs state, frozen at publish time. Readers never see later edits. */
  state: Uint8Array;
}

/**
 * Freezes a note into a publication snapshot. The source document is not
 * modified: publishing and unpublishing never touch private content.
 */
export function createPublicationSnapshot(doc: Y.Doc, kind: NoteKind): PublicationSnapshot {
  return {
    title: noteDoc.title(doc) || "Untitled",
    kind,
    excerpt: excerpt(toPlainText(doc)),
    state: Y.encodeStateAsUpdate(doc),
  };
}

export function excerpt(text: string, max: number = EXCERPT_LENGTH): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/** Estimated reading time in minutes, at 230 words per minute. */
export function readingMinutes(text: string): number {
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  return Math.max(1, Math.round(words / 230));
}
