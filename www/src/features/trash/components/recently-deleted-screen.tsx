import {
  Button,
  cn,
  confirmDialog,
  IconButton,
  NoteIcon,
  SidebarIcon,
  spring,
  TrashIcon,
  useContextMenu,
} from "@notables/ui";
import { AnimatePresence, motion } from "motion/react";
import { useMemo } from "react";
import { CollapsedSidebarControls } from "../../../components/window/collapsed-sidebar-controls";
import { BookCover } from "../../books/components/book-cover";
import { type BookEntry, bookKindLabel, useTrashedBooks } from "../../books/store/book-store";
import { noteKindLabels } from "../../library/model/note-kind-labels";
import { type LibraryEntry, useLibrary } from "../../library/store/library-store";
import { usePreferences } from "../../settings/store/preferences-store";
import {
  binNotes,
  emptyBin,
  eraseBooks,
  eraseNotes,
  restoreBook,
  restoreNote,
} from "../lib/recycle-bin";
import { daysLeft, RETENTION_DAYS } from "../lib/retention";

type Item =
  | { type: "note"; id: string; trashedAt: number; entry: LibraryEntry }
  | { type: "book"; id: string; trashedAt: number; book: BookEntry };

const titleOf = (item: Item) =>
  item.type === "note" ? item.entry.title || "New Note" : item.book.title || "Untitled book";

/**
 * Deleted notes and books, newest first, each with the days it has left.
 * They can be restored, or erased now; after a week they go on their own.
 */
export function RecentlyDeletedScreen({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const notes = useLibrary();
  const books = useTrashedBooks();
  const { collapsed } = usePreferences().sidebar;

  const items = useMemo<Item[]>(
    () =>
      [
        ...binNotes(notes, books).map((entry) => ({
          type: "note" as const,
          id: entry.id,
          trashedAt: entry.trashedAt as number,
          entry,
        })),
        ...books.map((book) => ({
          type: "book" as const,
          id: book.id,
          trashedAt: book.trashedAt as number,
          book,
        })),
      ].sort((a, b) => b.trashedAt - a.trashedAt),
    [notes, books],
  );

  const confirmEmpty = async () => {
    const confirmed = await confirmDialog({
      title: "Empty Recently Deleted?",
      message: `${items.length === 1 ? "This item" : `All ${items.length} items`} will be erased from this device. This can’t be undone.`,
      confirmLabel: "Erase",
      destructive: true,
    });
    if (confirmed) await emptyBin();
  };

  return (
    <div className="flex min-h-0 grow flex-col">
      <header
        data-tauri-drag-region
        className="flex flex-col gap-3 px-5 pt-[max(12px,env(safe-area-inset-top))] pb-2"
      >
        {collapsed && <CollapsedSidebarControls />}
        <div data-tauri-drag-region className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <IconButton label="Show library" className="lg:hidden" onClick={onOpenSidebar}>
              <SidebarIcon size={20} />
            </IconButton>
            <h1 className="text-[22px] font-bold tracking-tight">Recently Deleted</h1>
          </div>
          {items.length > 0 && (
            <Button variant="ghost" onClick={confirmEmpty} className="text-danger">
              Empty
            </Button>
          )}
        </div>
      </header>

      <div className="flex grow flex-col overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[640px] flex-col gap-3 px-4 pt-2 pb-32 sm:px-5 md:pb-24">
          <p className="px-1 text-[13px] leading-snug text-label-secondary">
            Notes and books stay here for {RETENTION_DAYS} days, then they’re erased for good.
          </p>
          {items.length === 0 && (
            <div className="flex flex-col items-center gap-3 px-6 pt-20 text-center">
              <span className="flex size-14 items-center justify-center rounded-full bg-fill text-label-tertiary">
                <TrashIcon size={26} />
              </span>
              <p className="text-[16px] font-semibold">Nothing here</p>
              <p className="max-w-[300px] text-[14px] text-label-secondary">
                What you delete waits here for a week, in case you change your mind.
              </p>
            </div>
          )}
          <ul className="flex flex-col gap-1.5">
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <motion.li
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={spring.smooth}
                >
                  <BinRow item={item} />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </div>
      </div>
    </div>
  );
}

function BinRow({ item }: { item: Item }) {
  const left = daysLeft(item.trashedAt);
  const kind =
    item.type === "note" ? noteKindLabels[item.entry.kind] : (bookKindLabel(item.book) ?? "Book");

  const restore = () => (item.type === "note" ? restoreNote(item.entry) : restoreBook(item.book));
  const erase = async () => {
    const confirmed = await confirmDialog({
      title: `Erase “${titleOf(item)}”?`,
      message:
        item.type === "book"
          ? "The book, and chapters that belong only to it, will be erased from this device."
          : "It will be erased from this device, with its photos and recordings.",
      confirmLabel: "Erase",
      destructive: true,
    });
    if (!confirmed) return;
    if (item.type === "note") await eraseNotes([item.entry]);
    else await eraseBooks([item.book]);
  };
  const menu = useContextMenu(() => [
    { label: "Restore", onSelect: restore },
    "divider",
    { label: "Erase Now", destructive: true, onSelect: () => void erase() },
  ]);

  return (
    <div
      {...menu}
      className="flex touch-manipulation items-center gap-3 rounded-[16px] bg-elevated px-3 py-2.5 shadow-[inset_0_0_0_1px_var(--color-separator)] [-webkit-touch-callout:none]"
    >
      {item.type === "book" ? (
        <BookCover
          title={item.book.title}
          author={item.book.author}
          image={item.book.cover}
          className="w-9"
        />
      ) : (
        <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-fill text-label-secondary">
          <NoteIcon size={18} />
        </span>
      )}
      <span className="flex min-w-0 grow flex-col gap-0.5">
        <span className="truncate text-[15px] font-semibold">{titleOf(item)}</span>
        <span className={cn("text-[13px]", left <= 1 ? "text-danger" : "text-label-secondary")}>
          {kind} · {left === 1 ? "1 day left" : `${left} days left`}
        </span>
      </span>
      <Button variant="secondary" onClick={restore}>
        Restore
      </Button>
      <IconButton label="Erase now" onClick={() => void erase()}>
        <TrashIcon size={18} />
      </IconButton>
    </div>
  );
}
