import { describe, expect, it } from "bun:test";
import {
  directionOf,
  formatOf,
  itemKind,
  kindFromFormat,
  seriesKind,
  storedKind,
} from "../../../src/features/books/model/media-kind";
import type { BookEntry } from "../../../src/features/books/store/book-store";
import type { SeriesEntry } from "../../../src/features/books/store/series-store";

const book = (fields: Partial<BookEntry> = {}): BookEntry => ({
  id: "b1",
  title: "",
  subtitle: "",
  author: "",
  chapterIds: [],
  createdAt: 0,
  updatedAt: 0,
  ...fields,
});

const series = (fields: Partial<SeriesEntry> = {}): SeriesEntry => ({
  id: "s1",
  title: "One Piece",
  author: "",
  format: "comic",
  partLabel: "Volume",
  createdAt: 0,
  updatedAt: 0,
  ...fields,
});

describe("media kinds", () => {
  it("reads entries saved before kinds from format and direction", () => {
    expect(kindFromFormat(undefined)).toBe("book");
    expect(kindFromFormat("prose")).toBe("book");
    expect(kindFromFormat("comic", "rtl")).toBe("manga");
    expect(kindFromFormat("comic", "ltr")).toBe("comic");
    expect(kindFromFormat("comic")).toBe("comic");
    expect(kindFromFormat("audio")).toBe("audiobook");
    expect(storedKind(book({ format: "comic", direction: "rtl" }))).toBe("manga");
  });

  it("writes each kind as the format and direction older versions read", () => {
    expect([formatOf("book"), directionOf("book")]).toEqual(["prose", "ltr"]);
    expect([formatOf("comic"), directionOf("comic")]).toEqual(["comic", "ltr"]);
    expect([formatOf("manga"), directionOf("manga")]).toEqual(["comic", "rtl"]);
    expect([formatOf("audiobook"), directionOf("audiobook")]).toEqual(["audio", "ltr"]);
  });

  it("trusts format and direction when an older version changed them", () => {
    expect(storedKind(book({ kind: "book", format: "audio", direction: "ltr" }))).toBe("audiobook");
    expect(storedKind(book({ kind: "manga", format: "comic", direction: "ltr" }))).toBe("comic");
    expect(storedKind(book({ kind: "manga", format: "comic", direction: "rtl" }))).toBe("manga");
  });

  it("lets a series decide the kind of its items", () => {
    const volume = book({ seriesId: "s1", kind: "comic", format: "comic", direction: "ltr" });
    expect(itemKind(volume, series({ kind: "manga" }))).toBe("manga");
    expect(itemKind(volume)).toBe("comic");
  });

  it("falls back from a series' kind to its first item, then its format", () => {
    const volume = book({ seriesId: "s1", format: "comic", direction: "rtl" });
    expect(seriesKind(series(), [volume])).toBe("manga");
    expect(seriesKind(series())).toBe("comic");
    expect(seriesKind(series({ format: "audio" }))).toBe("audiobook");
  });
});
