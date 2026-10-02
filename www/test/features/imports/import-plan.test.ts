import { describe, expect, it } from "bun:test";
import {
  buildImportPlan,
  type ImportFile,
  plannedBookTitle,
} from "../../../src/features/imports/lib/import-plan";
import { parseName } from "../../../src/features/imports/lib/part-names";

const file = (path: string, type = ""): ImportFile => ({
  path,
  name: path.split("/").pop() ?? path,
  type,
  size: 1,
});

describe("parseName", () => {
  it("reads volumes, chapters and episodes", () => {
    expect(parseName("Vol 03")).toMatchObject({ volume: 3, chapter: null });
    expect(parseName("Chapter 012 - The Storm.cbz")).toMatchObject({
      chapter: 12,
      title: "The Storm",
    });
    expect(parseName("Podcast S02E07 Interview.mp3")).toMatchObject({ volume: 2, chapter: 7 });
    expect(parseName("004.jpg")).toMatchObject({ chapter: 4 });
    expect(parseName("01 - Prologue.m4a")).toMatchObject({ chapter: 1, title: "Prologue" });
  });
});

describe("buildImportPlan", () => {
  it("arranges a manga folder into volumes, chapters and pages", () => {
    const plan = buildImportPlan([
      file("One Piece/Vol 02/Chapter 010/002.jpg"),
      file("One Piece/Vol 01/Chapter 002/001.jpg"),
      file("One Piece/Vol 01/Chapter 001/10.jpg"),
      file("One Piece/Vol 01/Chapter 001/2.jpg"),
      file("One Piece/Vol 02/Chapter 010/001.jpg"),
      file("One Piece/.DS_Store"),
    ]);
    expect(plan.series).toHaveLength(1);
    const [series] = plan.series;
    expect(series?.title).toBe("One Piece");
    expect(series?.format).toBe("comic");
    expect(series?.partLabel).toBe("Volume");
    expect(series?.books.map((b) => b.volume)).toEqual([1, 2]);
    expect(series?.books[0]?.chapters.map((c) => c.number)).toEqual([1, 2]);
    expect(series?.books[0]?.chapters[0]?.files.map((f) => f.name)).toEqual(["2.jpg", "10.jpg"]);
    expect(plan.skipped).toEqual([]);
  });

  it("groups numbered e-books into one series", () => {
    const plan = buildImportPlan([
      file("The Expanse - Book 2 - Caliban's War.epub"),
      file("The Expanse - Book 1 - Leviathan Wakes.epub"),
      file("notes.txt"),
    ]);
    expect(plan.series).toHaveLength(1);
    expect(plan.series[0]?.title).toBe("The Expanse");
    expect(plan.series[0]?.books.map((b) => [b.volume, b.title])).toEqual([
      [1, "Leviathan Wakes"],
      [2, "Caliban's War"],
    ]);
    expect(plan.series[0]?.books[0]?.containerKind).toBe("epub");
    expect(plan.skipped).toEqual(["notes.txt"]);
  });

  it("makes an audiobook folder into books of chapters", () => {
    const plan = buildImportPlan([
      file("Narnia/Book 1 The Magician's Nephew/02 The Wood between the Worlds.mp3"),
      file("Narnia/Book 1 The Magician's Nephew/01 The Wrong Door.mp3"),
      file("Narnia/Book 2 The Lion/01 Lucy Looks into a Wardrobe.mp3"),
    ]);
    const [series] = plan.series;
    expect(series?.format).toBe("audio");
    expect(series?.books.map((b) => [b.volume, b.title])).toEqual([
      [1, "The Magician's Nephew"],
      [2, "The Lion"],
    ]);
    expect(series?.books[0]?.chapters.map((c) => c.title)).toEqual([
      "The Wrong Door",
      "The Wood between the Worlds",
    ]);
  });

  it("names loose audiobook tracks by what follows the book number", () => {
    const plan = buildImportPlan([
      file("Night Tales Book 1 - 02 The River.wav"),
      file("Night Tales Book 1 - 01 Opening.wav"),
    ]);
    const [series] = plan.series;
    expect(series?.title).toBe("Night Tales");
    expect(series?.books[0]?.chapters.map((c) => [c.number, c.title])).toEqual([
      [1, "Opening"],
      [2, "The River"],
    ]);
  });

  it("joins volume folders into one series and keeps chapter labels", () => {
    const plan = buildImportPlan([
      file("Red Priest - Volume 5/Chapter 948 Night Shift [Ab1].mp3"),
      file("Red Priest - Volume 5/Chapter 947 House Call [rZtZQmN0jIA].mp3"),
      file("Red Priest - Volume 6/Chapter 1001 Dawn [x9].mp3"),
    ]);
    expect(plan.series).toHaveLength(1);
    const [series] = plan.series;
    expect(series?.title).toBe("Red Priest");
    expect(series?.partLabel).toBe("Volume");
    expect(series?.books.map((b) => [b.volume, b.title])).toEqual([
      [5, ""],
      [6, ""],
    ]);
    expect(series?.books[0]?.chapters.map((c) => [c.number, c.title])).toEqual([
      [947, "Chapter 947 House Call"],
      [948, "Chapter 948 Night Shift"],
    ]);
    const fifth = series?.books[0];
    expect(series && fifth ? plannedBookTitle(series, fifth) : null).toBe("Red Priest Volume 5");
  });

  it("reads a volume folder inside a series folder", () => {
    const plan = buildImportPlan([
      file("Red Priest/Red Priest - Volume 5/Chapter 947 House Call.mp3"),
      file("Red Priest/Red Priest - Volume 6/Chapter 1001 Dawn.mp3"),
    ]);
    expect(plan.series.map((s) => s.title)).toEqual(["Red Priest"]);
    expect(plan.series[0]?.books.map((b) => b.volume)).toEqual([5, 6]);
  });

  it("keeps loose tracks without a volume together as one book", () => {
    const plan = buildImportPlan([
      file("Chapter 948 Night Shift [Ab1].mp3"),
      file("Chapter 947 House Call [rZtZQmN0jIA].mp3"),
    ]);
    expect(plan.series).toHaveLength(1);
    expect(plan.series[0]?.books).toHaveLength(1);
    expect(plan.series[0]?.books[0]?.chapters.map((c) => c.title)).toEqual([
      "Chapter 947 House Call",
      "Chapter 948 Night Shift",
    ]);
  });

  it("reads seasons and episodes from loose files", () => {
    const plan = buildImportPlan([
      file("Night Stories S01E02.mp3"),
      file("Night Stories S02E01.mp3"),
      file("Night Stories S01E01.mp3"),
    ]);
    const [series] = plan.series;
    expect(series?.title).toBe("Night Stories");
    expect(series?.partLabel).toBe("Season");
    expect(series?.books.map((b) => [b.volume, b.chapters.map((c) => c.number)])).toEqual([
      [1, [1, 2]],
      [2, [1]],
    ]);
  });

  it("leaves numbered parts without a title of their own untitled", () => {
    const plan = buildImportPlan([file("Tidewater Vol 01.cbz"), file("Tidewater Vol 02.cbz")]);
    const [series] = plan.series;
    expect(series?.title).toBe("Tidewater");
    expect(series?.books.map((b) => [b.volume, b.title])).toEqual([
      [1, ""],
      [2, ""],
    ]);
    const second = series?.books[1];
    expect(series && second ? plannedBookTitle(series, second) : null).toBe("Tidewater Volume 2");
  });

  it("treats a single e-book as a one-book series", () => {
    const plan = buildImportPlan([file("Things Fall Apart.epub")]);
    expect(plan.series[0]?.books).toHaveLength(1);
    expect(plan.series[0]?.books[0]?.title).toBe("Things Fall Apart");
  });
});
