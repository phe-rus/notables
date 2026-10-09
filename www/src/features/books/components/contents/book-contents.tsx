import { useNavigate } from "@tanstack/react-router";
import {
  Button,
  CanvasIcon,
  type ContextMenuItem,
  confirmDialog,
  FolderIcon,
  MicIcon,
  PlusIcon,
  spring,
  toast,
} from "@ultrapeach/ui";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useRef, useState } from "react";
import { t } from "../../../../i18n/i18n";
import { IMPORT_ACCEPT, withPath } from "../../../imports/lib/picked-files";
import { appendToBook } from "../../../imports/lib/run-import";
import { noteKindPlural } from "../../../library/model/note-kind-labels";
import type { LibraryEntry } from "../../../library/store/library-store";
import { queueRecording } from "../../../recording/lib/pending-recording";
import { queueDrawing } from "../../../studio/lib/pending-drawing";
import { moveNotesToBin } from "../../../trash/lib/recycle-bin";
import {
  addPart,
  moveChapterToPart,
  movePart,
  placeNewChapters,
  removePart,
} from "../../actions/parts";
import { chapterKind, startChapter } from "../../actions/start-chapter";
import { switchComicKind } from "../../actions/switch-kind";
import { useBookKind } from "../../lib/book-kind";
import {
  chapterOutline,
  type OutlineSection,
  withChaptersSwapped,
} from "../../lib/chapter-outline";
import { hasAction, otherDrawnKind, switchKindLabel } from "../../lib/kind-actions";
import { numberedName, structureOf, unitName } from "../../model/structure-labels";
import { type BookEntry, getBookStore, type Part } from "../../store/book-store";
import { ChapterPicker } from "./chapter-picker";
import { EntryRow } from "./entry-row";
import { GroupBlock } from "./group-block";
import { StructureControl } from "./structure-control";

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
        <h2 className="text-footnote font-semibold tracking-[0.04em] text-label-tertiary uppercase">
          {unitName(structure.entry, true)}
        </h2>
        <StructureControl book={book} structure={structure} fallback={structureOf({}, mediaKind)} />
      </div>
      {chapters.length === 0 && (
        <p className="text-subheadline text-label-secondary">
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
        <div className="flex flex-col gap-2 rounded-2xl bg-fill/50 px-4 py-3" aria-live="polite">
          <p className="truncate text-subheadline text-label-secondary">{adding.label}</p>
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
