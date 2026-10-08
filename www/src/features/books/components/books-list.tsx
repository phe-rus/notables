import { Link, useNavigate } from "@tanstack/react-router";
import {
  BookIcon,
  Button,
  CheckIcon,
  cn,
  confirmDialog,
  DownloadIcon,
  IconButton,
  openContextMenu,
  openMenu,
  SegmentedControl,
  SidebarIcon,
  spring,
  TrashIcon,
  useContextMenu,
} from "@ultrapeach/ui";
import { AnimatePresence, motion } from "motion/react";
import { type MouseEvent, useEffect, useMemo, useRef, useState } from "react";
import { CollapsedSidebarControls } from "../../../components/window/collapsed-sidebar-controls";
import { t } from "../../../i18n/i18n";
import { ImportSheet } from "../../imports/components/import-sheet";
import { GroupSwitcher } from "../../library/components/group-switcher";
import type { BooksShelf } from "../../settings/model/preferences";
import { updatePreferences, usePreferences } from "../../settings/store/preferences-store";
import { liveSeriesItems, moveBooksToBin, moveSeriesToBin } from "../../trash/lib/recycle-bin";
import { RETENTION_DAYS } from "../../trash/lib/retention";
import { ownChapters } from "../actions/erase-book";
import { switchComicKind } from "../actions/switch-kind";
import { exportMenuItems } from "../export/export-book-button";
import { arrangeShelf, type SeriesOrBook, titleInSeries } from "../lib/arrange-shelf";
import { kindOfBook } from "../lib/book-kind";
import { hasAction, otherDrawnKind, switchKindLabel } from "../lib/kind-actions";
import { kindLabel, partCountLabel, shelfLabel } from "../model/kind-labels";
import { isDrawnKind, type MediaKind, mediaKinds } from "../model/media-kind";
import { type BookEntry, getBookStore, useBooks } from "../store/book-store";
import { type FranchiseEntry, getFranchiseStore, useFranchises } from "../store/franchise-store";
import { type SeriesEntry, useSeries } from "../store/series-store";
import { BookCover } from "./book-cover";
import { BookSelectionProvider, useBookSelection } from "./book-selection";
import { FranchiseSheet, type FranchiseTask } from "./franchise-sheet";

interface BooksListProps {
  activeId?: string;
  onOpenSidebar: () => void;
  className?: string;
}

export function BooksList(props: BooksListProps) {
  return (
    <BookSelectionProvider>
      <BooksListContent {...props} />
    </BookSelectionProvider>
  );
}

function BooksListContent({ activeId, onOpenSidebar, className }: BooksListProps) {
  const allBooks = useBooks();
  const selection = useBookSelection();
  const series = useSeries();
  const preferences = usePreferences();
  const { collapsed } = preferences.sidebar;
  // Kinds with something on their shelf; a kind left empty falls back to All.
  const kinds = useMemo(() => {
    const present = new Set(allBooks.map(kindOfBook));
    return mediaKinds.filter((kind) => present.has(kind));
  }, [allBooks]);
  const current: BooksShelf =
    preferences.booksShelf !== "all" && kinds.includes(preferences.booksShelf)
      ? preferences.booksShelf
      : "all";
  const books = useMemo(
    () => (current === "all" ? allBooks : allBooks.filter((book) => kindOfBook(book) === current)),
    [allBooks, current],
  );
  const franchises = useFranchises();
  // Franchises gather their series on All; a kind shelf names them under each series.
  const shelf = useMemo(
    () => arrangeShelf(books, series, current === "all" ? { franchises, kindOf: kindOfBook } : {}),
    [books, series, franchises, current],
  );
  const franchiseOf = useMemo(() => {
    const byId = new Map(franchises.map((entry) => [entry.id, entry]));
    return (entry?: SeriesEntry) => (entry?.franchiseId ? byId.get(entry.franchiseId) : undefined);
  }, [franchises]);
  const seriesById = useMemo(() => new Map(series.map((entry) => [entry.id, entry])), [series]);
  const [franchiseTask, setFranchiseTask] = useState<FranchiseTask | null>(null);
  const navigate = useNavigate();

  const [importing, setImporting] = useState(false);

  const createBook = (kind: MediaKind = "book") => {
    const book = getBookStore().create(kind);
    void navigate({ to: "/books/$bookId", params: { bookId: book.id } });
  };
  const chooseNewBook = (event: MouseEvent<HTMLElement>) => {
    openMenu(
      event.currentTarget,
      mediaKinds.map((kind) => ({ label: kindLabel(kind), onSelect: () => createBook(kind) })),
      { edge: "trailing" },
    );
  };
  const chooseShelf = (booksShelf: BooksShelf) =>
    updatePreferences((previous) => ({ ...previous, booksShelf }));

  const { selecting, selected, stop } = selection;
  // A selected series heading stands for all its volumes.
  const selectedSeries = series.filter((entry) => selected.has(entry.id));
  const chosenSeries = new Set(selectedSeries.map((entry) => entry.id));
  const selectedCount =
    selectedSeries.length +
    books.filter(
      (book) => selected.has(book.id) && !(book.seriesId && chosenSeries.has(book.seriesId)),
    ).length;
  const allSelected = books.length > 0 && books.every((book) => selected.has(book.id));
  const deleteSelected = () => {
    moveSeriesToBin(
      selectedSeries,
      books.filter((book) => selected.has(book.id)),
    );
    stop();
  };

  useEffect(() => {
    if (!selecting) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") stop();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selecting, stop]);

  return (
    <section
      aria-label={t("nav.books")}
      className={cn(
        "relative flex w-full flex-col bg-surface md:w-[330px] md:shrink-0 md:border-r md:border-separator/70",
        className,
      )}
    >
      <header
        data-tauri-drag-region
        className="flex flex-col gap-3 px-4 pt-[max(12px,env(safe-area-inset-top))] pb-2.5"
      >
        {collapsed && <CollapsedSidebarControls />}
        <div data-tauri-drag-region className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <IconButton label={t("nav.showLibrary")} className="lg:hidden" onClick={onOpenSidebar}>
              <SidebarIcon size={20} />
            </IconButton>
            <h1 className="text-title2 font-bold tracking-tight">
              {selecting
                ? selectedCount === 0
                  ? t("books.selectTitle")
                  : t("books.selectedCount", { count: selectedCount })
                : t("nav.books")}
            </h1>
          </div>
          <div className="flex items-center gap-1">
            {(selecting || books.length > 0) && (
              <button
                type="button"
                onClick={() => (selecting ? stop() : selection.start())}
                className={cn(
                  "h-8 rounded-full px-3 text-subheadline transition-colors hover:bg-fill",
                  selecting ? "font-semibold text-accent-text" : "text-accent-text",
                )}
              >
                {selecting ? t("common.done") : t("books.select")}
              </button>
            )}
            {!selecting && (
              <>
                <IconButton label={t("imports.open")} onClick={() => setImporting(true)}>
                  <DownloadIcon size={20} />
                </IconButton>
                <IconButton label={t("books.newMenu")} tone="accent" onClick={chooseNewBook}>
                  <BookIcon size={20} />
                </IconButton>
              </>
            )}
          </div>
        </div>
        <GroupSwitcher group="books" active="books" />
        {/* Five shelves can be wider than a narrow list: it becomes a pop-up button then. */}
        <SegmentedControl<BooksShelf>
          label={t("books.shelf.label")}
          value={current}
          onChange={chooseShelf}
          options={(["all", ...kinds] as BooksShelf[]).map((value) => ({
            value,
            label: shelfLabel(value),
          }))}
        />
      </header>

      <div className="flex grow flex-col gap-1 overflow-y-auto px-2.5 pt-2 pb-28 md:pb-8">
        {allBooks.length === 0 && (
          <div className="flex flex-col items-center gap-3 px-6 pt-16 text-center">
            <p className="text-subheadline text-label-secondary">{t("books.emptyBody")}</p>
            <button
              type="button"
              onClick={() => createBook()}
              className="rounded-full bg-accent px-4 py-2 text-[14px] font-semibold text-on-accent transition-transform active:scale-[0.97]"
            >
              {t("books.makeBook")}
            </button>
          </div>
        )}
        <AnimatePresence initial={false}>
          {shelf.map((item) => (
            <motion.div
              key={
                item.type === "book"
                  ? item.book.id
                  : item.type === "series"
                    ? item.series.id
                    : item.franchise.id
              }
              layout="position"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={spring.smooth}
            >
              {item.type === "franchise" ? (
                <FranchiseGroup
                  franchise={item.franchise}
                  items={item.items}
                  activeId={activeId}
                  onRename={() => setFranchiseTask({ type: "rename", franchise: item.franchise })}
                  onAddToFranchise={(entry) => setFranchiseTask({ type: "add", series: entry })}
                />
              ) : (
                <ShelfEntry
                  item={item}
                  activeId={activeId}
                  showKind={current === "all"}
                  franchise={
                    current === "all"
                      ? undefined
                      : franchiseOf(
                          item.type === "series"
                            ? item.series
                            : seriesById.get(item.book.seriesId ?? ""),
                        )?.title
                  }
                  onAddToFranchise={(entry) => setFranchiseTask({ type: "add", series: entry })}
                />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {selecting && (
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={spring.smooth}
            className="glass-menu absolute inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-10 flex items-center justify-between gap-2 rounded-4xl p-2 max-md:bottom-24"
          >
            <Button
              variant="ghost"
              onClick={() => selection.setAll(allSelected ? [] : books.map((book) => book.id))}
            >
              {allSelected ? t("books.deselectAll") : t("books.selectAll")}
            </Button>
            <Button
              variant="primary"
              disabled={selectedCount === 0}
              onClick={deleteSelected}
              className="bg-danger text-white"
            >
              <TrashIcon size={16} />
              {selectedCount > 0
                ? t("books.deleteCount", { count: selectedCount })
                : t("common.delete")}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
      <ImportSheet open={importing} onClose={() => setImporting(false)} />
      <FranchiseSheet task={franchiseTask} onClose={() => setFranchiseTask(null)} />
    </section>
  );
}

interface EntryProps {
  activeId?: string;
  onAddToFranchise: (series: SeriesEntry) => void;
}

/** A series or a single book, as it sits on a shelf. */
function ShelfEntry({
  item,
  activeId,
  showKind,
  franchise,
  onAddToFranchise,
}: EntryProps & { item: SeriesOrBook; showKind: boolean; franchise?: string }) {
  return item.type === "book" ? (
    <BookRow
      book={item.book}
      active={item.book.id === activeId}
      showKind={showKind}
      franchise={franchise}
    />
  ) : (
    <SeriesGroup
      series={item.series}
      books={item.books}
      activeId={activeId}
      showKind={showKind}
      franchise={franchise}
      onAddToFranchise={onAddToFranchise}
    />
  );
}

/** A franchise's series, of every kind, under its name. */
function FranchiseGroup({
  franchise,
  items,
  activeId,
  onRename,
  onAddToFranchise,
}: EntryProps & { franchise: FranchiseEntry; items: SeriesOrBook[]; onRename: () => void }) {
  const first = items[0]?.type === "series" ? items[0].books[0] : items[0]?.book;
  const menu = useContextMenu(() => [
    { label: t("books.franchise.rename"), onSelect: onRename },
    "divider",
    {
      label: t("books.franchise.remove"),
      destructive: true,
      onSelect: () => void confirmRemoveFranchise(franchise),
    },
  ]);
  return (
    <section aria-label={franchise.title} className="flex flex-col pt-3">
      <h2
        {...menu}
        className="flex touch-manipulation items-center gap-2.5 px-2.5 pb-1 [-webkit-touch-callout:none]"
      >
        <BookCover
          title={franchise.title}
          author={first?.author ?? ""}
          image={first?.cover}
          className="w-6"
        />
        <span className="truncate text-subheadline font-bold tracking-tight text-label">
          {franchise.title}
        </span>
      </h2>
      <div className="flex flex-col border-s-2 border-separator/70 ps-1.5 ms-3">
        {items.map((item) => (
          <ShelfEntry
            key={item.type === "series" ? item.series.id : item.book.id}
            item={item}
            activeId={activeId}
            showKind
            onAddToFranchise={onAddToFranchise}
          />
        ))}
      </div>
    </section>
  );
}

/** Ungrouping keeps every series; only the franchise goes. */
async function confirmRemoveFranchise(franchise: FranchiseEntry) {
  const confirmed = await confirmDialog({
    title: t("books.franchise.removeTitle", { title: franchise.title }),
    message: t("books.franchise.removeBody"),
    confirmLabel: t("books.franchise.removeConfirm"),
  });
  if (confirmed) getFranchiseStore().remove(franchise.id);
}

/** The volumes of a series under one heading. */
function SeriesGroup({
  series,
  books,
  activeId,
  showKind,
  franchise,
  onAddToFranchise,
}: {
  series: SeriesEntry;
  books: BookEntry[];
  activeId?: string;
  showKind: boolean;
  /** Its franchise's name, shown on kind shelves. */
  franchise?: string;
  onAddToFranchise: (series: SeriesEntry) => void;
}) {
  const selection = useBookSelection();
  const kind = showKind && books[0] ? kindLabel(kindOfBook(books[0])) : null;
  const parts = partCountLabel(books.length, series.partLabel);
  const menu = useContextMenu(() => [
    { label: t("books.franchise.add"), onSelect: () => onAddToFranchise(series) },
    { label: t("books.select"), onSelect: () => selection.start(series.id) },
    "divider",
    {
      label: t("books.deleteSeries"),
      destructive: true,
      onSelect: () => void confirmDeleteSeries(series),
    },
  ]);
  const whole = selection.selected.has(series.id);
  const heading = (
    <>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-footnote font-semibold text-label">{series.title}</span>
        {franchise && (
          <span className="truncate text-caption text-label-tertiary">{franchise}</span>
        )}
      </span>
      <span className="shrink-0 text-caption text-label-tertiary">
        {kind ? `${kind} · ${parts}` : parts}
      </span>
    </>
  );
  return (
    <section aria-label={series.title} className="flex flex-col pt-2">
      {selection.selecting ? (
        <label className="flex cursor-pointer items-center gap-2 px-2.5 pb-1 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent/70">
          <input
            type="checkbox"
            className="sr-only"
            checked={whole}
            onChange={() => selection.toggle(series.id)}
          />
          <SelectMark checked={whole} />
          <span className="flex min-w-0 grow items-baseline justify-between gap-3">{heading}</span>
        </label>
      ) : (
        <h2
          {...menu}
          className="flex touch-manipulation items-baseline justify-between gap-3 px-2.5 pb-1 [-webkit-touch-callout:none]"
        >
          {heading}
        </h2>
      )}
      {books.map((book) => (
        <BookRow
          key={book.id}
          book={book}
          series={series}
          active={book.id === activeId}
          inSelectedSeries={whole}
        />
      ))}
    </section>
  );
}

/** Asks before a whole series, with all its volumes, goes to Recently Deleted. */
async function confirmDeleteSeries(series: SeriesEntry) {
  const items = liveSeriesItems(series);
  const chapters = items.reduce((sum, book) => sum + ownChapters(book).length, 0);
  const confirmed = await confirmDialog({
    title: t("books.deleteSeriesTitle", { title: series.title }),
    message: t("books.deleteSeriesBody", {
      items: partCountLabel(items.length, series.partLabel),
      chapters: t("books.chapterCount", { count: chapters }),
      days: RETENTION_DAYS,
    }),
    confirmLabel: t("common.delete"),
    destructive: true,
  });
  if (confirmed) moveSeriesToBin([series], []);
}

function SelectMark({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-[22px] shrink-0 items-center justify-center rounded-full transition-colors",
        checked
          ? "bg-accent text-on-accent"
          : "shadow-[inset_0_0_0_1.5px_var(--color-label-tertiary)]",
      )}
    >
      {checked && <CheckIcon size={14} strokeWidth={2.6} />}
    </span>
  );
}

function BookRow({
  book,
  series,
  active,
  showKind = false,
  inSelectedSeries = false,
  franchise,
}: {
  book: BookEntry;
  /** Set when the row sits under its series' heading. */
  series?: SeriesEntry;
  active: boolean;
  /** Its whole series is selected, so it is too. */
  inSelectedSeries?: boolean;
  /** Its series' franchise, named on kind shelves. */
  franchise?: string;
  /** On the All shelf a row says what it is. */
  showKind?: boolean;
}) {
  const chapters = book.chapterIds.length;
  const mediaKind = kindOfBook(book);
  const kind = showKind && !series ? kindLabel(mediaKind) : null;
  const count = t("books.chapterCount", { count: chapters });
  const navigate = useNavigate();
  const selection = useBookSelection();
  // Where the menu opened, so the export formats can open in the same place.
  const menuPoint = useRef({ x: 0, y: 0 });
  const remember = (event: { clientX: number; clientY: number }) => {
    menuPoint.current = { x: event.clientX, y: event.clientY };
  };
  const menu = useContextMenu(() => [
    {
      label: t("common.open"),
      onSelect: () => void navigate({ to: "/books/$bookId", params: { bookId: book.id } }),
    },
    {
      label: hasAction(mediaKind, "listen") ? t("books.action.listen") : t("books.action.read"),
      disabled: chapters === 0,
      onSelect: () => void navigate({ to: "/read/$bookId", params: { bookId: book.id } }),
    },
    {
      label: `${t("books.export")}…`,
      disabled: chapters === 0,
      onSelect: () =>
        // Formats get their own menu where this one was.
        requestAnimationFrame(() =>
          openContextMenu(
            Math.max(12, menuPoint.current.x - 20),
            menuPoint.current.y,
            exportMenuItems(book),
          ),
        ),
    },
    ...(hasAction(mediaKind, "switchKind")
      ? [
          {
            label: switchKindLabel(book, mediaKind),
            onSelect: () => switchComicKind(book, otherDrawnKind(mediaKind)),
          },
        ]
      : []),
    "divider",
    { label: t("books.select"), onSelect: () => selection.start(book.id) },
    {
      label: t("common.delete"),
      destructive: true,
      onSelect: () => moveBooksToBin([book]),
    },
  ]);
  const body = (
    <>
      <BookCover title={book.title} author={book.author} image={book.cover} className="w-12" />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-subheadline font-semibold text-label">
          {(series ? volumeTitle(book, series, mediaKind) : book.title) || t("books.untitled")}
        </span>
        <span className="text-footnote text-label-secondary">
          {[franchise, kind, count].filter(Boolean).join(" · ")}
        </span>
      </span>
    </>
  );
  const rowClass =
    "flex w-full touch-manipulation items-center gap-3 rounded-2xl p-2.5 text-left no-underline transition-colors duration-fast [-webkit-touch-callout:none]";

  if (selection.selecting) {
    const checked = inSelectedSeries || selection.selected.has(book.id);
    return (
      <label
        className={cn(
          rowClass,
          "cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent/70",
          checked ? "bg-accent-soft" : "hover:bg-fill/60",
        )}
      >
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          disabled={inSelectedSeries}
          onChange={() => selection.toggle(book.id)}
        />
        <SelectMark checked={checked} />
        {body}
      </label>
    );
  }
  return (
    <Link
      to="/books/$bookId"
      params={{ bookId: book.id }}
      {...menu}
      onPointerDownCapture={remember}
      onContextMenuCapture={remember}
      className={cn(rowClass, active ? "bg-accent-soft" : "hover:bg-fill/60")}
    >
      {body}
    </Link>
  );
}

/** A volume's title in its series; a comic or manga item with no number holds loose chapters. */
function volumeTitle(book: BookEntry, series: SeriesEntry, kind: MediaKind): string {
  if (book.volume == null && isDrawnKind(kind)) return t("books.chapters");
  return titleInSeries(book, series);
}
