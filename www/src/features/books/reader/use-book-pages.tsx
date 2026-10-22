import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { BookEntry } from "../store/book-store";
import { BookFlow } from "./book-flow";
import type { PageGeometry } from "./page-geometry";
import type { BookChapter } from "./use-book-content";

/** The title page, or one chapter (with its part's heading, if it opens one). */
export interface BookSection {
  titlePage: boolean;
  chapters: BookChapter[];
  /** Book index of the section's chapter, for its "Chapter N" label. */
  first: number;
  /** Characters of text, to estimate pages before they're counted. */
  chars: number;
}

/** Characters per page assumed until a section has been counted. */
const DEFAULT_CHARS_PER_PAGE = 1800;

/** Counts the text in a serialized note document. */
function documentChars(node: unknown): number {
  if (!node || typeof node !== "object") return 0;
  const { text, children, root } = node as { text?: unknown; children?: unknown; root?: unknown };
  let total = typeof text === "string" ? text.length : 0;
  if (Array.isArray(children)) for (const child of children) total += documentChars(child);
  if (root) total += documentChars(root);
  return total;
}

export function bookSections(chapters: BookChapter[]): BookSection[] {
  return [
    { titlePage: true, chapters: [], first: 0, chars: 0 },
    ...chapters.map((chapter, index) => ({
      titlePage: false,
      chapters: [chapter],
      first: index,
      chars: documentChars(chapter.document),
    })),
  ];
}

const whenIdle = (run: () => void) => {
  if ("requestIdleCallback" in window) {
    const handle = window.requestIdleCallback(run, { timeout: 500 });
    return () => window.cancelIdleCallback(handle);
  }
  const timer = setTimeout(run, 30);
  return () => clearTimeout(timer);
};

/**
 * Pages of a book, counted one section at a time in an off-screen flow:
 * the section being read first, then the rest while the app is idle.
 * Uncounted sections are estimated from their length, so a long book opens
 * at once and its page total settles in the background.
 */
export function useBookPages(
  book: BookEntry,
  chapters: BookChapter[] | null,
  geometry: PageGeometry | null,
) {
  const sections = useMemo(() => (chapters ? bookSections(chapters) : []), [chapters]);
  const [counts, setCounts] = useState<Array<number | undefined>>([]);
  const [focus, setFocus] = useState(0);
  const [measuring, setMeasuring] = useState(0);
  const measurer = useRef<HTMLDivElement>(null);

  // A new layout or new content means counting again.
  useEffect(() => setCounts([]), [geometry, sections]);
  useEffect(() => {
    void document.fonts?.ready.then(() => setCounts([]));
  }, []);

  // Count the section in the measurer, then move to the next uncounted one.
  useLayoutEffect(() => {
    const flow = measurer.current?.querySelector<HTMLElement>(".book-flow");
    if (!flow || !geometry || measuring >= sections.length) return;
    if (counts[measuring] === undefined) {
      const step = geometry.textWidth + geometry.columnGap;
      const pages = Math.max(1, Math.round((flow.scrollWidth + geometry.columnGap) / step));
      setCounts((current) => {
        const next = [...current];
        next[measuring] = pages;
        return next;
      });
      return;
    }
    const pending = (index: number) => index < sections.length && counts[index] === undefined;
    let next = pending(focus) ? focus : -1;
    for (let index = 0; next < 0 && index < sections.length; index++) {
      if (pending(index)) next = index;
    }
    // Everything counted: keep the section being read in the measurer.
    const target = next < 0 ? focus : next;
    if (target !== measuring) return whenIdle(() => setMeasuring(target));
  }, [counts, focus, geometry, measuring, sections.length]);

  const charsPerPage = useMemo(() => {
    let chars = 0;
    let pages = 0;
    sections.forEach((section, index) => {
      const counted = counts[index];
      if (counted && section.chars > 0) {
        chars += section.chars;
        pages += counted;
      }
    });
    return pages > 0 ? chars / pages : DEFAULT_CHARS_PER_PAGE;
  }, [counts, sections]);

  /** Where each section starts, and the book's total pages. */
  const starts = useMemo(() => {
    const result: number[] = [];
    let page = 0;
    sections.forEach((section, index) => {
      result.push(page);
      page += counts[index] ?? Math.max(1, Math.ceil(section.chars / charsPerPage));
    });
    result.push(page);
    return result;
  }, [charsPerPage, counts, sections]);

  const total = sections.length > 0 ? (starts.at(-1) ?? 0) : 0;

  /** The section a page falls in, and the page within it. */
  const locate = useCallback(
    (page: number) => {
      let low = 0;
      let high = sections.length - 1;
      while (low < high) {
        const middle = (low + high + 1) >> 1;
        if ((starts[middle] ?? 0) <= page) low = middle;
        else high = middle - 1;
      }
      return { section: low, local: page - (starts[low] ?? 0) };
    },
    [sections.length, starts],
  );

  const sectionOfChapter = useCallback(
    (noteId: string) => sections.findIndex((section) => section.chapters[0]?.noteId === noteId),
    [sections],
  );

  /** The page a range in the measurer falls on, if it holds that range's section. */
  const pageInMeasurer = useCallback(
    (range: Range | undefined): number | null => {
      const flow = measurer.current?.querySelector<HTMLElement>(".book-flow");
      const rect = range?.getClientRects()[0];
      if (!geometry || !flow || !rect) return null;
      const column = geometry.textWidth + geometry.columnGap;
      const local = Math.floor((rect.left - flow.getBoundingClientRect().left + 1) / column);
      return (starts[measuring] ?? 0) + Math.max(0, local);
    },
    [geometry, measuring, starts],
  );

  const flowFor = useCallback(
    (section: BookSection, style?: CSSProperties) =>
      geometry ? (
        <BookFlow
          book={book}
          chapters={section.chapters}
          first={section.first}
          titlePage={section.titlePage}
          geometry={geometry}
          style={style}
        />
      ) : null,
    [book, geometry],
  );

  const current = sections[measuring];
  const measurerNode: ReactNode = current ? (
    <div
      ref={measurer}
      aria-hidden="true"
      className="pointer-events-none invisible absolute -left-[99999px]"
    >
      {flowFor(current)}
    </div>
  ) : null;

  return {
    sections,
    measured: sections.length > 0 && sections.every((_, index) => counts[index] !== undefined),
    total,
    starts,
    locate,
    focus,
    setFocus,
    /** The section shown in the measurer, whose pages are exact. */
    measuring,
    measurer: measurerNode,
    measurerRef: measurer,
    pageInMeasurer,
    sectionOfChapter,
    flowFor,
  };
}
