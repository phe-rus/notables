import { Link } from "@tanstack/react-router";
import {
  ChevronRightIcon,
  type ContextMenuItem,
  MoreIcon,
  openMenu,
  spring,
  useContextMenu,
} from "@ultrapeach/ui";
import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useId, useState } from "react";
import { t } from "../../../../i18n/i18n";
import type { LibraryEntry } from "../../../library/store/library-store";
import { PART_TITLE_MAX, renamePart } from "../../actions/parts";
import type { BookEntry, Part } from "../../store/book-store";
import { RowButton } from "./row-button";

/**
 * A group as a playlist: its title and how many entries, folding open to
 * them. A group of one entry is that entry, under the group's title.
 */
export function GroupBlock({
  book,
  part,
  entries,
  label,
  open,
  renaming,
  onRenamed,
  onToggle,
  menu,
  children,
}: {
  book: BookEntry;
  part: Part;
  entries: LibraryEntry[];
  /** "Season 2": the group's place, shown when its title says something else. */
  label: string;
  open: boolean;
  renaming: boolean;
  onRenamed: () => void;
  onToggle: () => void;
  menu: () => ContextMenuItem[];
  children: ReactNode;
}) {
  const handlers = useContextMenu(menu);
  const bodyId = useId();
  const single = entries.length === 1 ? entries[0] : undefined;
  const subtitle = [
    part.title === label ? null : label,
    single
      ? single.title && single.title !== part.title
        ? single.title
        : null
      : t("books.group.count", { count: entries.length }),
  ]
    .filter(Boolean)
    .join(" · ");

  const title = renaming ? (
    <GroupTitleInput book={book} part={part} onDone={onRenamed} />
  ) : (
    <span className="truncate font-serif text-[18px] font-semibold tracking-tight">
      {part.title}
    </span>
  );

  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={spring.smooth}
      {...handlers}
      className="flex touch-manipulation flex-col overflow-hidden rounded-4xl bg-elevated shadow-[inset_0_0_0_1px_var(--color-separator)] [-webkit-touch-callout:none]"
    >
      <div className="flex items-center gap-1 pe-2">
        {single && !renaming ? (
          <Link
            to="/notes/$noteId"
            params={{ noteId: single.id }}
            className="flex min-w-0 grow items-center gap-3 py-3 ps-3 no-underline transition-colors hover:bg-fill/40"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-text">
              <ChevronRightIcon size={16} strokeWidth={2.2} className="rtl:-scale-x-100" />
            </span>
            <span className="flex min-w-0 flex-col text-label">
              {title}
              {subtitle && (
                <span className="truncate text-footnote text-label-secondary">{subtitle}</span>
              )}
            </span>
          </Link>
        ) : (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={bodyId}
            onClick={renaming ? undefined : onToggle}
            className="flex min-w-0 grow items-center gap-3 py-3 ps-3 text-start"
          >
            <motion.span
              animate={{ rotate: open ? 90 : 0 }}
              transition={spring.snappy}
              className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-fill text-label-secondary rtl:-scale-x-100"
            >
              <ChevronRightIcon size={16} strokeWidth={2.2} />
            </motion.span>
            <span className="flex min-w-0 grow flex-col text-label">
              {title}
              {subtitle && (
                <span className="truncate text-footnote text-label-secondary">{subtitle}</span>
              )}
            </span>
          </button>
        )}
        <RowButton
          label={t("notes.more")}
          onClick={(event) => {
            openMenu(event.currentTarget, menu(), { edge: "trailing" });
          }}
        >
          <MoreIcon size={18} />
        </RowButton>
      </div>
      <AnimatePresence initial={false}>
        {open && !single && (
          <motion.div
            id={bodyId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={spring.smooth}
            className="overflow-hidden"
          >
            <ol className="flex flex-col gap-1 border-t border-separator/60 p-1.5">
              {entries.length > 0 ? (
                children
              ) : (
                <li className="px-3 py-2 text-subheadline text-label-tertiary">
                  {t("books.group.empty")}
                </li>
              )}
            </ol>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

function GroupTitleInput({
  book,
  part,
  onDone,
}: {
  book: BookEntry;
  part: Part;
  onDone: () => void;
}) {
  const [title, setTitle] = useState(part.title);
  const save = () => {
    if (title.trim() && title !== part.title) renamePart(book.id, part.id, title);
    onDone();
  };
  return (
    <input
      aria-label={t("books.part.title")}
      value={title}
      maxLength={PART_TITLE_MAX}
      // biome-ignore lint/a11y/noAutofocus: renaming starts by typing the new name
      autoFocus
      onFocus={(event) => event.currentTarget.select()}
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => setTitle(event.target.value)}
      onBlur={save}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") {
          setTitle(part.title);
          onDone();
        }
      }}
      className="min-w-0 grow rounded-md bg-fill/60 px-2 py-0.5 font-serif text-[18px] font-semibold tracking-tight outline-none"
    />
  );
}
