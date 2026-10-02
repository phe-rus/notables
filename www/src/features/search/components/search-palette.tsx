import { BookIcon, Chip, cn, SearchIcon, spring } from "@notables/ui";
import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useBooks } from "../../books/store/book-store";
import { formatUpdated } from "../../library/lib/date-format";
import { noteKindLabels } from "../../library/model/note-kind-labels";
import { search } from "../lib/rank";
import { useSearchableNotes } from "../lib/use-searchable-notes";
import { closeSearch, toggleSearch, useSearchOpen } from "../store/search-palette";
import { HighlightedText } from "./highlighted-text";

const RECENT_COUNT = 6;
const RESULT_LIMIT = 40;

type Result =
  | {
      type: "note";
      id: string;
      title: string;
      meta: string;
      kind: string | null;
      snippet: { text: string; matches: Array<[number, number]> } | null;
    }
  | { type: "book"; id: string; title: string; meta: string };

/** ⌘K / Ctrl+K: search every note's full text, and books, from anywhere. */
export function SearchPalette() {
  const open = useSearchOpen();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        toggleSearch();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center px-3 pt-[12vh]">
          <motion.button
            type="button"
            aria-label="Close search"
            tabIndex={-1}
            className="absolute inset-0 bg-black/20 backdrop-blur-[6px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeSearch}
          />
          <motion.div
            role="dialog"
            aria-label="Search"
            className="glass-menu relative flex max-h-[min(560px,72vh)] w-full max-w-[640px] flex-col overflow-hidden rounded-[22px]"
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -8, transition: { duration: 0.14 } }}
            transition={spring.snappy}
          >
            <PaletteBody />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function PaletteBody() {
  const navigate = useNavigate();
  const notes = useSearchableNotes(true);
  const books = useBooks();
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const [selected, setSelected] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const results = useMemo<Result[]>(() => {
    if (!deferred.trim()) {
      return notes.slice(0, RECENT_COUNT).map(({ entry }) => ({
        type: "note",
        id: entry.id,
        title: entry.title || "New Note",
        meta: formatUpdated(entry.updatedAt),
        kind: entry.kind === "note" ? null : noteKindLabels[entry.kind],
        snippet: entry.excerpt ? { text: entry.excerpt, matches: [] } : null,
      }));
    }
    const noteHits = search(notes, deferred)
      .slice(0, RESULT_LIMIT)
      .map<Result>(({ item, snippet }) => ({
        type: "note",
        id: item.id,
        title: item.title || "New Note",
        meta: formatUpdated(item.updatedAt),
        kind: item.entry.kind === "note" ? null : noteKindLabels[item.entry.kind],
        snippet,
      }));
    const bookHits = search(
      books.map((book) => ({
        id: book.id,
        title: book.title || "Untitled book",
        body: `${book.subtitle}\n${book.author}`,
        updatedAt: book.updatedAt,
      })),
      deferred,
    ).map<Result>(({ item }) => ({
      type: "book",
      id: item.id,
      title: item.title,
      meta: item.body.split("\n")[1] || "Book",
    }));
    return [...noteHits, ...bookHits];
  }, [deferred, notes, books]);

  useEffect(() => setSelected(0), [deferred]);
  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${selected}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  const choose = (result: Result | undefined) => {
    if (!result) return;
    closeSearch();
    if (result.type === "note") {
      void navigate({ to: "/notes/$noteId", params: { noteId: result.id } });
    } else {
      void navigate({ to: "/books/$bookId", params: { bookId: result.id } });
    }
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelected((i) => Math.min(results.length - 1, i + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelected((i) => Math.max(0, i - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(results[selected]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeSearch();
    }
  };

  return (
    <>
      <label className="flex items-center gap-3 border-b border-separator/70 px-5 py-4">
        <SearchIcon size={20} strokeWidth={2} className="shrink-0 text-label-tertiary" />
        <input
          // biome-ignore lint/a11y/noAutofocus: the palette exists to be typed into.
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Search notes and books"
          aria-label="Search notes and books"
          aria-controls="search-results"
          aria-activedescendant={results.length ? `search-result-${selected}` : undefined}
          className="min-w-0 grow bg-transparent text-[18px] text-label outline-none placeholder:text-label-tertiary"
        />
        <kbd className="rounded-md bg-fill px-1.5 py-0.5 font-sans text-[11px] font-semibold text-label-tertiary">
          esc
        </kbd>
      </label>

      <div
        ref={listRef}
        id="search-results"
        role="listbox"
        aria-label="Results"
        className="flex flex-col overflow-y-auto p-2"
      >
        {!deferred.trim() && results.length > 0 && <GroupLabel>Recent</GroupLabel>}
        {results.length === 0 && (
          <p className="px-3 py-10 text-center text-[15px] text-label-secondary">
            {deferred.trim()
              ? `No results for “${deferred.trim()}”`
              : "Your notes will show up here."}
          </p>
        )}
        {results.map((result, index) => (
          <ResultRow
            key={`${result.type}:${result.id}`}
            result={result}
            index={index}
            active={index === selected}
            showBookLabel={result.type === "book" && results[index - 1]?.type !== "book"}
            onHover={() => setSelected(index)}
            onChoose={() => choose(result)}
          />
        ))}
      </div>
    </>
  );
}

function GroupLabel({ children }: { children: string }) {
  return (
    <span className="px-3 pt-1.5 pb-1 text-[12px] font-semibold text-label-tertiary">
      {children}
    </span>
  );
}

function ResultRow({
  result,
  index,
  active,
  showBookLabel,
  onHover,
  onChoose,
}: {
  result: Result;
  index: number;
  active: boolean;
  showBookLabel: boolean;
  onHover: () => void;
  onChoose: () => void;
}) {
  return (
    <>
      {showBookLabel && <GroupLabel>Books</GroupLabel>}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: the search input drives keyboard selection. */}
      <div
        id={`search-result-${index}`}
        data-index={index}
        role="option"
        aria-selected={active}
        tabIndex={-1}
        onMouseMove={onHover}
        onClick={onChoose}
        className="relative isolate flex cursor-default flex-col gap-0.5 rounded-[12px] px-3 py-2.5"
      >
        {active && (
          <motion.span
            layoutId="search-selection"
            className="absolute inset-0 -z-10 rounded-[12px] bg-fill"
            transition={spring.snappy}
          />
        )}
        <span className="flex items-center gap-2">
          {result.type === "book" && <BookIcon size={15} className="text-accent-text" />}
          <span className="truncate text-[15px] font-semibold text-label">{result.title}</span>
          {result.type === "note" && result.kind && (
            <Chip tone={active ? "accent" : "neutral"}>{result.kind}</Chip>
          )}
          <span className="ml-auto shrink-0 text-[12px] text-label-tertiary">{result.meta}</span>
        </span>
        {result.type === "note" && result.snippet && (
          <span className={cn("line-clamp-2 text-[13px] leading-snug text-label-secondary")}>
            <HighlightedText text={result.snippet.text} matches={result.snippet.matches} />
          </span>
        )}
      </div>
    </>
  );
}
