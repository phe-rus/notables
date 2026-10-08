import { Link } from "@tanstack/react-router";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CloseIcon,
  type ContextMenuItem,
  spring,
  useContextMenu,
} from "@ultrapeach/ui";
import { motion } from "motion/react";
import { t } from "../../../../i18n/i18n";
import type { LibraryEntry } from "../../../library/store/library-store";
import type { BookEntry } from "../../store/book-store";
import { RowButton } from "./row-button";

export function EntryRow({
  book,
  note,
  number,
  isFirst,
  isLast,
  onMove,
  onRemove,
  menu,
}: {
  book: BookEntry;
  note: LibraryEntry;
  number: number;
  isFirst: boolean;
  isLast: boolean;
  onMove: (step: 1 | -1) => void;
  onRemove: () => void;
  menu: () => ContextMenuItem[];
}) {
  const handlers = useContextMenu(menu);
  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={spring.smooth}
      {...handlers}
      className="group flex touch-manipulation items-center gap-1 rounded-2xl bg-elevated pe-2 shadow-[inset_0_0_0_1px_var(--color-separator)] transition-colors [-webkit-touch-callout:none] hover:bg-fill/40 [li_li&]:shadow-none"
    >
      <Link
        to="/notes/$noteId"
        params={{ noteId: note.id }}
        className="flex min-w-0 grow items-center gap-3 py-2.5 ps-3 no-underline"
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-fill text-footnote font-semibold text-label-secondary tabular-nums">
          {number}
        </span>
        <span className="grow truncate font-serif text-body text-label">
          {note.title || t("common.untitled")}
        </span>
      </Link>
      <RowButton label={t("books.moveUp")} disabled={isFirst} onClick={() => onMove(-1)}>
        <ChevronUpIcon size={18} />
      </RowButton>
      <RowButton label={t("books.moveDown")} disabled={isLast} onClick={() => onMove(1)}>
        <ChevronDownIcon size={18} />
      </RowButton>
      <RowButton
        label={note.bookId === book.id ? t("books.deleteChapter") : t("books.removeFromBook")}
        onClick={onRemove}
      >
        <CloseIcon size={17} />
      </RowButton>
    </motion.li>
  );
}
