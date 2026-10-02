/**
 * Chapters that should open straight into the drawing studio, e.g. after
 * "Draw a page" on a comic book. Each is taken once, when its editor opens.
 */
const pending = new Set<string>();

export function queueDrawing(noteId: string): void {
  pending.add(noteId);
}

export function takeDrawing(noteId: string): boolean {
  return pending.delete(noteId);
}
