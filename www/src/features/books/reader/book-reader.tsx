import { ChaptersIcon, CloseIcon, cn, HighlighterIcon } from "@notables/ui";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { HighlightPalette } from "../highlights/components/highlight-palette";
import { HighlightsPanel } from "../highlights/components/highlights-panel";
import { highlightsSupported, rangesFor } from "../highlights/lib/paint-highlights";
import { usePaintedHighlights } from "../highlights/lib/use-painted-highlights";
import { type HighlightEntry, useHighlights } from "../highlights/store/highlight-store";
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
  const root = useRef<HTMLDivElement>(null);
  const highlights = useHighlights(book.id);
  const [highlighting, setHighlighting] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  usePaintedHighlights(root, highlights);

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

  /** Turns to the page a highlight is on, measured in the off-screen flow. */
  const turnTo = (entry: HighlightEntry) => {
    const container = measurer.current;
    const flowElement = container?.querySelector<HTMLElement>(".book-flow");
    const rect = container && rangesFor(container, entry)[0]?.getClientRects()[0];
    setListOpen(false);
    if (!geometry || !flowElement || !rect) return;
    const column = geometry.textWidth + geometry.columnGap;
    const index = Math.floor((rect.left - flowElement.getBoundingClientRect().left + 1) / column);
    setPage(Math.max(0, Math.min(index, total - 1)));
  };

  return (
    <div ref={root} className="book-desk fixed inset-0 flex flex-col">
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
        <div className="flex shrink-0 items-center justify-end gap-1">
          <p
            className="hidden w-28 text-right text-[13px] text-label-secondary tabular-nums sm:block"
            aria-live="polite"
          >
            {total ? label : ""}
          </p>
          {highlightsSupported() && (
            <button
              type="button"
              aria-pressed={highlighting}
              aria-label={highlighting ? "Stop highlighting" : "Highlight"}
              data-tooltip={highlighting ? "Stop highlighting" : "Highlight"}
              onClick={() => {
                setHighlighting((on) => !on);
                window.getSelection()?.removeAllRanges();
              }}
              className={cn(
                "flex size-[34px] items-center justify-center rounded-full transition-colors",
                highlighting ? "bg-accent text-on-accent" : "text-label hover:bg-fill",
              )}
            >
              <HighlighterIcon size={19} />
            </button>
          )}
          <button
            type="button"
            aria-label="Highlights"
            data-tooltip="Highlights"
            onClick={() => setListOpen(true)}
            className="relative flex size-[34px] items-center justify-center rounded-full text-label transition-colors hover:bg-fill"
          >
            <ChaptersIcon size={19} />
            {highlights.length > 0 && (
              <span className="absolute top-0.5 right-0.5 flex min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] leading-4 font-bold text-on-accent">
                {highlights.length}
              </span>
            )}
          </button>
        </div>
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
                  interactive={!highlighting}
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

      <HighlightPalette root={stage} bookId={book.id} entries={highlights} enabled={highlighting} />
      <HighlightsPanel
        open={listOpen}
        onClose={() => setListOpen(false)}
        entries={highlights}
        chapters={chapters ?? []}
        onChoose={turnTo}
      />

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
