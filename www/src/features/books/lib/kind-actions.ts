import { t } from "../../../i18n/i18n";
import type { MediaKind } from "../model/media-kind";
import type { BookEntry } from "../store/book-store";

/** Something an item can do, offered only on the kinds it fits. */
export type KindAction =
  | "read"
  | "listen"
  | "export"
  | "newChapter"
  | "drawPage"
  | "switchKind"
  | "recordChapter"
  | "addAudio";

const actions: Record<MediaKind, readonly KindAction[]> = {
  book: ["read", "export", "newChapter"],
  comic: ["read", "export", "drawPage", "switchKind"],
  manga: ["read", "export", "drawPage", "switchKind"],
  audiobook: ["listen", "export", "recordChapter", "addAudio"],
};

export const actionsFor = (kind: MediaKind): readonly KindAction[] => actions[kind];

export const hasAction = (kind: MediaKind, action: KindAction) => actions[kind].includes(action);

/** Comic for manga, manga for comic. */
export const otherDrawnKind = (kind: MediaKind): "comic" | "manga" =>
  kind === "manga" ? "comic" : "manga";

/** "Switch to Manga", or "Switch Series to Manga" when the whole series changes with it. */
export function switchKindLabel(book: BookEntry, kind: MediaKind): string {
  const toManga = otherDrawnKind(kind) === "manga";
  if (book.seriesId) {
    return toManga ? t("books.action.switchSeriesToManga") : t("books.action.switchSeriesToComic");
  }
  return toManga ? t("books.action.switchToManga") : t("books.action.switchToComic");
}
