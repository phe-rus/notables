import type * as Y from "yjs";
import { noteDoc } from "./document";
import type { NoteKind } from "./schemas";

export const EXCERPT_LENGTH = 280;

export interface PublicationSnapshot<Document = unknown> {
  title: string;
  kind: NoteKind;
  excerpt: string;
  /** The editor's serialized document, frozen at publish time. */
  document: Document;
}

/**
 * Freezes a note into a publication snapshot. `text` and `document` are the
 * note's plain text and serialized content as produced by the editor. The
 * source document is not modified: publishing and unpublishing never touch
 * private content.
 */
export function createPublicationSnapshot<Document>(
  doc: Y.Doc,
  options: { kind: NoteKind; text: string; document: Document },
): PublicationSnapshot<Document> {
  const body = [options.text, noteDoc.transcriptText(doc)].filter(Boolean).join("\n\n");
  return {
    title: noteDoc.title(doc).trim() || "Untitled",
    kind: options.kind,
    excerpt: excerpt(body),
    document: options.document,
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
