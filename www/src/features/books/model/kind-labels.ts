import { t } from "../../../i18n/i18n";
import type { BooksShelf } from "../../settings/model/preferences";
import type { MediaKind } from "./media-kind";

/** "Book", "Comic", "Manga" or "Audiobook". */
export const kindLabel = (kind: MediaKind): string => t(`books.kind.${kind}`);

/** A shelf's name: "All", "Books", "Comics"… */
export const shelfLabel = (shelf: BooksShelf): string => t(`books.shelf.${shelf}`);

const partLabels = { Book: "book", Volume: "volume", Season: "season" } as const;

/**
 * "3 volumes": the three labels Notables writes are translated with the
 * language's plural forms; a label someone typed is shown as they wrote it.
 */
export function partCountLabel(count: number, partLabel: string): string {
  const known = partLabels[partLabel as keyof typeof partLabels];
  return known ? t(`books.partCount.${known}`, { count }) : `${count} ${partLabel}`;
}
