import { t } from "../../../i18n/i18n";
import type { BookEntry } from "../store/book-store";
import type { MediaKind } from "./media-kind";

/** Words Notables knows for an item's groups and the entries inside them, translated. */
export const units = [
  "part",
  "volume",
  "season",
  "arc",
  "book",
  "release",
  "spinoff",
  "collection",
  "disc",
  "chapter",
  "episode",
  "track",
  "issue",
  "page",
  "file",
] as const;

export type Unit = (typeof units)[number];

/** What groups can be called: Dragon Ball's seasons, One Piece's arcs, a saga's volumes. */
export const groupUnits: readonly Unit[] = [
  "part",
  "volume",
  "season",
  "arc",
  "book",
  "release",
  "spinoff",
  "collection",
  "disc",
];

/** What each entry can be called: a chapter, an episode, a whole volume in one file. */
export const entryUnits: readonly Unit[] = [
  "chapter",
  "episode",
  "track",
  "volume",
  "issue",
  "page",
  "file",
];

export const isUnit = (value: string): value is Unit =>
  (units as readonly string[]).includes(value);

export const LABEL_MAX = 40;

/** A stored label: a known unit, or a word someone typed, kept as written. */
export interface Structure {
  group: string;
  entry: string;
}

const defaults: Record<MediaKind, Structure> = {
  book: { group: "part", entry: "chapter" },
  comic: { group: "volume", entry: "chapter" },
  manga: { group: "volume", entry: "chapter" },
  audiobook: { group: "part", entry: "chapter" },
};

/** What an item's groups and entries are called: its own words, else its kind's. */
export function structureOf(
  book: Pick<BookEntry, "groupLabel" | "entryLabel">,
  kind: MediaKind,
): Structure {
  const fallback = defaults[kind];
  return {
    group: book.groupLabel?.trim() || fallback.group,
    entry: book.entryLabel?.trim() || fallback.entry,
  };
}

/** "Season" or "Seasons"; a typed word is shown as typed. */
export function unitName(label: string, plural = false): string {
  return isUnit(label) ? t(`books.unit.${label}`, { count: plural ? 100 : 1 }) : label;
}

/** "Season 3", for a group that has no title of its own yet. */
export const numberedName = (label: string, number: number): string =>
  `${unitName(label)} ${number}`;
