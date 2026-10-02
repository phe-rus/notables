import { describe, expect, it } from "bun:test";
import { isRecordingChapter } from "../../../src/features/books/lib/chapter-media";

const heading = (text: string) => ({
  type: "heading",
  tag: "h1",
  children: [{ type: "text", text }],
});
const clip = { type: "audio-clip", src: "media:1", durationMs: 1000, transcript: "" };
const paragraph = (text: string) => ({ type: "paragraph", children: [{ type: "text", text }] });
const doc = (...children: unknown[]) => ({ root: { type: "root", children } });

describe("recording chapters", () => {
  it("counts an imported track: a title and its audio", () => {
    expect(isRecordingChapter(doc(heading("Prophecy"), clip))).toBe(true);
  });

  it("does not count written chapters, or audio with writing around it", () => {
    expect(isRecordingChapter(doc(heading("Chapter 1"), paragraph("It was late.")))).toBe(false);
    expect(isRecordingChapter(doc(clip, paragraph("Notes on the clip")))).toBe(false);
    expect(isRecordingChapter(doc(heading("Empty")))).toBe(false);
  });
});
