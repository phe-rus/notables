import type { TranscriptSegment } from "@notables/core";

export interface ParagraphOptions {
  /** A silence this long starts a new paragraph. */
  pauseMs?: number;
  /** Paragraphs longer than this break at the next sentence. */
  maxLength?: number;
}

/**
 * Turns timed transcript segments into readable paragraphs: speakers
 * naturally pause between thoughts, so long silences become paragraph
 * breaks, and very long runs break at a sentence end.
 */
export function transcriptParagraphs(
  segments: TranscriptSegment[],
  { pauseMs = 2500, maxLength = 600 }: ParagraphOptions = {},
): string[] {
  const paragraphs: string[] = [];
  let current = "";
  let lastEnd: number | null = null;

  for (const segment of segments) {
    const text = segment.text.trim();
    if (!text) continue;
    const paused = lastEnd !== null && segment.startMs - lastEnd >= pauseMs;
    const tooLong = current.length >= maxLength && /[.!?…]["”’)]?$/.test(current);
    if (current && (paused || tooLong)) {
      paragraphs.push(current);
      current = "";
    }
    current = current ? `${current} ${text}` : text;
    lastEnd = segment.endMs;
  }
  if (current) paragraphs.push(current);
  return paragraphs.map((paragraph) => paragraph.charAt(0).toUpperCase() + paragraph.slice(1));
}
