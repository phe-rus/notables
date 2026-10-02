import {
  BookIcon,
  Button,
  CheckIcon,
  cn,
  DownloadIcon,
  IconButton,
  openContextMenu,
  SegmentedControl,
  SidebarIcon,
  spring,
  TrashIcon,
  useContextMenu,
} from "@notables/ui";
import { Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { type MouseEvent, useEffect, useMemo, useRef, useState } from "react";
import { CollapsedSidebarControls } from "../../../components/window/collapsed-sidebar-controls";
import { t } from "../../../i18n/i18n";
import { ImportSheet } from "../../imports/components/import-sheet";
import { GroupSwitcher } from "../../library/components/group-switcher";
import type { BooksShelf } from "../../settings/model/preferences";
import { updatePreferences, usePreferences } from "../../settings/store/preferences-store";
import { moveBooksToBin } from "../../trash/lib/recycle-bin";
import { switchComicKind } from "../actions/switch-kind";
import { exportMenuItems } from "../export/export-book-button";
import { arrangeShelf, titleInSeries } from "../lib/arrange-shelf";
import { kindOfBook } from "../lib/book-kind";
import { hasAction, otherDrawnKind, switchKindLabel } from "../lib/kind-actions";
import { kindLabel, shelfLabel } from "../model/kind-labels";
import { type MediaKind, mediaKinds } from "../model/media-kind";
import { type BookEntry, getBookStore, useBooks } from "../store/book-store";
import { type SeriesEntry, useSeries } from "../store/series-store";
import { BookCover } from "./book-cover";
import { BookSelectionProvider, useBookSelection } from "./book-selection";

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
  const shelf = useMemo(() => arrangeShelf(books, series), [books, series]);
  const navigate = useNavigate();

  const [importing, setImporting] = useState(false);

  const createBook = (kind: MediaKind = "book") => {
    const book = getBookStore().create(kind);
    void navigate({ to: "/books/$bookId", params: { bookId: book.id } });
  };
  const chooseNewBook = (event: MouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    openContextMenu(
      rect.right - 200,
      rect.bottom + 6,
      mediaKinds.map((kind) => ({ label: kindLabel(kind), onSelect: () => createBook(kind) })),
    );
  };
  const chooseShelf = (booksShelf: BooksShelf) =>
    updatePreferences((previous) => ({ ...previous, booksShelf }));

  const { selecting, selected, stop } = selection;
  const allSelected = books.length > 0 && selected.size === books.length;
  const deleteSelected = () => {
    moveBooksToBin(books.filter((book) => selected.has(book.id)));
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
      aria-label="Books"
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
            <h1 className="text-[22px] font-bold tracking-tight">
              {selecting
                ? selected.size === 0
                  ? "Select Books"
                  : `${selected.size} Selected`
                : "Books"}
            </h1>
          </div>
          <div className="flex items-center gap-1">
            {(selecting || books.length > 0) && (
              <button
                type="button"
                onClick={() => (selecting ? stop() : selection.start())}
                className={cn(
                  "h-8 rounded-full px-3 text-[15px] transition-colors hover:bg-fill",
                  selecting ? "font-semibold text-accent-text" : "text-accent-text",
                )}
              >
                {selecting ? "Done" : "Select"}
              </button>
            )}
            {!selecting && (
              <>
                <IconButton
                  label="Import books, comics or audiobooks"
                  onClick={() => setImporting(true)}
                >
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
        {/* Five shelves can be wider than a narrow list: it scrolls rather than squeezes. */}
        <div className="no-scrollbar -mx-4 overflow-x-auto px-4">
          <div className="w-max min-w-full">
            <SegmentedControl<BooksShelf>
              label={t("books.shelf.label")}
              value={current}
              onChange={chooseShelf}
              options={(["all", ...kinds] as BooksShelf[]).map((value) => ({
                value,
                label: shelfLabel(value),
              }))}
            />
          </div>
        </div>
      </header>

      <div className="flex grow flex-col gap-1 overflow-y-auto px-2.5 pt-2 pb-28 md:pb-8">
        {allBooks.length === 0 && (
          <div className="flex flex-col items-center gap-3 px-6 pt-16 text-center">
            <p className="text-[15px] text-label-secondary">
              Gather stories, journals or lessons into a book you can read like the real thing.
            </p>
            <button
              type="button"
              onClick={() => createBook()}
              className="rounded-full bg-accent px-4 py-2 text-[14px] font-semibold text-on-accent transition-transform active:scale-[0.97]"
            >
              Make a book
            </button>
          </div>
        )}
        <AnimatePresence initial={false}>
          {shelf.map((item) => (
            <motion.div
              key={item.type === "book" ? item.book.id : item.series.id}
              layout="position"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={spring.smooth}
            >
              {item.type === "book" ? (
                <BookRow
                  book={item.book}
                  active={item.book.id === activeId}
                  showKind={current === "all"}
                />
              ) : (
                <SeriesGroup
                  series={item.series}
                  books={item.books}
                  activeId={activeId}
                  showKind={current === "all"}
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
            className="glass-menu absolute inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-10 flex items-center justify-between gap-2 rounded-[18px] p-2 max-md:bottom-24"
          >
            <Button
              variant="ghost"
              onClick={() => selection.setAll(allSelected ? [] : books.map((book) => book.id))}
            >
              {allSelected ? "Deselect All" : "Select All"}
            </Button>
            <Button
              variant="primary"
              disabled={selected.size === 0}
              onClick={deleteSelected}
              className="bg-danger text-white"
            >
              <TrashIcon size={16} />
              Delete{selected.size > 0 ? ` ${selected.size}` : ""}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
      <ImportSheet open={importing} onClose={() => setImporting(false)} />
    </section>
  );
}

/** The volumes of a series under one heading. */
function SeriesGroup({
  series,
  books,
  activeId,
  showKind,
}: {
  series: SeriesEntry;
  books: BookEntry[];
  activeId?: string;
  showKind: boolean;
}) {
  const kind = showKind && books[0] ? kindLabel(kindOfBook(books[0])) : null;
  const parts = `${books.length} ${series.partLabel.toLowerCase()}s`;
  return (
    <section aria-label={series.title} className="flex flex-col pt-2">
      <h2 className="flex items-baseline justify-between gap-3 px-2.5 pb-1">
        <span className="truncate text-[13px] font-semibold text-label">{series.title}</span>
        <span className="shrink-0 text-[12px] text-label-tertiary">
          {kind ? `${kind} · ${parts}` : parts}
        </span>
      </h2>
      {books.map((book) => (
        <BookRow key={book.id} book={book} series={series} active={book.id === activeId} />
      ))}
    </section>
  );
}

function BookRow({
  book,
  series,
  active,
  showKind = false,
}: {
  book: BookEntry;
  /** Set when the row sits under its series' heading. */
  series?: SeriesEntry;
  active: boolean;
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
        <span className="truncate text-[15px] font-semibold text-label">
          {(series ? titleInSeries(book, series) : book.title) || "Untitled book"}
        </span>
        <span className="text-[13px] text-label-secondary">
          {kind ? `${kind} · ${count}` : count}
        </span>
      </span>
    </>
  );
  const rowClass =
    "flex w-full touch-manipulation items-center gap-3 rounded-[14px] p-2.5 text-left no-underline transition-colors duration-fast [-webkit-touch-callout:none]";

  if (selection.selecting) {
    const checked = selection.selected.has(book.id);
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
          onChange={() => selection.toggle(book.id)}
        />
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
