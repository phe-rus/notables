import type { NoteKind } from "@notables/core";
import {
  Button,
  CanvasIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  CloseIcon,
  type ContextMenuItem,
  cn,
  confirmDialog,
  FolderIcon,
  MicIcon,
  MoreIcon,
  openContextMenu,
  PlusIcon,
  Popover,
  SearchField,
  SelectorIcon,
  spring,
  toast,
  useContextMenu,
  useDismiss,
} from "@notables/ui";
import { Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import {
  type ReactNode,
  useCallback,
  useDeferredValue,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { Field, SelectInput, TextInput } from "../../../components/form/form-fields";
import { t } from "../../../i18n/i18n";
import { IMPORT_ACCEPT, withPath } from "../../imports/lib/picked-files";
import { appendToBook } from "../../imports/lib/run-import";
import { noteKindPlural } from "../../library/model/note-kind-labels";
import { isListedNote, type LibraryEntry, useLibrary } from "../../library/store/library-store";
import { queueRecording } from "../../recording/lib/pending-recording";
import { queueDrawing } from "../../studio/lib/pending-drawing";
import { moveNotesToBin } from "../../trash/lib/recycle-bin";
import {
  addPart,
  moveChapterToPart,
  movePart,
  PART_TITLE_MAX,
  placeNewChapters,
  removePart,
  renamePart,
  setStructure,
} from "../actions/parts";
import { chapterKind, startChapter } from "../actions/start-chapter";
import { switchComicKind } from "../actions/switch-kind";
import { useBookKind } from "../lib/book-kind";
import { chapterOutline, type OutlineSection, withChaptersSwapped } from "../lib/chapter-outline";
import { hasAction, otherDrawnKind, switchKindLabel } from "../lib/kind-actions";
import {
  entryUnits,
  groupUnits,
  isUnit,
  LABEL_MAX,
  numberedName,
  type Structure,
  structureOf,
  unitName,
} from "../model/structure-labels";
import { type BookEntry, getBookStore, type Part } from "../store/book-store";

/** Where files being added go: the end of the item, the end of a group, or a new group. */
type Destination = { partId: string } | { newPart: string } | null;

/** A picked folder's own subfolders become groups; Safari on iOS can't pick folders. */
const canPickFolders =
  typeof document !== "undefined" && "webkitdirectory" in document.createElement("input");

/**
 * An item's contents, arranged like playlists: entries outside any group
 * first, then each group (a season, a volume, an arc) folding open to its
 * entries. A group holding a single entry is shown as that entry.
 */
export function BookContents({ book, chapters }: { book: BookEntry; chapters: LibraryEntry[] }) {
  const navigate = useNavigate();
  const mediaKind = useBookKind(book);
  const kind = chapterKind(book);
  const structure = structureOf(book, mediaKind);
  const [picking, setPicking] = useState(false);
  const [starting, setStarting] = useState(false);
  const [adding, setAdding] = useState<{ label: string; progress: number } | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const filesInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const destination = useRef<Destination>(null);

  const byId = new Map(chapters.map((note) => [note.id, note]));
  const sections = chapterOutline(book, (id) => byId.has(id));
  const groups = sections.filter((section): section is Required<OutlineSection> =>
    Boolean(section.part),
  );
  const groupNumber = (partId: string) => groups.findIndex((s) => s.part.id === partId) + 1;

  // The first group starts open; the rest wait folded, as in a playlist.
  const [open, setOpen] = useState<Set<string>>(
    () => new Set(groups[0] ? [groups[0].part.id] : []),
  );
  const toggle = useCallback((partId: string, force?: boolean) => {
    setOpen((current) => {
      const next = new Set(current);
      if (force ?? !next.has(partId)) next.add(partId);
      else next.delete(partId);
      return next;
    });
  }, []);

  const drawn = hasAction(mediaKind, "drawPage");
  // An audiobook grows by recording or adding audio, not by writing chapters.
  const audio = hasAction(mediaKind, "addAudio");
  const newGroupName = numberedName(structure.group, groups.length + 1);

  const pickFiles = (to: Destination) => {
    destination.current = to;
    filesInput.current?.click();
  };

  // E-books, PDFs, comic pages and audiobook tracks become entries here.
  const addFiles = async (files: Array<ReturnType<typeof withPath>>, folder: boolean) => {
    if (files.length === 0) return;
    const to = destination.current;
    destination.current = null;
    setAdding({ label: t("imports.reading"), progress: 0 });
    try {
      const firstNumber = groups.length + 1;
      const result = await appendToBook(book.id, files, {
        onProgress: (label, done, total) =>
          setAdding({ label, progress: total ? done / total : 0 }),
        // A folder of folders: each one is a group, named after its folder.
        ...(folder && !to
          ? {
              groupEach: (title: string, index: number) =>
                title || numberedName(structure.group, firstNumber + index),
            }
          : {}),
      });
      if (to && result.added.length > 0) {
        placeNewChapters(book.id, result.added, to);
        if ("partId" in to) toggle(to.partId, true);
      }
      // Files that don't fit this kind are named, so nothing goes missing silently.
      const skipped =
        result.skipped.length > 0
          ? `${t("books.skippedFiles", { count: result.skipped.length })}: ${result.skipped.join(", ")}`
          : undefined;
      if (result.chapters === 0) {
        toast(t("books.nothingToAdd"), { description: skipped ?? t("books.nothingToAddBody") });
      } else {
        toast.success(t("books.chaptersAdded", { count: result.chapters }), {
          description: skipped,
        });
      }
    } catch (error) {
      toast.error(t("books.couldNotAdd"), {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setAdding(null);
    }
  };

  const openNew = async (begin: (noteId: string) => void, reuseLast = false) => {
    setStarting(true);
    try {
      const noteId = (reuseLast ? book.chapterIds.at(-1) : undefined) ?? (await startChapter(book));
      begin(noteId);
      void navigate({ to: "/notes/$noteId", params: { noteId } });
    } finally {
      setStarting(false);
    }
  };

  // Written books open a new group with a new chapter; others with files.
  const newGroup = async () => {
    if (audio || drawn) {
      pickFiles({ newPart: newGroupName });
      return;
    }
    setStarting(true);
    try {
      const noteId = await startChapter(book);
      addPart(book.id, noteId, newGroupName);
      void navigate({ to: "/notes/$noteId", params: { noteId } });
    } finally {
      setStarting(false);
    }
  };

  // A chapter written for this item goes to Recently Deleted; a borrowed
  // note just leaves the item and stays in the notes.
  const removeEntry = (note: LibraryEntry) => {
    if (note.bookId === book.id) moveNotesToBin([note]);
    else getBookStore().removeChapter(book.id, note.id);
  };

  const removeGroup = async (part: Part, entries: LibraryEntry[]) => {
    const confirmed = await confirmDialog({
      title: t("books.group.deleteTitle", { title: part.title }),
      message: t("books.group.deleteBody", { count: entries.length }),
      confirmLabel: t("common.delete"),
      destructive: true,
    });
    if (!confirmed) return;
    removePart(book.id, part.id);
    const own = entries.filter((note) => note.bookId === book.id);
    if (own.length > 0) moveNotesToBin(own);
    for (const note of entries) {
      if (note.bookId !== book.id) getBookStore().removeChapter(book.id, note.id);
    }
  };

  const entryMenu = (note: LibraryEntry, section: OutlineSection): ContextMenuItem[] => {
    const opens = section.part?.startsAt === note.id && section.chapterIds[0] === note.id;
    const elsewhere = groups.filter((group) => group.part.id !== section.part?.id);
    return [
      {
        label: t("books.group.startHere", { name: unitName(structure.group) }),
        disabled: opens,
        onSelect: () => {
          const part = addPart(book.id, note.id, newGroupName);
          if (part) {
            toggle(part.id, true);
            setRenaming(part.id);
          }
        },
      },
      ...(section.part || elsewhere.length > 0
        ? ([
            "divider",
            { heading: t("books.group.moveTo") },
            ...(section.part
              ? [
                  {
                    label: t("books.group.outside"),
                    onSelect: () => moveChapterToPart(book.id, note.id, null),
                  },
                ]
              : []),
            ...elsewhere.map((group) => ({
              label: group.part.title,
              onSelect: () => {
                moveChapterToPart(book.id, note.id, group.part.id);
                toggle(group.part.id, true);
              },
            })),
          ] satisfies ContextMenuItem[])
        : []),
    ];
  };

  const groupMenu = (part: Part, entries: LibraryEntry[]): ContextMenuItem[] => {
    const index = groups.findIndex((group) => group.part.id === part.id);
    return [
      { label: t("books.group.rename"), onSelect: () => setRenaming(part.id) },
      { label: t("books.group.addHere"), onSelect: () => pickFiles({ partId: part.id }) },
      "divider",
      {
        label: t("books.moveUp"),
        disabled: index <= 0,
        onSelect: () => movePart(book.id, part.id, -1),
      },
      {
        label: t("books.moveDown"),
        disabled: index >= groups.length - 1,
        onSelect: () => movePart(book.id, part.id, 1),
      },
      { label: t("books.group.ungroup"), onSelect: () => removePart(book.id, part.id) },
      "divider",
      {
        label: t("books.group.delete"),
        destructive: true,
        onSelect: () => void removeGroup(part, entries),
      },
    ];
  };

  const rowsFor = (section: OutlineSection) => {
    const entries = section.chapterIds.flatMap((id) => byId.get(id) ?? []);
    return entries.map((note, index) => (
      <EntryRow
        key={note.id}
        book={book}
        note={note}
        number={index + 1}
        // Moves stay inside the group; "Move To" crosses between groups.
        onMove={(step) => {
          const neighbour = entries[index + step];
          if (neighbour) {
            getBookStore().update(book.id, withChaptersSwapped(book, note.id, neighbour.id));
          }
        }}
        isFirst={index === 0}
        isLast={index === entries.length - 1}
        onRemove={() => removeEntry(note)}
        menu={() => entryMenu(note, section)}
      />
    ));
  };

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h2 className="text-[13px] font-semibold tracking-[0.04em] text-label-tertiary uppercase">
          {unitName(structure.entry, true)}
        </h2>
        <StructureControl book={book} structure={structure} fallback={structureOf({}, mediaKind)} />
      </div>
      {chapters.length === 0 && (
        <p className="text-[15px] text-label-secondary">
          {audio
            ? t("books.noAudio")
            : drawn
              ? t("books.noPages")
              : t("books.noChapters", { kinds: noteKindPlural[kind] })}
        </p>
      )}
      <ol className="flex flex-col gap-1.5">
        {sections.map((section) => {
          const { part } = section;
          if (!part) return rowsFor(section);
          const entries = section.chapterIds.flatMap((id) => byId.get(id) ?? []);
          return (
            <GroupBlock
              key={part.id}
              book={book}
              part={part}
              entries={entries}
              label={numberedName(structure.group, groupNumber(part.id))}
              open={open.has(part.id)}
              renaming={renaming === part.id}
              onRenamed={() => setRenaming(null)}
              onToggle={() => toggle(part.id)}
              menu={() => groupMenu(part, entries)}
            >
              {rowsFor(section)}
            </GroupBlock>
          );
        })}
      </ol>
      <div className="flex flex-wrap gap-2 pt-1">
        {drawn && (
          <Button
            variant="primary"
            disabled={starting}
            onClick={() => void openNew(queueDrawing, true)}
          >
            <CanvasIcon size={16} />
            {t("books.drawPage")}
          </Button>
        )}
        {hasAction(mediaKind, "newChapter") && (
          <Button variant="primary" disabled={starting} onClick={() => void openNew(() => {})}>
            <PlusIcon size={16} strokeWidth={2.2} />
            {t("books.newEntry", { name: unitName(structure.entry) })}
          </Button>
        )}
        {hasAction(mediaKind, "recordChapter") && (
          <Button
            variant="primary"
            disabled={starting}
            onClick={() => void openNew(queueRecording)}
          >
            <MicIcon size={16} />
            {t("books.action.recordChapter")}
          </Button>
        )}
        <Button variant="secondary" disabled={adding !== null} onClick={() => pickFiles(null)}>
          {audio ? t("books.addAudio") : t("books.addFromFiles")}
        </Button>
        <Button
          variant="secondary"
          disabled={adding !== null || starting}
          onClick={() => void newGroup()}
        >
          {t("books.group.new", { name: unitName(structure.group) })}
        </Button>
        {canPickFolders && (
          <Button
            variant="secondary"
            disabled={adding !== null}
            onClick={() => folderInput.current?.click()}
          >
            <FolderIcon size={16} />
            {t("books.group.addFolder")}
          </Button>
        )}
        <input
          ref={filesInput}
          type="file"
          multiple
          accept={audio ? "audio/*" : IMPORT_ACCEPT}
          hidden
          onChange={(event) => {
            const files = [...(event.target.files ?? [])];
            event.target.value = "";
            void addFiles(
              files.map((file) => withPath(file)),
              false,
            );
          }}
        />
        <input
          ref={folderInput}
          type="file"
          hidden
          {...{ webkitdirectory: "" }}
          onChange={(event) => {
            const files = [...(event.target.files ?? [])];
            event.target.value = "";
            void addFiles(
              files.map((file) => withPath(file)),
              true,
            );
          }}
        />
        {!audio && (
          <Button
            variant="secondary"
            aria-expanded={picking}
            onClick={() => setPicking((value) => !value)}
          >
            {picking ? t("books.doneAdding") : t("books.addNotes", { kinds: noteKindPlural[kind] })}
          </Button>
        )}
        {hasAction(mediaKind, "switchKind") && (
          <Button
            variant="secondary"
            onClick={() => switchComicKind(book, otherDrawnKind(mediaKind))}
          >
            {switchKindLabel(book, mediaKind)}
          </Button>
        )}
      </div>
      {adding && (
        <div className="flex flex-col gap-2 rounded-[14px] bg-fill/50 px-4 py-3" aria-live="polite">
          <p className="truncate text-[14px] text-label-secondary">{adding.label}</p>
          <div className="h-1.5 overflow-hidden rounded-full bg-fill">
            <motion.div
              className="h-full rounded-full bg-accent"
              animate={{ width: `${Math.max(4, adding.progress * 100)}%` }}
              transition={spring.smooth}
            />
          </div>
        </div>
      )}
      <AnimatePresence initial={false}>
        {picking && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={spring.smooth}
            className="overflow-hidden"
          >
            <ChapterPicker book={book} kind={kind} />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

/**
 * A group as a playlist: its title and how many entries, folding open to
 * them. A group of one entry is that entry, under the group's title.
 */
function GroupBlock({
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
      className="flex touch-manipulation flex-col overflow-hidden rounded-[18px] bg-elevated shadow-[inset_0_0_0_1px_var(--color-separator)] [-webkit-touch-callout:none]"
    >
      <div className="flex items-center gap-1 pe-2">
        {single && !renaming ? (
          <Link
            to="/notes/$noteId"
            params={{ noteId: single.id }}
            className="flex min-w-0 grow items-center gap-3 py-3 ps-3 no-underline transition-colors hover:bg-fill/40"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-accent-soft text-accent-text">
              <ChevronRightIcon size={16} strokeWidth={2.2} className="rtl:-scale-x-100" />
            </span>
            <span className="flex min-w-0 flex-col text-label">
              {title}
              {subtitle && (
                <span className="truncate text-[13px] text-label-secondary">{subtitle}</span>
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
              className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-fill text-label-secondary rtl:-scale-x-100"
            >
              <ChevronRightIcon size={16} strokeWidth={2.2} />
            </motion.span>
            <span className="flex min-w-0 grow flex-col text-label">
              {title}
              {subtitle && (
                <span className="truncate text-[13px] text-label-secondary">{subtitle}</span>
              )}
            </span>
          </button>
        )}
        <RowButton
          label={t("notes.more")}
          onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            openContextMenu(rect.right - 220, rect.bottom + 4, menu());
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
                <li className="px-3 py-2 text-[14px] text-label-tertiary">
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
      className="min-w-0 grow rounded-[8px] bg-fill/60 px-2 py-0.5 font-serif text-[18px] font-semibold tracking-tight outline-none"
    />
  );
}

function EntryRow({
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
      className="group flex touch-manipulation items-center gap-1 rounded-[14px] bg-elevated pe-2 shadow-[inset_0_0_0_1px_var(--color-separator)] transition-colors [-webkit-touch-callout:none] hover:bg-fill/40 [li_li&]:shadow-none"
    >
      <Link
        to="/notes/$noteId"
        params={{ noteId: note.id }}
        className="flex min-w-0 grow items-center gap-3 py-2.5 ps-3 no-underline"
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-fill text-[13px] font-semibold text-label-secondary tabular-nums">
          {number}
        </span>
        <span className="grow truncate font-serif text-[17px] text-label">
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

function RowButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      data-tooltip={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-8 shrink-0 items-center justify-center rounded-full text-[16px] text-label-secondary transition-colors hover:bg-fill disabled:opacity-30"
    >
      {children}
    </button>
  );
}

const CUSTOM = "custom";

/** "Seasons · Episodes": what this item's groups and entries are called, changed in place. */
function StructureControl({
  book,
  structure,
  fallback,
}: {
  book: BookEntry;
  structure: Structure;
  /** The kind's own words: choosing one of them clears the item's. */
  fallback: Structure;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const close = useCallback(() => setOpen(false), []);
  useDismiss(root, open, close);
  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-1 rounded-full px-2 py-1 text-[13px] font-medium text-accent-text transition-colors hover:bg-accent-soft"
      >
        {unitName(structure.group, true)} · {unitName(structure.entry, true)}
        <SelectorIcon size={14} strokeWidth={2} />
      </button>
      <Popover
        open={open}
        id={panelId}
        role="dialog"
        aria-label={t("books.structure.groups")}
        origin="top-right"
        className="top-[calc(100%+8px)] end-0 flex w-[300px] max-w-[calc(100vw-32px)] flex-col gap-3 p-4"
      >
        <LabelPicker
          label={t("books.structure.groups")}
          value={structure.group}
          choices={groupUnits}
          onChange={(group) =>
            setStructure(book.id, { group: group === fallback.group ? "" : group })
          }
        />
        <LabelPicker
          label={t("books.structure.entries")}
          value={structure.entry}
          choices={entryUnits}
          onChange={(entry) =>
            setStructure(book.id, { entry: entry === fallback.entry ? "" : entry })
          }
        />
      </Popover>
    </div>
  );
}

/** A known word from the list, or "Custom…" and a field for one's own. */
function LabelPicker({
  label,
  value,
  choices,
  onChange,
}: {
  label: string;
  value: string;
  choices: readonly string[];
  onChange: (value: string) => void;
}) {
  const known = isUnit(value) && choices.includes(value);
  const [custom, setCustom] = useState(!known);
  const [draft, setDraft] = useState(known ? "" : value);
  useEffect(() => {
    if (!isUnit(value)) setDraft(value);
  }, [value]);
  return (
    <Field label={label}>
      <SelectInput
        label={label}
        value={custom ? CUSTOM : value}
        onChange={(next) => {
          if (next === CUSTOM) {
            setCustom(true);
            return;
          }
          setCustom(false);
          onChange(next);
        }}
        options={[
          ...choices.map((unit) => ({ value: unit, label: unitName(unit) })),
          { value: CUSTOM, label: t("books.structure.custom") },
        ]}
      />
      {custom && (
        <TextInput
          aria-label={t("books.structure.customName")}
          placeholder={t("books.structure.customName")}
          value={draft}
          maxLength={LABEL_MAX}
          autoFocus={!draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => draft.trim() && onChange(draft)}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
          className="mt-1.5"
        />
      )}
    </Field>
  );
}

/** Notes of the item's kind that aren't in it yet, to add as entries. */
function ChapterPicker({ book, kind }: { book: BookEntry; kind: NoteKind }) {
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
                "group flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-start transition-colors hover:bg-fill/70",
              )}
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent">
                <PlusIcon size={16} strokeWidth={2.2} />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[15px] font-semibold">
                  {note.title || t("notes.newNote")}
                </span>
                <span className="truncate text-[13px] text-label-secondary">
                  {note.excerpt || t("notes.noText")}
                </span>
              </span>
            </button>
          </li>
        ))}
        {available.length === 0 && (
          <li className="px-3 py-2 text-[14px] text-label-tertiary">
            {deferredQuery
              ? t("books.nothingMatches")
              : t("books.noOthers", { kinds: noteKindPlural[kind] })}
          </li>
        )}
      </ul>
    </div>
  );
}
