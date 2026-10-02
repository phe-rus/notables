import { useMediaSource } from "@notables/editor";
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon, cn } from "@notables/ui";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion, type PanInfo } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { chapterPages } from "../../lib/chapter-media";
import type { BookEntry } from "../../store/book-store";
import { useBookContent } from "../use-book-content";
import { useReadingPosition } from "../use-reading-position";

interface Page {
  src: string;
  chapter: number;
}

type Side = "left" | "right";

/** Wide screens show two pages side by side, the first page alone like a cover. */
function spreadsOf(count: number, spread: boolean): number[][] {
  if (!spread) return Array.from({ length: count }, (_, index) => [index]);
  const views: number[][] = count > 0 ? [[0]] : [];
  for (let index = 1; index < count; index += 2) {
    views.push(index + 1 < count ? [index, index + 1] : [index]);
  }
  return views;
}

const SWIPE_DISTANCE = 60;

/**
 * Reads comics and manga a page (or a spread) at a time. Manga reads right
 * to left: the next page is to the left, and arrow keys, taps and swipes
 * follow the book's direction.
 */
export function ComicReader({ book }: { book: BookEntry }) {
  const chapters = useBookContent(book);
  const rtl = book.direction === "rtl";
  const stage = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState(false);
  const [chrome, setChrome] = useState(true);
  const [page, setPage] = useReadingPosition(`${book.id}:page`, 0);
  const [heading, setHeading] = useState<1 | -1>(1);

  useLayoutEffect(() => {
    const element = stage.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setWide(width >= 900 && width > height * 1.15);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const pages = useMemo<Page[]>(
    () =>
      (chapters ?? []).flatMap((chapter, index) =>
        chapterPages(chapter.document).map((src) => ({ src, chapter: index })),
      ),
    [chapters],
  );
  const views = useMemo(() => spreadsOf(pages.length, wide), [pages.length, wide]);
  const viewIndex = Math.max(
    0,
    views.findIndex((view) => view.includes(page)),
  );
  const view = views[viewIndex] ?? [];

  const go = useCallback(
    (step: 1 | -1) => {
      const target = views[viewIndex + step]?.[0];
      if (target === undefined) return;
      setHeading(step);
      setPage(target);
    },
    [setPage, viewIndex, views],
  );
  // Screen sides map onto reading order by the book's direction.
  const press = useCallback((side: Side) => go((side === "right") !== rtl ? 1 : -1), [go, rtl]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return;
      if (event.key === "ArrowRight") press("right");
      else if (event.key === "ArrowLeft") press("left");
      else if (event.key === " " || event.key === "PageDown") go(1);
      else if (event.key === "PageUp") go(-1);
      else return;
      event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, press]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x <= -SWIPE_DISTANCE) press("right");
    else if (info.offset.x >= SWIPE_DISTANCE) press("left");
  };
  // The outer thirds turn pages; the middle shows or hides the controls.
  const onTap = (_: unknown, info: { point: { x: number } }) => {
    const bounds = stage.current?.getBoundingClientRect();
    if (!bounds) return;
    const at = (info.point.x - window.scrollX - bounds.left) / bounds.width;
    if (at < 0.32) press("left");
    else if (at > 0.68) press("right");
    else setChrome((shown) => !shown);
  };

  const first = view[0] ?? 0;
  const chapterTitle = chapters?.[pages[first]?.chapter ?? 0]?.title ?? "";
  const shown = view.map((index) => index + 1).join("–");
  // Manga spreads put the earlier page on the right.
  const ordered = rtl ? [...view].reverse() : view;
  // Pages enter from the side reading moves toward.
  const enterFrom = (heading === 1) !== rtl ? 1 : -1;

  return (
    <div className="fixed inset-0 flex flex-col bg-[#0e0e0f] text-white select-none">
      <motion.header
        animate={{ opacity: chrome ? 1 : 0, y: chrome ? 0 : -12 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "absolute inset-x-0 top-0 z-10 flex h-14 items-center justify-between gap-3 bg-gradient-to-b from-black/70 to-transparent px-3 pt-[env(safe-area-inset-top)]",
          !chrome && "pointer-events-none",
        )}
      >
        <Link
          to="/books/$bookId"
          params={{ bookId: book.id }}
          aria-label="Close book"
          className="flex size-[34px] items-center justify-center rounded-full transition-colors hover:bg-white/15"
        >
          <CloseIcon size={20} />
        </Link>
        <p className="min-w-0 truncate text-center text-[15px] font-semibold">
          {book.title || "Untitled"}
          {chapterTitle && <span className="font-normal text-white/60"> · {chapterTitle}</span>}
        </p>
        <span className="w-[34px]" />
      </motion.header>

      <div ref={stage} className="relative flex min-h-0 grow items-center justify-center">
        {chapters && pages.length === 0 && (
          <p className="px-8 text-center text-[15px] text-white/70">
            This book has no pages on this device yet.
          </p>
        )}
        <AnimatePresence initial={false} custom={enterFrom} mode="popLayout">
          {view.length > 0 && (
            <motion.div
              key={view.join("-")}
              custom={enterFrom}
              variants={{
                enter: (from: number) => ({ x: `${from * 18}%`, opacity: 0 }),
                center: { x: 0, opacity: 1 },
                exit: (from: number) => ({ x: `${from * -18}%`, opacity: 0 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.25}
              onDragEnd={onDragEnd}
              onTap={onTap}
              className="flex h-full w-full touch-pan-y items-center justify-center gap-0 px-2 py-3"
            >
              {ordered.map((index) => (
                <ComicPage
                  key={index}
                  src={pages[index]?.src ?? ""}
                  label={`Page ${index + 1}`}
                  half={view.length > 1}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <motion.footer
        animate={{ opacity: chrome ? 1 : 0, y: chrome ? 0 : 12 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "absolute inset-x-0 bottom-0 z-10 flex items-center gap-4 bg-gradient-to-t from-black/70 to-transparent px-6 pt-8 pb-[max(14px,env(safe-area-inset-bottom))]",
          !chrome && "pointer-events-none",
        )}
      >
        <button
          type="button"
          aria-label={rtl ? "Next page" : "Previous page"}
          onClick={() => press("left")}
          className="flex size-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/15"
        >
          <ChevronLeftIcon size={20} />
        </button>
        <label className="sr-only" htmlFor="comic-progress">
          Jump to page
        </label>
        <input
          id="comic-progress"
          type="range"
          dir={rtl ? "rtl" : "ltr"}
          min={0}
          max={Math.max(0, pages.length - 1)}
          value={first}
          onChange={(event) => setPage(Number(event.target.value))}
          className="book-scrubber grow"
        />
        <span className="shrink-0 text-[13px] text-white/70 tabular-nums" aria-live="polite">
          {pages.length ? `${shown} / ${pages.length}` : ""}
        </span>
        <button
          type="button"
          aria-label={rtl ? "Previous page" : "Next page"}
          onClick={() => press("right")}
          className="flex size-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/15"
        >
          <ChevronRightIcon size={20} />
        </button>
      </motion.footer>
    </div>
  );
}

function ComicPage({ src, label, half }: { src: string; label: string; half: boolean }) {
  const resolved = useMediaSource(src);
  return resolved ? (
    <img
      src={resolved}
      alt={label}
      draggable={false}
      className={cn(
        "h-full min-w-0 object-contain shadow-[0_20px_60px_-20px_rgb(0_0_0/0.8)]",
        half ? "max-w-[50%]" : "max-w-full",
      )}
    />
  ) : (
    <div className={cn("h-full", half ? "w-1/2" : "w-full")} />
  );
}
