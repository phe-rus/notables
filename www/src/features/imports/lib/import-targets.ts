import type { MediaKind } from "../../books/model/media-kind";
import type { PlannedSeries } from "./import-plan";

/** What an import needs to know about the library: its live series. */
export interface LibrarySeries {
  id: string;
  title: string;
  kind: MediaKind;
  franchiseId: string | null;
  updatedAt: number;
  /** Volume numbers of its live items; null for unnumbered ones. */
  volumes: Array<number | null>;
}

export interface LibrarySnapshot {
  series: LibrarySeries[];
  franchises: Array<{ id: string; title: string }>;
}

export const EMPTY_LIBRARY: LibrarySnapshot = { series: [], franchises: [] };

/** Titles compared for merging: case, accents, punctuation and spacing ignored. */
export function seriesMatchKey(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[\p{P}\p{S}]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const newestFirst = (a: LibrarySeries, b: LibrarySeries) => b.updatedAt - a.updatedAt;

/**
 * Where a planned series goes: into a live series of the same kind and
 * title (skipping volumes it already has), and which franchise to offer
 * when it doesn't merge. A choice already made (an unticked merge) is kept
 * while the target stays the same.
 */
export function resolveTarget(series: PlannedSeries, library: LibrarySnapshot): PlannedSeries {
  const key = seriesMatchKey(series.title);
  const matches = key
    ? library.series.filter((entry) => seriesMatchKey(entry.title) === key).sort(newestFirst)
    : [];
  const target = matches.find((entry) => entry.kind === series.kind);
  const have = new Set(target?.volumes.filter((volume): volume is number => volume !== null));
  const numbered = series.books
    .map((book) => book.volume)
    .filter((volume): volume is number => volume !== null);
  const sameTarget = target && series.mergeInto?.id === target.id;
  const inFranchise = matches.find((entry) => entry.franchiseId);
  const franchise = inFranchise?.franchiseId
    ? library.franchises.find((entry) => entry.id === inFranchise.franchiseId)
    : undefined;
  return {
    ...series,
    mergeInto: target ? { id: target.id, title: target.title } : null,
    merge: target ? (sameTarget ? series.merge : true) : false,
    skippedVolumes: target ? numbered.filter((volume) => have.has(volume)) : [],
    addedVolumes: target ? numbered.filter((volume) => !have.has(volume)) : numbered,
    addedUnnumbered: series.books.filter((book) => book.volume === null).length,
    franchise: franchise ? { id: franchise.id, title: franchise.title } : null,
    joinFranchise: franchise && series.franchise?.id === franchise.id ? series.joinFranchise : true,
  };
}
