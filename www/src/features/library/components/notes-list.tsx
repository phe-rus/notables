import { NoteKind } from "@notables/core";
import {
  CalendarIcon,
  ChaptersIcon,
  ChecklistIcon,
  ChevronLeftIcon,
  ClockIcon,
  cn,
  IconButton,
  LayoutIcon,
  MoreIcon,
  NoteIcon,
  openMenu,
  PenIcon,
  PhotoIcon,
  SearchField,
  SidebarIcon,
  spring,
} from "@phe-rus/hino";
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
import { CollapsedSidebarControls } from "../../../components/window/collapsed-sidebar-controls";
import { t } from "../../../i18n/i18n";
import { BookShelf, useShelfBooks } from "../../books/components/book-shelf";
import { noteMenu } from "../../notes/actions/note-menu";
import { ExamplesNotice } from "../../onboarding/components/examples-notice";
import { search } from "../../search/lib/rank";
import { useSearchableNotes } from "../../search/lib/use-searchable-notes";
import type { ListPreferences } from "../../settings/model/preferences";
import { updatePreferences, usePreferences } from "../../settings/store/preferences-store";
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
  const deferredQuery = useDeferredValue(query.trim());
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
        "relative flex w-full flex-col bg-surface md:w-[330px] md:shrink-0 md:border-r md:border-separator/70",
        className,
      )}
    >
      <header
        data-tauri-drag-region
        className="flex flex-col gap-3 px-4 pt-[max(12px,env(safe-area-inset-top))] pb-2.5"
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
                  className="lg:hidden"
                  onClick={onOpenSidebar}
                >
                  <SidebarIcon size={20} />
                </IconButton>
              ))}
            <h1 className="truncate text-title2 font-bold tracking-tight">
              {selecting
                ? chosen.length === 0
                  ? t("notes.selectTitle")
                  : t("notes.selectedCount", { count: chosen.length })
                : view.title}
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {selecting && (
              <button
                type="button"
                onClick={() => (selecting ? stopSelecting() : select(new Set()))}
                className={cn(
                  "h-8 rounded-full px-3 text-subheadline text-accent-text transition-colors hover:bg-fill",
                  selecting && "font-semibold",
                )}
              >
                {selecting ? t("common.done") : t("notes.select")}
              </button>
            )}
            {!selecting && (
              <IconButton
                size="icon-xs"
                variant="default"
                label={t("notes.more")}
                onClick={(event) =>
                  openMenu(
                    event.currentTarget,
                    [
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
                        onSelect: () => onCreateNote(),
                      },
                      {
                        label: t("spreadsheet.title"),
                        icon: <LayoutIcon size={18} />,
                        onSelect: () => onCreateNote("note", "spreadsheet"),
                      },
                      ...NoteKind.options.map((kind) => ({
                        label: noteKindLabels[kind],
                        icon: createElement(noteKindIcons[kind], { size: 18 }),
                        onSelect: () => onCreateNote(kind),
                      })),
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
                    ],
                    { edge: "trailing" },
                  )
                }
              >
                <MoreIcon size={18} />
              </IconButton>
            )}
          </div>
        </div>
        {groupOf(view.id) && <GroupSwitcher group={groupOf(view.id) as GroupId} active={view.id} />}
        <SearchField
          value={query}
          placeholder={t("notes.searchIn", { place: view.title.toLowerCase() })}
          onChange={(event) => setQuery(event.target.value)}
        />
        {!selecting && <ExamplesNotice />}
      </header>

      <div
        ref={scroller}
        onScroll={() => swiped && setSwiped(null)}
        className="flex grow flex-col overflow-y-auto px-4 pb-28 md:pb-8"
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
                ? "grid grid-cols-3 gap-x-3 gap-y-4 pb-5"
                : "flex flex-col pb-5"
            }
          >
            {group.label && (
              <h2 className="col-span-full px-1 pt-4 pb-3 text-title3 font-bold text-label">
                {group.label}
              </h2>
            )}
            <div
              className={
                options.layout === "gallery" ? "contents" : "overflow-hidden rounded-3xl bg-paper"
              }
            >
              <AnimatePresence initial={false}>
                {group.items.map(({ entry, snippet }) => (
                  <motion.div
                    key={entry.id}
                    className={
                      options.layout === "gallery"
                        ? undefined
                        : "[&:not(:last-child)]:after:ms-5 [&:not(:last-child)]:after:block [&:not(:last-child)]:after:h-px [&:not(:last-child)]:after:bg-separator/70"
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
        <button
          type="button"
          onClick={onCreate}
          className="rounded-full bg-accent px-4 py-2 text-subheadline font-semibold text-on-accent transition-transform active:scale-[0.97]"
        >
          {t("notes.writeSomething")}
        </button>
      )}
    </div>
  );
}
