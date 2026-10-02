import {
  Chip,
  cn,
  IconButton,
  PenIcon,
  PinIcon,
  SearchField,
  SidebarIcon,
  spring,
  useContextMenu,
} from "@notables/ui";
import { Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useDeferredValue, useMemo, useState } from "react";
import { CollapsedSidebarControls } from "../../../components/window/collapsed-sidebar-controls";
import { noteMenu } from "../../notes/actions/note-menu";
import { search } from "../../search/lib/rank";
import { useSearchableNotes } from "../../search/lib/use-searchable-notes";
import type { ListPreferences } from "../../settings/model/preferences";
import { usePreferences } from "../../settings/store/preferences-store";
import { bucket, formatUpdated } from "../lib/date-format";
import { type GroupId, groupOf, type View } from "../model/library-views";
import { noteKindLabels } from "../model/note-kind-labels";
import { isOwnNote, type LibraryEntry, useLibraryReady } from "../store/library-store";
import { GroupSwitcher } from "./group-switcher";

interface Group {
  label: string | null;
  items: Array<{ entry: LibraryEntry; snippet?: string }>;
}

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
  onCreateNote: () => void;
  className?: string;
}) {
  const ready = useLibraryReady();
  const preferences = usePreferences();
  const options = preferences.list;
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim());
  const notes = useSearchableNotes(Boolean(deferredQuery));

  const groups = useMemo<Group[]>(() => {
    const inView = notes.filter((note) => isOwnNote(note.entry) && view.matches(note.entry));
    // Searching shows the best matches first, with the passage that matched.
    if (deferredQuery) {
      const hits = search(inView, deferredQuery);
      return hits.length
        ? [
            {
              label: `${hits.length} ${hits.length === 1 ? "result" : "results"}`,
              items: hits.map((hit) => ({ entry: hit.item.entry, snippet: hit.snippet?.text })),
            },
          ]
        : [];
    }
    const sorted = inView
      .map((note) => note.entry)
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || sorters[options.sort](a, b));
    const result: Group[] = [];
    for (const entry of sorted) {
      const label = entry.pinned
        ? "Pinned"
        : options.groupByDate && options.sort !== "title"
          ? bucket(options.sort === "created" ? entry.createdAt : entry.updatedAt)
          : null;
      const group = result.at(-1);
      if (group && group.label === label) group.items.push({ entry });
      else result.push({ label, items: [{ entry }] });
    }
    return result;
  }, [notes, view, deferredQuery, options.sort, options.groupByDate]);

  return (
    <section
      aria-label={view.title}
      className={cn(
        "flex w-full flex-col bg-surface md:w-[330px] md:shrink-0 md:border-r md:border-separator/70",
        className,
      )}
    >
      <header
        data-tauri-drag-region
        className="flex flex-col gap-3 px-4 pt-[max(12px,env(safe-area-inset-top))] pb-2.5"
      >
        {preferences.sidebar.collapsed && <CollapsedSidebarControls />}
        <div data-tauri-drag-region className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <IconButton label="Show library" className="lg:hidden" onClick={onOpenSidebar}>
              <SidebarIcon size={20} />
            </IconButton>
            <h1 className="text-[22px] font-bold tracking-tight">{view.title}</h1>
          </div>
          <IconButton label="New note" tone="accent" onClick={onCreateNote}>
            <PenIcon size={20} strokeWidth={1.9} />
          </IconButton>
        </div>
        {groupOf(view.id) && <GroupSwitcher group={groupOf(view.id) as GroupId} active={view.id} />}
        <SearchField
          value={query}
          placeholder={`Search ${view.title.toLowerCase()}`}
          onChange={(event) => setQuery(event.target.value)}
        />
      </header>

      <div className="flex grow flex-col overflow-y-auto px-2.5 pb-28 md:pb-8">
        {ready && groups.length === 0 && (
          <EmptyList searching={Boolean(deferredQuery)} onCreate={onCreateNote} />
        )}
        {groups.map((group, index) => (
          <div key={group.label ?? `group-${index}`} className="flex flex-col">
            {group.label && (
              <h2 className="px-2.5 pt-3 pb-1 text-[12px] font-medium text-label-tertiary">
                {group.label}
              </h2>
            )}
            <AnimatePresence initial={false}>
              {group.items.map(({ entry, snippet }) => (
                <motion.div
                  key={entry.id}
                  layout="position"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={spring.smooth}
                >
                  <NoteRow
                    entry={entry}
                    snippet={snippet}
                    active={entry.id === activeId}
                    options={options}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </section>
  );
}

function NoteRow({
  entry,
  snippet,
  active,
  options,
}: {
  entry: LibraryEntry;
  snippet?: string;
  active: boolean;
  options: ListPreferences;
}) {
  const navigate = useNavigate();
  const menu = useContextMenu(() => noteMenu(entry, navigate));
  const kind = entry.kind === "note" || !options.kindTags ? null : noteKindLabels[entry.kind];
  const compact = options.density === "compact";
  return (
    <Link
      to="/notes/$noteId"
      params={{ noteId: entry.id }}
      search={(s) => s}
      {...menu}
      className={cn(
        "group relative isolate flex touch-manipulation flex-col rounded-[12px] px-3 no-underline transition-colors duration-fast [-webkit-touch-callout:none]",
        compact ? "gap-px py-2" : "gap-[3px] py-3",
        !active && "hover:bg-fill/60",
      )}
    >
      {active && (
        <motion.span
          layoutId="note-selection"
          className="absolute inset-0 -z-10 rounded-[12px] bg-accent-soft"
          transition={spring.snappy}
        />
      )}
      <span
        className={cn(
          "flex items-center gap-1.5 font-semibold text-label",
          compact ? "text-[14px]" : "text-[15px]",
        )}
      >
        {entry.pinned && <PinIcon size={13} className="text-accent-text" />}
        <span className="truncate">{entry.title || "New Note"}</span>
        {compact && (
          <span className="ml-auto shrink-0 text-[12px] font-normal text-label-tertiary">
            {formatUpdated(entry.updatedAt)}
          </span>
        )}
      </span>
      {(options.preview || snippet) && (
        <span className="truncate text-[13px] text-label-secondary">
          {!compact && <b className="font-medium text-label">{formatUpdated(entry.updatedAt)}</b>}
          {!compact && "  "}
          {snippet ?? (entry.excerpt || "No additional text")}
        </span>
      )}
      {!compact && (kind || entry.publicationId) && (
        <span className="mt-[3px] flex gap-1.5">
          {entry.publicationId && <Chip tone="public">Public</Chip>}
          {kind && <Chip tone={active ? "accent" : "neutral"}>{kind}</Chip>}
        </span>
      )}
    </Link>
  );
}

function EmptyList({ searching, onCreate }: { searching: boolean; onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 pt-16 text-center">
      <p className="text-[15px] text-label-secondary">
        {searching ? "No notes match your search." : "Nothing here yet."}
      </p>
      {!searching && (
        <button
          type="button"
          onClick={onCreate}
          className="rounded-full bg-accent px-4 py-2 text-[14px] font-semibold text-on-accent transition-transform active:scale-[0.97]"
        >
          Write something
        </button>
      )}
    </div>
  );
}
