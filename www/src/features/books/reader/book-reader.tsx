import {
  ChaptersIcon,
  CloseIcon,
  HeadphonesIcon,
  HighlighterIcon,
  spring,
  toast,
} from "@phe-rus/hino";
import { Button, buttonStyle } from "@phe-rus/hino/button";
import { IconButton } from "@phe-rus/hino/icon-button";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { NarrationBar } from "@/features/listening/components/narration-bar";
import {
  buildScript,
  type ScriptLine,
  storyStart,
} from "@/features/listening/lib/narration-script";
import {
  clearReading,
  paintReading,
  rangesForLine,
} from "@/features/listening/lib/reading-highlight";
import { useNarration } from "@/features/listening/lib/use-narration";
import { t } from "@/i18n/i18n";
import { HighlightPalette } from "../highlights/components/highlight-palette";
import { HighlightsPanel } from "../highlights/components/highlights-panel";
import { highlightsSupported, rangesFor } from "../highlights/lib/paint-highlights";
import { usePaintedHighlights } from "../highlights/lib/use-painted-highlights";
import { type HighlightEntry, useHighlights } from "../highlights/store/highlight-store";
import type { BookEntry } from "../store/book-store";
import { BookContents } from "./book-contents";
import { BookFlow } from "./book-flow";
import { BookPage } from "./book-page";
import { BookStage, CLOSED_SPREAD, FRONT_COVER } from "./book-stage";
import { measurePage, type PageGeometry } from "./page-geometry";
import { useBookContent } from "./use-book-content";
import { useBookPages } from "./use-book-pages";
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
  if (page === FRONT_COVER) return t("books.reader.cover");
  if (spread) {
    const left = toSpread(page);
    if (left < 1) return t("books.reader.titlePage");
    const right = Math.min(left + 1, printed);
    return t("books.reader.position", {
      page: right > left ? `${left}–${right}` : left,
      total: printed,
    });
  }
  return page < 1
    ? t("books.reader.titlePage")
    : t("books.reader.position", { page, total: printed });
}

export function BookReader({ book }: { book: BookEntry }) {
  const chapters = useBookContent(book);
  const reducedMotion = useReducedMotion();
  const [controlsVisible, setControlsVisible] = useState(true);
  const stage = useRef<HTMLDivElement>(null);
  const [geometry, setGeometry] = useState<PageGeometry | null>(null);
  const [page, setPage] = useReadingPosition(book.id, FRONT_COVER);
  const root = useRef<HTMLDivElement>(null);
  const highlights = useHighlights(book.id);
  const [highlighting, setHighlighting] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [contentsOpen, setContentsOpen] = useState(false);
  const contentsAnchor = useRef<HTMLDivElement>(null);
  const [chapterTarget, setChapterTarget] = useState<string | null>(null);
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

  const pages = useBookPages(book, chapters, geometry);
  const { total, locate, starts, setFocus } = pages;

  useEffect(() => {
    if (
      pages.measured &&
      chapters?.every((chapter) => chapter.document) &&
      total > 0 &&
      page > total - 1
    )
      setPage(total - 1);
  }, [chapters, page, pages.measured, setPage, total]);

  useEffect(() => {
    if (!chapterTarget) return;
    const section = pages.sectionOfChapter(chapterTarget);
    if (section < 0) return;
    setPage(starts[section] ?? 0);
    setFocus(section);
    if (pages.measured) setChapterTarget(null);
  }, [chapterTarget, pages.measured, pages.sectionOfChapter, setFocus, setPage, starts]);

  // Count the section being read first, and keep it in the measurer.
  useEffect(() => setFocus(locate(Math.max(0, page)).section), [locate, page, setFocus]);

  const flow = useMemo(() => {
    if (!geometry || !chapters) return null;
    const step = geometry.textWidth + geometry.columnGap;
    return (index: number) => {
      const { section, local } = locate(index);
      const part = pages.sections[section];
      return part ? pages.flowFor(part, { transform: `translateX(${-local * step}px)` }) : null;
    };
  }, [chapters, geometry, locate, pages.flowFor, pages.sections]);

  const onPositionChange = useCallback(
    (position: number) => {
      setChapterTarget(null);
      setPage(geometry?.spread ? fromSpread(position) : position);
    },
    [geometry?.spread, setPage],
  );

  const label = positionLabel(page, total, geometry?.spread ?? false);

  /**
   * The page a chapter's text is on: exact when its section is in the
   * measurer, else the section's first page (refined once it's measured).
   */
  const pageOf = useCallback(
    (noteId: string, find: (container: HTMLElement) => Range | undefined): number | null => {
      const section = pages.sectionOfChapter(noteId);
      if (section < 0) return null;
      const container = pages.measurerRef.current;
      const exact =
        section === pages.measuring && container ? pages.pageInMeasurer(find(container)) : null;
      return Math.min(exact ?? starts[section] ?? 0, Math.max(0, total - 1));
    },
    [
      pages.measurerRef,
      pages.measuring,
      pages.pageInMeasurer,
      pages.sectionOfChapter,
      starts,
      total,
    ],
  );

  /** Turns to the page a highlight is on. */
  const turnTo = (entry: HighlightEntry) => {
    setListOpen(false);
    const index = pageOf(entry.noteId, (container) => rangesFor(container, entry)[0]);
    if (index !== null) setPage(index);
  };

  /** Reads the book aloud from the page that's open. */
  const listen = () => {
    if (!chapters || !geometry) return;
    // The text from the open chapter on, rendered off the page: detached
    // elements are never laid out, so a long book costs no layout here.
    const opening = locate(Math.max(0, page)).section;
    const host = document.createElement("div");
    const detached = createRoot(host);
    flushSync(() =>
      detached.render(
        <BookFlow
          book={book}
          chapters={chapters.slice(Math.max(0, opening - 1))}
          first={Math.max(0, opening - 1)}
          titlePage={opening === 0}
          geometry={geometry}
        />,
      ),
    );
    const lines = buildScript(host, lang);
    detached.unmount();
    if (lines.length === 0) {
      toast("Nothing to read aloud yet");
      return;
    }
    const firstVisible = geometry.spread ? Math.max(0, toSpread(page)) : Math.max(0, page);
    const visible = lines.findIndex((line) => {
      const at = pageOf(line.section, (container) => rangesForLine(container, line)[0]);
      return at !== null && at >= firstVisible;
    });
    // From the opening pages, start with the story rather than its contents list.
    const from =
      opening <= 1 ? Math.max(visible, storyStart(lines.map((line) => line.text))) : visible;
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
    const at = pageOf(line.section, (container) => rangesForLine(container, line)[0]);
    if (at === null) return;
    const visible = geometry?.spread ? [toSpread(page), toSpread(page) + 1] : [page];
    if (!visible.includes(at)) setPage(at);
  }, [readingIndex, geometry?.spread, page, pageOf, setPage]);
  useEffect(() => clearReading, []);

  return (
    <div ref={root} className="book-desk fixed inset-0 flex flex-col">
      <motion.header
        initial={false}
        animate={{ opacity: controlsVisible ? 1 : 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.18 }}
        onFocusCapture={() => setControlsVisible(true)}
        style={{ pointerEvents: controlsVisible ? "auto" : "none" }}
        className="flex box-content h-14 shrink-0 items-center justify-between gap-2 px-3 pt-[env(safe-area-inset-top)]"
      >
        <Link
          to="/books/$bookId"
          params={{ bookId: book.id }}
          aria-label={t("books.reader.close")}
          title={t("books.reader.close")}
          className={buttonStyle({ size: "icon-sm", variant: "ghost" })}
        >
          <CloseIcon size={20} />
        </Link>
        <p className="truncate font-serif text-body font-semibold">
          {book.title || t("common.untitled")}
        </p>
        <div className="flex shrink-0 items-center justify-end gap-1">
          <p
            className="hidden w-28 text-right text-footnote text-label-secondary tabular-nums sm:block"
            aria-live="polite"
          >
            {total ? label : ""}
          </p>
          <IconButton
            size="icon-sm"
            variant="ghost"
            label={t("notes.readAloud")}
            aria-pressed={narration.state !== null}
            onClick={() => (narration.state ? narration.close() : listen())}
            className={narration.state ? "bg-accent-soft text-accent-text" : undefined}
          >
            <HeadphonesIcon size={19} />
          </IconButton>
          {highlightsSupported() && (
            <IconButton
              size="icon-sm"
              variant="ghost"
              aria-pressed={highlighting}
              label={highlighting ? t("books.reader.stopHighlighting") : t("editor.highlight")}
              onClick={() => {
                setHighlighting((on) => !on);
                setControlsVisible(true);
                window.getSelection()?.removeAllRanges();
              }}
              className={highlighting ? "bg-accent-soft text-accent-text" : undefined}
            >
              <HighlighterIcon size={19} />
            </IconButton>
          )}
          <div ref={contentsAnchor} className="relative">
            <IconButton
              size="icon-sm"
              variant="ghost"
              label={t("books.reader.contents")}
              aria-expanded={contentsOpen}
              onClick={() => setContentsOpen((shown) => !shown)}
            >
              <ChaptersIcon size={19} />
            </IconButton>
            <BookContents
              open={contentsOpen}
              anchor={contentsAnchor}
              onClose={() => setContentsOpen(false)}
              chapters={chapters ?? []}
              chapterPages={Object.fromEntries(
                (chapters ?? []).map((chapter) => [
                  chapter.noteId,
                  starts[pages.sectionOfChapter(chapter.noteId)] ?? 0,
                ]),
              )}
              currentChapter={
                pages.sections[locate(Math.max(0, page)).section]?.chapters[0]?.noteId
              }
              page={page}
              total={total}
              onChapter={setChapterTarget}
              onPage={(next) => {
                setChapterTarget(null);
                setPage(next);
              }}
              onHighlights={() => setListOpen(true)}
            />
          </div>
        </div>
      </motion.header>

      <div
        ref={stage}
        className="relative flex min-h-0 grow items-center justify-center overflow-hidden"
      >
        {geometry && chapters && (
          <>
            {/* Off-screen flow of one section, to count and locate pages. */}
            {pages.measurer}
            {flow && total > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.985 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={reducedMotion ? { duration: 0 } : spring.smooth}
              >
                <BookStage
                  geometry={geometry}
                  total={total}
                  position={geometry.spread ? toSpread(page) : page}
                  onPositionChange={onPositionChange}
                  interactive={!highlighting}
                  onToggleControls={() => setControlsVisible((visible) => !visible)}
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

      <motion.footer
        initial={false}
        animate={{ opacity: controlsVisible ? 1 : 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.18 }}
        onFocusCapture={() => setControlsVisible(true)}
        style={{ pointerEvents: controlsVisible ? "auto" : "none" }}
        className="flex shrink-0 flex-col items-stretch px-6 pt-2 pb-[max(14px,env(safe-area-inset-bottom))]"
      >
        <Button
          variant="ghost"
          size="xs"
          className="self-center text-label-secondary tabular-nums"
          onClick={() => setContentsOpen(true)}
        >
          {total ? label : t("books.reader.contents")}
        </Button>
      </motion.footer>
    </div>
  );
}
