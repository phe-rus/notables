import {
  Button,
  cn,
  confirmDialog,
  IconButton,
  NoteIcon,
  SidebarIcon,
  spring,
  TrashIcon,
  useContextMenu,
} from "@ultrapeach/ui";
import { AnimatePresence, motion } from "motion/react";
import { useMemo } from "react";
import { CollapsedSidebarControls } from "../../../components/window/collapsed-sidebar-controls";
import { t } from "../../../i18n/i18n";
import { BookCover } from "../../books/components/book-cover";
import { kindOfBook, kindOfSeries } from "../../books/lib/book-kind";
import { kindLabel, partCountLabel } from "../../books/model/kind-labels";
import { type BookEntry, useTrashedBooks } from "../../books/store/book-store";
import { type SeriesEntry, useSeries } from "../../books/store/series-store";
import { noteKindLabels } from "../../library/model/note-kind-labels";
import { type LibraryEntry, useLibrary } from "../../library/store/library-store";
import { usePreferences } from "../../settings/store/preferences-store";
import { binNotes, binSeriesAndBooks } from "../lib/bin-groups";
import {
  batchItems,
  emptyBin,
  eraseBooks,
  eraseNotes,
  eraseSeries,
  restoreBook,
  restoreNote,
  restoreSeries,
} from "../lib/recycle-bin";
import { daysLeft, RETENTION_DAYS } from "../lib/retention";

type Item =
  | { type: "note"; id: string; trashedAt: number; entry: LibraryEntry }
  | { type: "book"; id: string; trashedAt: number; book: BookEntry }
  | { type: "series"; id: string; trashedAt: number; series: SeriesEntry; books: BookEntry[] };

const titleOf = (item: Item) =>
  item.type === "note"
    ? item.entry.title || t("trash.untitledNote")
    : item.type === "book"
      ? item.book.title || t("trash.untitledBook")
      : item.series.title || t("common.untitled");

/**
 * Deleted notes, books and series, newest first, each with the days it has
 * left. They can be restored, or erased now; after a week they go on their own.
 */
export function RecentlyDeletedScreen({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const notes = useLibrary();
  const trashedBooks = useTrashedBooks();
  const allSeries = useSeries();
  const { collapsed } = usePreferences().sidebar;

  const items = useMemo<Item[]>(() => {
    const { series, books } = binSeriesAndBooks(trashedBooks, allSeries);
    return [
      ...binNotes(notes, trashedBooks).map((entry) => ({
        type: "note" as const,
        id: entry.id,
        trashedAt: entry.trashedAt as number,
        entry,
      })),
      ...books.map((book) => ({
        type: "book" as const,
        id: book.id,
        trashedAt: book.trashedAt as number,
        book,
      })),
      ...series.map((entry) => ({
        type: "series" as const,
        id: entry.id,
        trashedAt: entry.trashedAt ?? 0,
        series: entry,
        books: batchItems(entry),
      })),
    ].sort((a, b) => b.trashedAt - a.trashedAt);
  }, [notes, trashedBooks, allSeries]);

  const confirmEmpty = async () => {
    const confirmed = await confirmDialog({
      title: t("trash.emptyTitle"),
      message: t("trash.emptyBody", { count: items.length }),
      confirmLabel: t("trash.erase"),
      destructive: true,
    });
    if (confirmed) await emptyBin();
  };

  return (
    <div className="flex min-h-0 grow flex-col">
      <header
        data-tauri-drag-region
        className="flex flex-col gap-3 px-5 pt-[max(12px,env(safe-area-inset-top))] pb-2"
      >
        {collapsed && <CollapsedSidebarControls />}
        <div data-tauri-drag-region className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <IconButton label={t("nav.showLibrary")} className="lg:hidden" onClick={onOpenSidebar}>
              <SidebarIcon size={20} />
            </IconButton>
            <h1 className="text-title2 font-bold tracking-tight">{t("nav.recentlyDeleted")}</h1>
          </div>
          {items.length > 0 && (
            <Button variant="ghost" onClick={confirmEmpty} className="text-danger">
              {t("trash.empty")}
            </Button>
          )}
        </div>
      </header>

      <div className="flex grow flex-col overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[640px] flex-col gap-3 px-4 pt-2 pb-32 sm:px-5 md:pb-24">
          <p className="px-1 text-footnote leading-snug text-label-secondary">
            {t("trash.intro", { days: RETENTION_DAYS })}
          </p>
          {items.length === 0 && (
            <div className="flex flex-col items-center gap-3 px-6 pt-20 text-center">
              <span className="flex size-14 items-center justify-center rounded-full bg-fill text-label-tertiary">
                <TrashIcon size={26} />
              </span>
              <p className="text-callout font-semibold">{t("trash.nothingTitle")}</p>
              <p className="max-w-[300px] text-[14px] text-label-secondary">
                {t("trash.nothingBody")}
              </p>
            </div>
          )}
          <ul className="flex flex-col gap-1.5">
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <motion.li
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={spring.smooth}
                >
                  <BinRow item={item} />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </div>
      </div>
    </div>
  );
}

/** "Manga · 3 volumes" for a series, "Book" for a book, "Journal" for a note. */
function describe(item: Item): string {
  if (item.type === "note") return noteKindLabels[item.entry.kind];
  if (item.type === "book") return kindLabel(kindOfBook(item.book));
  const kind = kindLabel(kindOfSeries(item.series));
  return `${kind} · ${partCountLabel(item.books.length, item.series.partLabel)}`;
}

function BinRow({ item }: { item: Item }) {
  const left = daysLeft(item.trashedAt);

  const restore = () => {
    if (item.type === "note") restoreNote(item.entry);
    else if (item.type === "book") restoreBook(item.book);
    else restoreSeries(item.series);
  };
  const erase = async () => {
    const confirmed = await confirmDialog({
      title: t("trash.eraseTitle", { title: titleOf(item) }),
      message:
        item.type === "series"
          ? t("trash.eraseSeriesBody")
          : item.type === "book"
            ? t("trash.eraseBookBody")
            : t("trash.eraseNoteBody"),
      confirmLabel: t("trash.erase"),
      destructive: true,
    });
    if (!confirmed) return;
    if (item.type === "note") await eraseNotes([item.entry]);
    else if (item.type === "book") await eraseBooks([item.book]);
    else await eraseSeries(item.series);
  };
  const menu = useContextMenu(() => [
    { label: t("trash.restore"), onSelect: restore },
    "divider",
    { label: t("trash.eraseNow"), destructive: true, onSelect: () => void erase() },
  ]);
  const cover = item.type === "book" ? item.book : item.type === "series" ? item.books[0] : null;

  return (
    <div
      {...menu}
      className="flex touch-manipulation items-center gap-3 rounded-3xl bg-elevated px-3 py-2.5 shadow-[inset_0_0_0_1px_var(--color-separator)] [-webkit-touch-callout:none]"
    >
      {item.type === "note" ? (
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-fill text-label-secondary">
          <NoteIcon size={18} />
        </span>
      ) : (
        <BookCover
          title={item.type === "series" ? item.series.title : (cover?.title ?? "")}
          author={cover?.author ?? ""}
          image={cover?.cover}
          className="w-9"
        />
      )}
      <span className="flex min-w-0 grow flex-col gap-0.5">
        <span className="truncate text-subheadline font-semibold">{titleOf(item)}</span>
        <span className={cn("text-footnote", left <= 1 ? "text-danger" : "text-label-secondary")}>
          {describe(item)} · {t("trash.daysLeft", { count: left })}
        </span>
      </span>
      <Button variant="secondary" onClick={restore}>
        {t("trash.restore")}
      </Button>
      <IconButton label={t("trash.eraseNow")} onClick={() => void erase()}>
        <TrashIcon size={18} />
      </IconButton>
    </div>
  );
}
