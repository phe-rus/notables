import { describe, expect, it } from "bun:test";
import { arrangeShelf, titleInSeries } from "../../../src/features/books/lib/arrange-shelf";
import type { MediaKind } from "../../../src/features/books/model/media-kind";
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
        item.type === "book"
          ? item.book.id
          : item.type === "series"
            ? item.books.map((entry) => entry.id)
            : null,
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

  it("gathers a franchise's series under it, books first, then by kind and title", () => {
    const franchise = { id: "f1", title: "Tidewater", createdAt: 0, updatedAt: 0 };
    const manga = { ...tidewater, franchiseId: "f1" };
    const novels: SeriesEntry = {
      ...tidewater,
      id: "s2",
      title: "Tidewater Novels",
      franchiseId: "f1",
    };
    const kinds: Record<string, MediaKind> = { m1: "manga", m2: "manga", n1: "book", n2: "book" };
    const items = arrangeShelf(
      [
        book("Loose"),
        book("m1", { seriesId: "s1", volume: 1 }),
        book("n1", { seriesId: "s2", volume: 1 }),
        book("m2", { seriesId: "s1", volume: 2 }),
        book("n2", { seriesId: "s2", volume: 2 }),
      ],
      [manga, novels],
      { franchises: [franchise], kindOf: (entry) => kinds[entry.id] ?? "book" },
    );
    expect(items.map((item) => item.type)).toEqual(["book", "franchise"]);
    const group = items[1];
    expect(
      group?.type === "franchise"
        ? group.items.map((item) => (item.type === "series" ? item.series.id : item.book.id))
        : [],
    ).toEqual(["s2", "s1"]);
  });

  it("leaves series standing alone without franchises, and hides empty franchises", () => {
    const franchise = { id: "f1", title: "Tidewater", createdAt: 0, updatedAt: 0 };
    const items = arrangeShelf([book("Loose")], [{ ...tidewater, franchiseId: "f1" }], {
      franchises: [franchise],
    });
    expect(items.map((item) => item.type)).toEqual(["book"]);
  });

  it("names a volume by its part inside the series", () => {
    expect(titleInSeries(book("Tidewater Volume 2"), tidewater)).toBe("Volume 2");
    expect(titleInSeries(book("The Deep"), tidewater)).toBe("The Deep");
  });
});
