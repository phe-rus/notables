import type { NoteKind } from "@notables/core";
import { cn, PlusIcon, SearchField } from "@ultrapeach/ui";
import { useDeferredValue, useState } from "react";
import { t } from "../../../../i18n/i18n";
import { noteKindPlural } from "../../../library/model/note-kind-labels";
import { isListedNote, useLibrary } from "../../../library/store/library-store";
import { type BookEntry, getBookStore } from "../../store/book-store";

/** Notes of the item's kind that aren't in it yet, to add as entries. */
export function ChapterPicker({ book, kind }: { book: BookEntry; kind: NoteKind }) {
  const notes = useLibrary();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const available = notes.filter(
    (n) =>
      isListedNote(n) &&
      n.kind === kind &&
      !book.chapterIds.includes(n.id) &&
      (!deferredQuery || n.title.toLowerCase().includes(deferredQuery)),
  );

  return (
    <div className="flex flex-col gap-2 pt-2">
      <SearchField
        value={query}
        placeholder={t("books.searchNotes", { kinds: noteKindPlural[kind] })}
        onChange={(e) => setQuery(e.target.value)}
      />
      <ul className="flex flex-col">
        {available.map((note) => (
          <li key={note.id}>
            <button
              type="button"
              onClick={() => getBookStore().addChapter(book.id, note.id)}
              className={cn(
                "group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-start transition-colors hover:bg-fill/70",
              )}
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent">
                <PlusIcon size={16} strokeWidth={2.2} />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-subheadline font-semibold">
                  {note.title || t("notes.newNote")}
                </span>
                <span className="truncate text-footnote text-label-secondary">
                  {note.excerpt || t("notes.noText")}
                </span>
              </span>
            </button>
          </li>
        ))}
        {available.length === 0 && (
          <li className="px-3 py-2 text-subheadline text-label-tertiary">
            {deferredQuery
              ? t("books.nothingMatches")
              : t("books.noOthers", { kinds: noteKindPlural[kind] })}
          </li>
        )}
      </ul>
    </div>
  );
}
