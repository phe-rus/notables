import { BookIcon, cn, IconButton, SidebarIcon, spring } from "@notables/ui";
import { Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { type BookEntry, getBookStore, useBooks } from "../store/book-store";
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
  const navigate = useNavigate();

  const createBook = () => {
    const book = getBookStore().create();
    void navigate({ to: "/books/$bookId", params: { bookId: book.id } });
  };

  return (
    <section
      aria-label="Books"
      className={cn(
        "flex w-full flex-col bg-surface md:w-[330px] md:shrink-0 md:border-r md:border-separator",
        className,
      )}
    >
      <header className="flex items-center justify-between px-4 pt-[max(16px,env(safe-area-inset-top))] pb-2.5">
        <div className="flex items-center gap-1">
          <IconButton label="Show library" className="lg:hidden" onClick={onOpenSidebar}>
            <SidebarIcon size={20} />
          </IconButton>
          <h1 className="text-[22px] font-bold tracking-tight">Books</h1>
        </div>
        <IconButton label="New book" tone="accent" onClick={createBook}>
          <BookIcon size={20} />
        </IconButton>
      </header>

      <div className="flex grow flex-col gap-1 overflow-y-auto px-2.5 pt-2 pb-8">
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
          {books.map((book) => (
            <motion.div
              key={book.id}
              layout="position"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={spring.smooth}
            >
              <BookRow book={book} active={book.id === activeId} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}

function BookRow({ book, active }: { book: BookEntry; active: boolean }) {
  const chapters = book.chapterIds.length;
  return (
    <Link
      to="/books/$bookId"
      params={{ bookId: book.id }}
      className={cn(
        "flex items-center gap-3 rounded-[14px] p-2.5 no-underline transition-colors duration-fast",
        active ? "bg-accent-soft" : "hover:bg-fill/60",
      )}
    >
      <BookCover title={book.title} author={book.author} className="w-12" />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-[15px] font-semibold text-label">
          {book.title || "Untitled book"}
        </span>
        <span className="text-[13px] text-label-secondary">
          {chapters === 1 ? "1 chapter" : `${chapters} chapters`}
        </span>
      </span>
    </Link>
  );
}
