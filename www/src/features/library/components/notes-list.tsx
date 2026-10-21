import { NoteKind } from "@notables/core";
import {
  CalendarIcon,
  ChaptersIcon,
  ChecklistIcon,
  ChevronLeftIcon,
  ClockIcon,
  type ContextMenuItem,
  cn,
  IconButton,
  LayoutIcon,
  MoreIcon,
  NoteIcon,
  openFollowUpMenu,
  openMenu,
  PenIcon,
  PhotoIcon,
  SearchField,
  SidebarIcon,
  spring,
} from "@phe-rus/hino";
import { Button } from "@phe-rus/hino/button";
import { Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import {
  createElement,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CollapsedSidebarControls } from "@/components/window/collapsed-sidebar-controls";
import { BookShelf, useShelfBooks } from "@/features/books/components/book-shelf";
import { noteMenu } from "@/features/notes/actions/note-menu";
import { ExamplesNotice } from "@/features/onboarding/components/examples-notice";
import { search } from "@/features/search/lib/rank";
import { useSearchableNotes } from "@/features/search/lib/use-searchable-notes";
import type { ListPreferences } from "@/features/settings/model/preferences";
import { updatePreferences, usePreferences } from "@/features/settings/store/preferences-store";
import { t } from "@/i18n/i18n";
import { bucket } from "../lib/date-format";
import { useHoldToSelect } from "../lib/use-hold-to-select";
import { type GroupId, groupOf, type View } from "../model/library-views";
import { noteKindIcons } from "../model/note-kind-icons";
import { noteKindLabels } from "../model/note-kind-labels";
import { isListedNote, type LibraryEntry, useLibraryReady } from "../store/library-store";
import { GroupSwitcher } from "./group-switcher";
import { NoteRow, type SwipeSide } from "./note-row";
import { NotesSelectionBar } from "./notes-selection-bar";

interface Group {
  label: string | null;
  items: Array<{ entry: LibraryEntry; snippet?: string }>;
}

/** Each in its standard order: newest first, or A to Z. */
const sorters: Record<ListPreferences["sort"], (a: LibraryEntry, b: LibraryEntry) => number> = {
  edited: (a, b) => b.updatedAt - a.updatedAt,
  created: (a, b) => b.createdAt - a.createdAt,
  title: (a, b) => (a.title || "￿").localeCompare(b.title || "￿"),
};

export function NotesList({
  view,
  activeId,
  onOpenSidebar,
  onCreateNote,
  className,
}: {
  view: View;
  activeId?: string;
  onOpenSidebar: () => void;
  onCreateNote: (kind?: NoteKind, format?: "document" | "spreadsheet") => void;
  className?: string;
}) {
  const ready = useLibraryReady();
  const preferences = usePreferences();
  const options = preferences.list;
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [attachmentsOnly, setAttachmentsOnly] = useState(false);
  const deferredQuery = useDeferredValue(view.folderId ? "" : query.trim());
  const notes = useSearchableNotes(Boolean(deferredQuery));
  // Manga and comics views also show the bound books of that kind.
  const shelf = useShelfBooks(view.id === "comic" ? "comic" : "manga");
  const shelfBooks = !deferredQuery && (view.id === "manga" || view.id === "comic") ? shelf : [];

  const groups = useMemo<Group[]>(() => {
    const inView = notes.filter(
      (note) =>
        isListedNote(note.entry) &&
        view.matches(note.entry) &&
        (!attachmentsOnly || (note.entry.attachmentCount ?? 0) > 0),
    );
    // Searching shows the best matches first, with the passage that matched.
    if (deferredQuery) {
      const hits = search(inView, deferredQuery);
      return hits.length
        ? [
            {
              label: t("notes.results", { count: hits.length }),
              items: hits.map((hit) => ({ entry: hit.item.entry, snippet: hit.snippet?.text })),
            },
          ]
        : [];
    }
    const direction = options.order === "reversed" ? -1 : 1;
    const sorted = inView
      .map((note) => note.entry)
      .sort(
        (a, b) =>
          (options.pinnedOnTop ? Number(b.pinned) - Number(a.pinned) : 0) ||
          direction * sorters[options.sort](a, b),
      );
    const result: Group[] = [];
    for (const entry of sorted) {
      const label =
        options.pinnedOnTop && entry.pinned
          ? t("nav.pinned")
          : options.groupByDate && options.sort !== "title"
            ? bucket(options.sort === "created" ? entry.createdAt : entry.updatedAt)
            : null;
      const group = result.at(-1);
      if (group && group.label === label) group.items.push({ entry });
      else result.push({ label, items: [{ entry }] });
    }
    return result;
  }, [
    notes,
    view,
    deferredQuery,
    options.sort,
    options.order,
    options.groupByDate,
    options.pinnedOnTop,
    attachmentsOnly,
  ]);

  const listed = useMemo(() => groups.flatMap((group) => group.items), [groups]);
  const order = useMemo(() => listed.map((item) => item.entry.id), [listed]);
  const entryById = useMemo(
    () => new Map(listed.map((item) => [item.entry.id, item.entry])),
    [listed],
  );

  // Choosing several notes: hold one and slide, or Select in its menu or the header.
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [swiped, setSwiped] = useState<{ id: string; side: SwipeSide } | null>(null);
  const select = useCallback((ids: ReadonlySet<string>) => {
    setSelecting(true);
    setSwiped(null);
    setSelected(ids);
  }, []);
  const stopSelecting = useCallback(() => {
    setSelecting(false);
    setSelected(new Set());
  }, []);
  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const chosen = listed.filter((item) => selected.has(item.entry.id)).map((item) => item.entry);
  const allSelected = order.length > 0 && chosen.length === order.length;

  // Another view or search starts fresh.
  const place = `${view.id}\n${deferredQuery}`;
  const [shownPlace, setShownPlace] = useState(place);
  if (place !== shownPlace) {
    setShownPlace(place);
    stopSelecting();
    setSwiped(null);
  }
  useEffect(() => {
    if (!selecting) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") stopSelecting();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selecting, stopSelecting]);

  const menuFor = (entry: LibraryEntry) =>
    noteMenu(entry, navigate, { onSelectMany: () => select(new Set([entry.id])) });

  const scroller = useRef<HTMLDivElement>(null);
  useHoldToSelect({
    list: scroller,
    order,
    selecting,
    selected,
    select,
    menu: (id) => {
      const entry = entryById.get(id);
      return entry ? menuFor(entry) : [];
    },
  });

  return (
    <section
      aria-label={view.title}
      className={cn(
        "relative flex min-h-0 w-full flex-col md:w-[330px] md:shrink-0 md:border-r md:border-separator/70",
        options.layout === "list" ? "bg-fill/45" : "bg-surface",
        className,
      )}
    >
      <header
        data-tauri-drag-region
        className="flex shrink-0 flex-col gap-3 px-4 pt-[max(12px,env(safe-area-inset-top))] pb-2.5"
      >
        {preferences.sidebar.collapsed && <CollapsedSidebarControls />}
        <div data-tauri-drag-region className="flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-1">
            {!selecting &&
              (view.folderId ? (
                <Link
                  to="/"
                  search={{}}
                  aria-label={t("nav.workspace")}
                  className="flex size-11 shrink-0 items-center justify-center rounded-full text-accent-text md:hidden"
                >
                  <ChevronLeftIcon size={24} className="rtl:-scale-x-100" />
                </Link>
              ) : (
                <IconButton
                  size="icon-sm"
                  variant="ghost"
                  label={t("nav.showLibrary")}
                  className="hidden md:inline-flex lg:hidden"
                  onClick={onOpenSidebar}
                >
                  <SidebarIcon size={20} />
                </IconButton>
              ))}
            <h1 className="truncate text-title3 font-bold tracking-tight">
              {selecting
                ? chosen.length === 0
                  ? t("notes.selectTitle")
                  : t("notes.selectedCount", { count: chosen.length })
                : view.title}
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {selecting && (
              <Button size="xs" variant="ghost" onClick={stopSelecting}>
                {t("common.done")}
              </Button>
            )}
            {!selecting && (
              <IconButton
                size="icon-xs"
                variant="default"
                label={t("notes.more")}
                onClick={(event) => {
                  const items: ContextMenuItem[] = [
                    {
                      icon:
                        options.layout === "gallery" ? (
                          <ChaptersIcon size={18} />
                        ) : (
                          <LayoutIcon size={18} />
                        ),
                      label: t(
                        options.layout === "gallery"
                          ? "workspace.viewAsList"
                          : "workspace.viewAsGallery",
                      ),
                      onSelect: () =>
                        updatePreferences((p) => ({
                          ...p,
                          list: {
                            ...p.list,
                            layout: options.layout === "gallery" ? "list" : "gallery",
                          },
                        })),
                    },
                    {
                      label: t("nav.newNote"),
                      icon: <PenIcon size={18} />,
                      onSelect: () =>
                        openFollowUpMenu([
                          {
                            label: t("common.back"),
                            icon: <ChevronLeftIcon size={18} className="rtl:-scale-x-100" />,
                            onSelect: () => openFollowUpMenu(items),
                          },
                          "divider",
                          ...NoteKind.options.map((kind) => ({
                            label: noteKindLabels[kind],
                            icon: createElement(noteKindIcons[kind], { size: 18 }),
                            onSelect: () => onCreateNote(kind),
                          })),
                          {
                            label: t("spreadsheet.title"),
                            icon: <LayoutIcon size={18} />,
                            onSelect: () => onCreateNote("note", "spreadsheet"),
                          },
                        ]),
                    },
                    {
                      label: t("notes.selectTitle"),
                      icon: <ChecklistIcon size={18} />,
                      onSelect: () => select(new Set()),
                    },
                    "divider",
                    ...(["edited", "created", "title"] as const).map((sort) => ({
                      icon: sort === "title" ? <NoteIcon size={18} /> : <ClockIcon size={18} />,
                      label: t(
                        sort === "edited"
                          ? "settings.sortEdited"
                          : sort === "created"
                            ? "settings.sortCreated"
                            : "settings.sortTitle",
                      ),
                      checked: options.sort === sort,
                      onSelect: () =>
                        updatePreferences((p) => ({ ...p, list: { ...p.list, sort } })),
                    })),
                    {
                      label: t("settings.groupByDate"),
                      icon: <CalendarIcon size={18} />,
                      checked: options.groupByDate,
                      onSelect: () =>
                        updatePreferences((p) => ({
                          ...p,
                          list: { ...p.list, groupByDate: !p.list.groupByDate },
                        })),
                    },
                    {
                      label: t("workspace.viewAttachments"),
                      icon: <PhotoIcon size={18} />,
                      checked: attachmentsOnly,
                      onSelect: () => setAttachmentsOnly(!attachmentsOnly),
                    },
                  ];
                  openMenu(event.currentTarget, items, { edge: "trailing" });
                }}
              >
                <MoreIcon size={18} />
              </IconButton>
            )}
          </div>
        </div>
        {groupOf(view.id) && <GroupSwitcher group={groupOf(view.id) as GroupId} active={view.id} />}
        {!view.folderId && (
          <SearchField
            value={query}
            placeholder={t("notes.searchIn", { place: view.title.toLowerCase() })}
            onChange={(event) => setQuery(event.target.value)}
          />
        )}
        {!selecting && <ExamplesNotice />}
      </header>

      <div
        ref={scroller}
        onScroll={() => swiped && setSwiped(null)}
        className="scroll-surface flex min-h-0 flex-1 flex-col px-4"
      >
        <BookShelf
          books={shelfBooks}
          label={view.id === "comic" ? t("notes.yourComics") : t("notes.yourManga")}
        />
        {ready && groups.length === 0 && shelfBooks.length === 0 && (
          <EmptyList searching={Boolean(deferredQuery)} onCreate={() => onCreateNote()} />
        )}
        {groups.map((group, index) => (
          <div
            key={group.label ?? `group-${index}`}
            className={
              options.layout === "gallery"
                ? "grid shrink-0 grid-cols-3 gap-x-3 gap-y-4 pb-5"
                : "flex shrink-0 flex-col pb-5"
            }
          >
            {group.label && (
              <h2
                className={cn(
                  "col-span-full px-1 font-bold text-label",
                  options.layout === "list" ? "pt-3 pb-2 text-headline" : "pt-4 pb-3 text-title3",
                )}
              >
                {group.label}
              </h2>
            )}
            <div
              className={
                options.layout === "gallery"
                  ? "contents"
                  : "overflow-hidden rounded-4xl bg-background"
              }
            >
              <AnimatePresence initial={false}>
                {group.items.map(({ entry, snippet }) => (
                  <motion.div
                    key={entry.id}
                    className={
                      options.layout === "gallery"
                        ? undefined
                        : "[&:not(:last-child)]:after:mx-5 [&:not(:last-child)]:after:block [&:not(:last-child)]:after:h-px [&:not(:last-child)]:after:bg-separator/70"
                    }
                    initial={false}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={spring.smooth}
                  >
                    <NoteRow
                      entry={entry}
                      snippet={snippet}
                      active={entry.id === activeId}
                      // Without the Pinned heading (searching, or pinned not on top), a pin marks them.
                      pinMark={entry.pinned && (Boolean(deferredQuery) || !options.pinnedOnTop)}
                      options={options}
                      selecting={selecting}
                      selected={selected.has(entry.id)}
                      swiped={swiped?.id === entry.id ? swiped.side : null}
                      onSwipe={(side) => setSwiped(side ? { id: entry.id, side } : null)}
                      menu={() => menuFor(entry)}
                      onTap={() => {
                        if (selecting) {
                          toggle(entry.id);
                          return true;
                        }
                        // A tap while a row is open closes it, as on iOS.
                        if (swiped) {
                          setSwiped(null);
                          return true;
                        }
                        return false;
                      }}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        ))}
        <div aria-hidden="true" className="h-2 shrink-0" />
      </div>
      <AnimatePresence>
        {selecting && (
          <NotesSelectionBar
            chosen={chosen}
            allSelected={allSelected}
            onToggleAll={() => setSelected(new Set(allSelected ? [] : order))}
            onDone={stopSelecting}
          />
        )}
      </AnimatePresence>
    </section>
  );
}

function EmptyList({ searching, onCreate }: { searching: boolean; onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 pt-16 text-center">
      <p className="text-subheadline text-label-secondary">
        {searching ? t("notes.noMatches") : t("notes.empty")}
      </p>
      {!searching && (
        <Button size="sm" onClick={onCreate}>
          {t("notes.writeSomething")}
        </Button>
      )}
    </div>
  );
}
