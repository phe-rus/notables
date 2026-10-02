import { describe, expect, it } from "bun:test";
import { arrangeShelf, titleInSeries } from "../../../src/features/books/lib/arrange-shelf";
import type { BookEntry } from "../../../src/features/books/store/book-store";
import type { SeriesEntry } from "../../../src/features/books/store/series-store";

const book = (id: string, extra: Partial<BookEntry> = {}): BookEntry => ({
  id,
  title: id,
  subtitle: "",
  author: "",
  chapterIds: [],
  createdAt: 0,
  updatedAt: 0,
  ...extra,
});

const tidewater: SeriesEntry = {
  id: "s1",
  title: "Tidewater",
  author: "",
  format: "comic",
  partLabel: "Volume",
  createdAt: 0,
  updatedAt: 0,
};

describe("arrangeShelf", () => {
  it("gathers a series' volumes in order where its latest book was", () => {
    const items = arrangeShelf(
      [
        book("Embers"),
        book("Tidewater Volume 2", { seriesId: "s1", volume: 2 }),
        book("Field Notes"),
        book("Tidewater Volume 1", { seriesId: "s1", volume: 1 }),
      ],
      [tidewater],
    );
    expect(
      items.map((item) =>
        item.type === "book" ? item.book.id : item.books.map((entry) => entry.id),
      ),
    ).toEqual(["Embers", ["Tidewater Volume 1", "Tidewater Volume 2"], "Field Notes"]);
  });

  it("shows a lone volume as a book", () => {
    const items = arrangeShelf(
      [book("Tidewater Volume 1", { seriesId: "s1", volume: 1 })],
      [tidewater],
    );
    expect(items[0]?.type).toBe("book");
  });

  it("names a volume by its part inside the series", () => {
    expect(titleInSeries(book("Tidewater Volume 2"), tidewater)).toBe("Volume 2");
    expect(titleInSeries(book("The Deep"), tidewater)).toBe("The Deep");
  });
});
