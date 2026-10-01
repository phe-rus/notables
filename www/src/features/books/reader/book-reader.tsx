import { CloseIcon } from "@notables/ui";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { BookEntry } from "../store/book-store";
import { BookFlow } from "./book-flow";
import { BookPage } from "./book-page";
import { BookStage, CLOSED_SPREAD, FRONT_COVER } from "./book-stage";
import { measurePage, type PageGeometry } from "./page-geometry";
import { useBookContent } from "./use-book-content";
import { usePageCount } from "./use-page-count";
import { useReadingPosition } from "./use-reading-position";

/**
 * Positions are stored as a single-page index (-2 cover … last page) and
 * mapped to the left-hand face of a spread when two pages are shown.
 */
const toSpread = (page: number) =>
  page === FRONT_COVER ? CLOSED_SPREAD : page % 2 === 0 ? page - 1 : page;
const fromSpread = (left: number) => (left === CLOSED_SPREAD ? FRONT_COVER : left + 1);

/**
 * Printed page numbers start after the unnumbered title page (index 0), so
 * index N is page N.
 */
function positionLabel(page: number, total: number, spread: boolean): string {
  const printed = total - 1;
  if (page === FRONT_COVER) return "Cover";
  if (spread) {
    const left = toSpread(page);
    if (left < 1) return "Title page";
    const right = Math.min(left + 1, printed);
    return right > left ? `Pages ${left}–${right} of ${printed}` : `Page ${left} of ${printed}`;
  }
  return page < 1 ? "Title page" : `Page ${page} of ${printed}`;
}

export function BookReader({ book }: { book: BookEntry }) {
  const chapters = useBookContent(book);
  const stage = useRef<HTMLDivElement>(null);
  const measurer = useRef<HTMLDivElement>(null);
  const [geometry, setGeometry] = useState<PageGeometry | null>(null);
  const [page, setPage] = useReadingPosition(book.id, FRONT_COVER);

  useLayoutEffect(() => {
    const element = stage.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setGeometry(measurePage(entry.contentRect.width, entry.contentRect.height));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const total = usePageCount(measurer, geometry, chapters);

  useEffect(() => {
    if (total > 0 && page > total - 1) setPage(total - 1);
  }, [page, setPage, total]);

  const flow = useMemo(() => {
    if (!geometry || !chapters) return null;
    return (offset: number) => (
      <BookFlow
        book={book}
        chapters={chapters}
        geometry={geometry}
        style={{ transform: `translateX(${-offset}px)` }}
      />
    );
  }, [book, chapters, geometry]);

  const onPositionChange = useCallback(
    (position: number) => setPage(geometry?.spread ? fromSpread(position) : position),
    [geometry?.spread, setPage],
  );

  const label = positionLabel(page, total, geometry?.spread ?? false);

  return (
    <div className="book-desk fixed inset-0 flex flex-col">
      <header className="glass-bar flex h-14 shrink-0 items-center justify-between gap-3 px-3 pt-[env(safe-area-inset-top)]">
        <Link
          to="/books/$bookId"
          params={{ bookId: book.id }}
          aria-label="Close book"
          title="Close book"
          className="group flex size-[34px] items-center justify-center rounded-full text-label transition-colors hover:bg-fill"
        >
          <CloseIcon size={20} />
        </Link>
        <p className="truncate font-serif text-[17px] font-semibold">{book.title || "Untitled"}</p>
        <p
          className="w-24 text-right text-[13px] text-label-secondary tabular-nums"
          aria-live="polite"
        >
          {total ? label : ""}
        </p>
      </header>

      <div
        ref={stage}
        className="relative flex min-h-0 grow items-center justify-center overflow-hidden"
      >
        {geometry && chapters && (
          <>
            {/* Off-screen copy of the flow, used only to count pages. */}
            <div
              ref={measurer}
              aria-hidden="true"
              className="pointer-events-none invisible absolute -left-[99999px]"
            >
              <BookFlow book={book} chapters={chapters} geometry={geometry} />
            </div>
            {flow && total > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 26 }}
              >
                <BookStage
                  geometry={geometry}
                  total={total}
                  position={geometry.spread ? toSpread(page) : page}
                  onPositionChange={onPositionChange}
                  renderFace={(index, side) => (
                    <BookPage
                      index={index}
                      side={side}
                      total={total}
                      book={book}
                      geometry={geometry}
                      flow={flow}
                    />
                  )}
                />
              </motion.div>
            )}
          </>
        )}
      </div>

      <footer className="flex shrink-0 items-center gap-3 px-6 pt-2 pb-[max(14px,env(safe-area-inset-bottom))]">
        <label className="sr-only" htmlFor="book-progress">
          Jump to page
        </label>
        <input
          id="book-progress"
          type="range"
          min={FRONT_COVER}
          max={Math.max(FRONT_COVER, total - 1)}
          value={page}
          onChange={(event) => setPage(Number(event.target.value))}
          className="book-scrubber grow"
        />
      </footer>
    </div>
  );
}
