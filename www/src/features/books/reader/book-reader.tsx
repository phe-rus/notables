import { ChaptersIcon, CloseIcon, cn, HeadphonesIcon, HighlighterIcon, toast } from "@notables/ui";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { NarrationBar } from "../../listening/components/narration-bar";
import { buildScript, type ScriptLine } from "../../listening/lib/narration-script";
import { clearReading, paintReading, rangesForLine } from "../../listening/lib/reading-highlight";
import { useNarration } from "../../listening/lib/use-narration";
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
  // Read aloud speaks the book's own language, else the app's.
  const lang = book.language || document.documentElement.lang || navigator.language || "en";
  const narration = useNarration(lang, book.title || "Book");
  const script = useRef<ScriptLine[]>([]);

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

  /** The page a range falls on, measured in the off-screen flow. */
  const pageOf = useCallback(
    (range: Range | undefined): number | null => {
      const flowElement = measurer.current?.querySelector<HTMLElement>(".book-flow");
      const rect = range?.getClientRects()[0];
      if (!geometry || !flowElement || !rect) return null;
      const column = geometry.textWidth + geometry.columnGap;
      const index = Math.floor((rect.left - flowElement.getBoundingClientRect().left + 1) / column);
      return Math.max(0, Math.min(index, total - 1));
    },
    [geometry, total],
  );

  /** Turns to the page a highlight is on. */
  const turnTo = (entry: HighlightEntry) => {
    setListOpen(false);
    const container = measurer.current;
    const index = container ? pageOf(rangesFor(container, entry)[0]) : null;
    if (index !== null) setPage(index);
  };

  /** Reads the book aloud from the page that's open. */
  const listen = () => {
    const flowElement = measurer.current?.querySelector(".book-flow");
    if (!flowElement) return;
    const lines = buildScript(flowElement, lang);
    if (lines.length === 0) {
      toast("Nothing to read aloud yet");
      return;
    }
    const firstVisible = geometry?.spread ? Math.max(0, toSpread(page)) : Math.max(0, page);
    const from = lines.findIndex((line) => {
      const at = pageOf(measurer.current ? rangesForLine(measurer.current, line)[0] : undefined);
      return at !== null && at >= firstVisible;
    });
    script.current = lines;
    narration
      .start(
        lines.map((line) => line.text),
        Math.max(0, from),
      )
      .catch((error: unknown) =>
        toast.error("Couldn’t read aloud", {
          description: error instanceof Error ? error.message : undefined,
        }),
      );
  };

  // Light up the sentence being read, and turn the page to keep up with it.
  const readingIndex = narration.state?.index ?? -1;
  useEffect(() => {
    const line = script.current[readingIndex];
    if (!line) {
      clearReading();
      return;
    }
    if (stage.current) paintReading(rangesForLine(stage.current, line));
    const at = measurer.current ? pageOf(rangesForLine(measurer.current, line)[0]) : null;
    if (at === null) return;
    const visible = geometry?.spread ? [toSpread(page), toSpread(page) + 1] : [page];
    if (!visible.includes(at)) setPage(at);
  }, [readingIndex, geometry?.spread, page, pageOf, setPage]);
  useEffect(() => clearReading, []);

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
          <button
            type="button"
            aria-pressed={narration.state !== null}
            aria-label="Read aloud"
            data-tooltip="Read aloud"
            onClick={() => (narration.state ? narration.close() : listen())}
            className={cn(
              "flex size-[34px] items-center justify-center rounded-full transition-colors",
              narration.state ? "bg-accent text-on-accent" : "text-label hover:bg-fill",
            )}
          >
            <HeadphonesIcon size={19} />
          </button>
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

      <AnimatePresence>
        {narration.state && (
          <div className="pointer-events-none fixed inset-x-0 bottom-[calc(max(14px,env(safe-area-inset-bottom))+44px)] z-30 flex justify-center px-3">
            <NarrationBar
              className="pointer-events-auto"
              state={narration.state}
              lang={lang}
              onToggle={narration.toggle}
              onSeek={narration.seek}
              onClose={narration.close}
            />
          </div>
        )}
      </AnimatePresence>

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
