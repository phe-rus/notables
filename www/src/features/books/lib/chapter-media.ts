/**
 * Pages and recordings inside a chapter's serialized document, in reading
 * order: what the comic reader turns and the audiobook player plays.
 */

export interface ChapterRecording {
  src: string;
  durationMs: number;
  transcript: string;
}

interface SerializedNode {
  type?: string;
  src?: unknown;
  durationMs?: unknown;
  transcript?: unknown;
  children?: unknown;
  root?: unknown;
}

function walk(node: unknown, visit: (node: SerializedNode) => void): void {
  if (!node || typeof node !== "object") return;
  const current = node as SerializedNode;
  visit(current);
  if (current.root) walk(current.root, visit);
  if (Array.isArray(current.children)) for (const child of current.children) walk(child, visit);
}

/** Image sources, in order. */
export function chapterPages(document: unknown): string[] {
  const pages: string[] = [];
  walk(document, (node) => {
    if (node.type === "image" && typeof node.src === "string" && node.src) pages.push(node.src);
  });
  return pages;
}

/** Audio clips, in order. */
export function chapterRecordings(document: unknown): ChapterRecording[] {
  const recordings: ChapterRecording[] = [];
  walk(document, (node) => {
    if (node.type !== "audio-clip" || typeof node.src !== "string" || !node.src) return;
    recordings.push({
      src: node.src,
      durationMs: typeof node.durationMs === "number" ? node.durationMs : 0,
      transcript: typeof node.transcript === "string" ? node.transcript : "",
    });
  });
  return recordings;
}

/** True when a chapter is a recording: audio clips, and no writing outside headings. */
export function isRecordingChapter(document: unknown): boolean {
  let recordings = 0;
  let writing = false;
  const visit = (node: unknown, inHeading: boolean) => {
    if (!node || typeof node !== "object") return;
    const current = node as SerializedNode & { text?: unknown };
    if (current.type === "audio-clip") recordings += 1;
    if (current.type === "image") writing = true;
    if (!inHeading && typeof current.text === "string" && current.text.trim()) writing = true;
    const heading = inHeading || current.type === "heading";
    if (current.root) visit(current.root, heading);
    if (Array.isArray(current.children))
      for (const child of current.children) visit(child, heading);
  };
  visit(document, false);
  return recordings > 0 && !writing;
}
