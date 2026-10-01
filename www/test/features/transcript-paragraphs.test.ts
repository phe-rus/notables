import { describe, expect, it } from "bun:test";
import { transcriptParagraphs } from "../../src/features/books/narration/lib/transcript-paragraphs";

const seg = (startMs: number, endMs: number, text: string) => ({ startMs, endMs, text });

describe("transcriptParagraphs", () => {
  it("joins continuous speech and breaks at long pauses", () => {
    expect(
      transcriptParagraphs([
        seg(0, 1500, "we walked to the market"),
        seg(1700, 3000, "before the sun was up."),
        seg(7000, 9000, "the mangoes were stacked like little suns."),
      ]),
    ).toEqual([
      "We walked to the market before the sun was up.",
      "The mangoes were stacked like little suns.",
    ]);
  });

  it("breaks very long runs at the end of a sentence", () => {
    const sentence = "This is a sentence that goes on for a while.";
    const segments = Array.from({ length: 6 }, (_, i) => seg(i * 1000, i * 1000 + 900, sentence));
    const paragraphs = transcriptParagraphs(segments, { maxLength: 100 });
    expect(paragraphs.length).toBeGreaterThan(1);
    expect(paragraphs.every((p) => p.endsWith("."))).toBe(true);
  });

  it("ignores empty segments", () => {
    expect(transcriptParagraphs([seg(0, 1, "  "), seg(2, 3, "hello")])).toEqual(["Hello"]);
  });
});
