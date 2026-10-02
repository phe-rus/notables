import {
  BookIcon,
  cn,
  confirmDialog,
  DownloadIcon,
  IconButton,
  SidebarIcon,
  spring,
  toast,
  useContextMenu,
} from "@notables/ui";
import { Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { CollapsedSidebarControls } from "../../../components/window/collapsed-sidebar-controls";
import { ImportSheet } from "../../imports/components/import-sheet";
import { GroupSwitcher } from "../../library/components/group-switcher";
import { usePreferences } from "../../settings/store/preferences-store";
import { exportBookAsEpub } from "../export/export-book";
import { arrangeShelf, titleInSeries } from "../lib/arrange-shelf";
import { type BookEntry, bookKindLabel, getBookStore, useBooks } from "../store/book-store";
import { type SeriesEntry, useSeries } from "../store/series-store";
import { BookCover } from "./book-cover";

export function BooksList({
  activeId,
  onOpenSidebar,
  className,
}: {
  activeId?: string;
  onOpenSidebar: () => void;
  className?: string;
}) {
  const books = useBooks();
  const series = useSeries();
  const shelf = useMemo(() => arrangeShelf(books, series), [books, series]);
  const navigate = useNavigate();
  const { collapsed } = usePreferences().sidebar;

  const [importing, setImporting] = useState(false);

  const createBook = () => {
    const book = getBookStore().create();
    void navigate({ to: "/books/$bookId", params: { bookId: book.id } });
  };

  return (
    <section
      aria-label="Books"
      className={cn(
        "flex w-full flex-col bg-surface md:w-[330px] md:shrink-0 md:border-r md:border-separator/70",
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
            <IconButton label="Show library" className="lg:hidden" onClick={onOpenSidebar}>
              <SidebarIcon size={20} />
            </IconButton>
            <h1 className="text-[22px] font-bold tracking-tight">Books</h1>
          </div>
          <div className="flex items-center gap-1">
            <IconButton
              label="Import books, comics or audiobooks"
              onClick={() => setImporting(true)}
            >
              <DownloadIcon size={20} />
            </IconButton>
            <IconButton label="New book" tone="accent" onClick={createBook}>
              <BookIcon size={20} />
            </IconButton>
          </div>
        </div>
        <GroupSwitcher group="books" active="books" />
      </header>

      <div className="flex grow flex-col gap-1 overflow-y-auto px-2.5 pt-2 pb-28 md:pb-8">
        {books.length === 0 && (
          <div className="flex flex-col items-center gap-3 px-6 pt-16 text-center">
            <p className="text-[15px] text-label-secondary">
              Gather stories, journals or lessons into a book you can read like the real thing.
            </p>
            <button
              type="button"
              onClick={createBook}
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
                <BookRow book={item.book} active={item.book.id === activeId} />
              ) : (
                <SeriesGroup series={item.series} books={item.books} activeId={activeId} />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <ImportSheet open={importing} onClose={() => setImporting(false)} />
    </section>
  );
}

/** The volumes of a series under one heading. */
function SeriesGroup({
  series,
  books,
  activeId,
}: {
  series: SeriesEntry;
  books: BookEntry[];
  activeId?: string;
}) {
  const kind = books[0] ? bookKindLabel(books[0]) : null;
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
}: {
  book: BookEntry;
  /** Set when the row sits under its series' heading. */
  series?: SeriesEntry;
  active: boolean;
}) {
  const chapters = book.chapterIds.length;
  const kind = series ? null : bookKindLabel(book);
  const count = chapters === 1 ? "1 chapter" : `${chapters} chapters`;
  const navigate = useNavigate();
  const menu = useContextMenu(() => [
    {
      label: "Open",
      onSelect: () => void navigate({ to: "/books/$bookId", params: { bookId: book.id } }),
    },
    {
      label: "Read",
      disabled: chapters === 0,
      onSelect: () => void navigate({ to: "/read/$bookId", params: { bookId: book.id } }),
    },
    {
      label: "Export as EPUB",
      disabled: chapters === 0,
      onSelect: () => {
        void toast
          .promise(exportBookAsEpub(book), {
            loading: "Exporting your book…",
            success: "Book exported",
            error: "The book couldn’t be exported",
          })
          .catch(() => {});
      },
    },
    "divider",
    {
      label: "Delete",
      destructive: true,
      onSelect: async () => {
        const confirmed = await confirmDialog({
          title: "Delete this book?",
          message: "Its chapters stay in your notes.",
          confirmLabel: "Delete",
          destructive: true,
        });
        if (!confirmed) return;
        getBookStore().remove(book.id);
        toast("Book deleted", { description: book.title || undefined });
      },
    },
  ]);
  return (
    <Link
      to="/books/$bookId"
      params={{ bookId: book.id }}
      {...menu}
      className={cn(
        "flex touch-manipulation items-center gap-3 rounded-[14px] p-2.5 no-underline transition-colors duration-fast [-webkit-touch-callout:none]",
        active ? "bg-accent-soft" : "hover:bg-fill/60",
      )}
    >
      <BookCover title={book.title} author={book.author} image={book.cover} className="w-12" />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-[15px] font-semibold text-label">
          {(series ? titleInSeries(book, series) : book.title) || "Untitled book"}
        </span>
        <span className="text-[13px] text-label-secondary">
          {kind ? `${kind} · ${count}` : count}
        </span>
      </span>
    </Link>
  );
}
