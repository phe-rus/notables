import { describe, expect, it } from "bun:test";
import {
  chapterOutline,
  partSpans,
  partsWithout,
  validParts,
  withChapterMoved,
  withChaptersInserted,
  withChaptersSwapped,
  withPartMoved,
} from "../../../src/features/books/lib/chapter-outline";
import type { Part } from "../../../src/features/books/store/book-store";

const part = (id: string, startsAt: string): Part => ({ id, title: id, startsAt });
const all = () => true;

describe("chapter outline", () => {
  it("groups chapters under parts, leaving earlier chapters in no part", () => {
    const book = { chapterIds: ["a", "b", "c", "d"], parts: [part("Two", "d"), part("One", "b")] };
    expect(chapterOutline(book, all)).toEqual([
      { chapterIds: ["a"] },
      { part: part("One", "b"), chapterIds: ["b", "c"] },
      { part: part("Two", "d"), chapterIds: ["d"] },
    ]);
  });

  it("ignores markers that point at no chapter", () => {
    const book = { chapterIds: ["a"], parts: [part("Gone", "z")] };
    expect(validParts(book)).toEqual([]);
    expect(chapterOutline(book, all)).toEqual([{ chapterIds: ["a"] }]);
  });

  it("starts a part at its first live chapter and hides parts with none", () => {
    const book = { chapterIds: ["a", "b", "c"], parts: [part("One", "a"), part("Two", "c")] };
    const live = (id: string) => id !== "a" && id !== "c";
    expect(chapterOutline(book, live)).toEqual([{ part: part("One", "a"), chapterIds: ["b"] }]);
  });

  it("moves a part to its next chapter when its first one is removed", () => {
    const book = { chapterIds: ["a", "b", "c"], parts: [part("One", "a"), part("Two", "c")] };
    expect(partsWithout(book, "a")).toEqual([part("One", "b"), part("Two", "c")]);
    expect(partsWithout(book, "c")).toEqual([part("One", "a")]);
  });

  it("drops a part whose only chapter is removed", () => {
    const book = { chapterIds: ["a", "b"], parts: [part("One", "a"), part("Two", "b")] };
    expect(partsWithout(book, "a")).toEqual([part("Two", "b")]);
  });
});

describe("arranging parts", () => {
  const book = {
    chapterIds: ["a", "b", "c", "d", "e"],
    parts: [part("One", "b"), part("Two", "d")],
  };

  it("finds each part's span of chapters", () => {
    expect(partSpans(book)).toEqual([
      { part: part("One", "b"), start: 1, end: 3 },
      { part: part("Two", "d"), start: 3, end: 5 },
    ]);
  });

  it("moves a chapter to the end of another part", () => {
    expect(withChapterMoved(book, "a", "One").chapterIds).toEqual(["b", "c", "a", "d", "e"]);
    expect(withChapterMoved(book, "c", "Two").chapterIds).toEqual(["a", "b", "d", "e", "c"]);
  });

  it("moves a chapter out of every part, before the first one", () => {
    expect(withChapterMoved(book, "e", null).chapterIds).toEqual(["a", "e", "b", "c", "d"]);
  });

  it("keeps a part when the chapter it starts at moves away", () => {
    const moved = withChapterMoved(book, "b", "Two");
    expect(moved.chapterIds).toEqual(["a", "c", "d", "e", "b"]);
    expect(moved.parts).toEqual([part("One", "c"), part("Two", "d")]);
  });

  it("changes nothing when moving a part's only chapter into it", () => {
    const single = { chapterIds: ["a", "b"], parts: [part("One", "b")] };
    expect(withChapterMoved(single, "b", "One")).toEqual(single);
  });

  it("swaps a part and its chapters with its neighbour", () => {
    expect(withPartMoved(book, "Two", -1).chapterIds).toEqual(["a", "d", "e", "b", "c"]);
    expect(withPartMoved(book, "One", 1).chapterIds).toEqual(["a", "d", "e", "b", "c"]);
    expect(withPartMoved(book, "One", -1)).toBe(book);
  });

  it("inserts new chapters at the end of a part", () => {
    expect(withChaptersInserted(book, ["x"], "One")).toEqual(["a", "b", "c", "x", "d", "e"]);
    expect(withChaptersInserted(book, ["x"], null)).toEqual(["a", "b", "c", "d", "e", "x"]);
  });

  it("keeps a part's opening when its first two chapters swap", () => {
    const swapped = withChaptersSwapped(book, "b", "c");
    expect(swapped.chapterIds).toEqual(["a", "c", "b", "d", "e"]);
    expect(swapped.parts).toEqual([part("One", "c"), part("Two", "d")]);
  });
});
