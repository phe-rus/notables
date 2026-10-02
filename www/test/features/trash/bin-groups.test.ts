import { describe, expect, it } from "bun:test";
import type { BookEntry } from "../../../src/features/books/store/book-store";
import type { SeriesEntry } from "../../../src/features/books/store/series-store";
import { binSeriesAndBooks } from "../../../src/features/trash/lib/bin-groups";

const book = (id: string, fields: Partial<BookEntry> = {}): BookEntry => ({
  id,
  title: id,
  subtitle: "",
  author: "",
  chapterIds: [],
  createdAt: 0,
  updatedAt: 0,
  trashedAt: 1,
  ...fields,
});

const series = (fields: Partial<SeriesEntry> = {}): SeriesEntry => ({
  id: "s1",
  title: "Tide",
  author: "",
  format: "comic",
  partLabel: "Volume",
  createdAt: 0,
  updatedAt: 0,
  ...fields,
});

describe("recently deleted series", () => {
  it("folds a series' batch into one row and keeps earlier single deletes apart", () => {
    const deleted = series({ trashedAt: 5, trashBatch: "B" });
    const trashed = [
      book("v1", { seriesId: "s1", trashBatch: "B" }),
      book("v2", { seriesId: "s1" }),
      book("v3", { seriesId: "s1", trashBatch: "B" }),
    ];
    const { series: rows, books } = binSeriesAndBooks(trashed, [deleted]);
    expect(rows.map((entry) => entry.id)).toEqual(["s1"]);
    expect(books.map((entry) => entry.id)).toEqual(["v2"]);
  });

  it("drops the series row once none of its batch is left in the bin", () => {
    const deleted = series({ trashedAt: 5, trashBatch: "B" });
    const { series: rows } = binSeriesAndBooks([book("v2", { seriesId: "s1" })], [deleted]);
    expect(rows).toEqual([]);
  });

  it("does not fold items of another batch", () => {
    const deleted = series({ trashedAt: 5, trashBatch: "B" });
    const { series: rows, books } = binSeriesAndBooks(
      [book("v1", { seriesId: "s1", trashBatch: "A" })],
      [deleted],
    );
    expect(rows).toEqual([]);
    expect(books.map((entry) => entry.id)).toEqual(["v1"]);
  });
});
