import type { ComposedContent } from "@notables/pluraliti";

/**
 * Narrations waiting to be written into their new chapter. The chapter's
 * editor takes its narration once, as soon as it opens.
 */
const pending = new Map<string, ComposedContent>();

export function queueNarration(noteId: string, content: ComposedContent): void {
  pending.set(noteId, content);
}

export function takeNarration(noteId: string): ComposedContent | null {
  const content = pending.get(noteId) ?? null;
  pending.delete(noteId);
  return content;
}
