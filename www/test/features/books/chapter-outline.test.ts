import { describe, expect, it } from "bun:test";
import {
  chapterOutline,
  partsWithout,
  validParts,
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
