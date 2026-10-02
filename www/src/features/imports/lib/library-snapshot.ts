import { getBookStore } from "../../books/store/book-store";
import { getFranchiseStore } from "../../books/store/franchise-store";
import { getSeriesStore } from "../../books/store/series-store";
import type { LibrarySnapshot } from "./import-targets";

/** The live series an import can join, read from the library right now. */
export function librarySnapshot(): LibrarySnapshot {
  const seriesStore = getSeriesStore();
  const live = getBookStore().getSnapshot();
  const series = seriesStore.getSnapshot().flatMap((entry) => {
    const items = live.filter((book) => book.seriesId === entry.id);
    if (items.length === 0) return [];
    return [
      {
        id: entry.id,
        title: entry.title,
        kind: seriesStore.kindOf(entry),
        franchiseId: entry.franchiseId ?? null,
        updatedAt: entry.updatedAt,
        volumes: items.map((book) => book.volume ?? null),
      },
    ];
  });
  const franchises = getFranchiseStore()
    .getSnapshot()
    .map(({ id, title }) => ({ id, title }));
  return { series, franchises };
}
