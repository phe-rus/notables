/**
 * Chapters that should open straight into the recorder, e.g. after
 * "Record chapter" on an audiobook. Each is taken once, when its editor opens.
 */
const pending = new Set<string>();

export function queueRecording(noteId: string): void {
  pending.add(noteId);
}

export function takeRecording(noteId: string): boolean {
  return pending.delete(noteId);
}
