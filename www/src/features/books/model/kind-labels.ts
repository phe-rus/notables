import { t } from "../../../i18n/i18n";
import type { BooksShelf } from "../../settings/model/preferences";
import type { MediaKind } from "./media-kind";

/** "Book", "Comic", "Manga" or "Audiobook". */
export const kindLabel = (kind: MediaKind): string => t(`books.kind.${kind}`);

/** A shelf's name: "All", "Books", "Comics"… */
export const shelfLabel = (shelf: BooksShelf): string => t(`books.shelf.${shelf}`);
