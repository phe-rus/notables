import { describe, expect, it } from "bun:test";
import { chapterPages, chapterRecordings } from "../../../src/features/books/lib/chapter-media";

const document = {
  root: {
    type: "root",
    children: [
      { type: "heading", children: [{ type: "text", text: "Chapter 1" }] },
      { type: "image", src: "media:a", alt: "", caption: "" },
      { type: "paragraph", children: [{ type: "image", src: "media:b" }] },
      { type: "audio-clip", src: "media:c", durationMs: 4200, transcript: "Hello" },
      { type: "image", src: "" },
    ],
  },
};

describe("chapter media", () => {
  it("lists page images in order", () => {
    expect(chapterPages(document)).toEqual(["media:a", "media:b"]);
  });

  it("lists recordings with their length and transcript", () => {
    expect(chapterRecordings(document)).toEqual([
      { src: "media:c", durationMs: 4200, transcript: "Hello" },
    ]);
  });

  it("copes with missing documents", () => {
    expect(chapterPages(null)).toEqual([]);
    expect(chapterRecordings(undefined)).toEqual([]);
  });
});
