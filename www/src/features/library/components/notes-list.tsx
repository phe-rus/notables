import {
  Chip,
  cn,
  IconButton,
  PenIcon,
  PinIcon,
  SearchField,
  SidebarIcon,
  spring,
} from "@notables/ui";
import { Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useDeferredValue, useMemo, useState } from "react";
import { bucket, formatUpdated } from "../lib/date-format";
import type { View } from "../model/library-views";
import { noteKindLabels } from "../model/note-kind-labels";
import { getLibrary, type LibraryEntry, useLibrary, useLibraryReady } from "../store/library-store";

export function NotesList({
  view,
  activeId,
  onOpenSidebar,
  className,
}: {
  view: View;
  activeId?: string;
  onOpenSidebar: () => void;
  className?: string;
}) {
  const entries = useLibrary();
  const ready = useLibraryReady();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const groups = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    const visible = entries.filter(
      (e) =>
        view.matches(e) &&
        (!q || e.title.toLowerCase().includes(q) || e.excerpt.toLowerCase().includes(q)),
    );
    const result: Array<{ label: string; items: LibraryEntry[] }> = [];
    for (const entry of visible) {
      const label = entry.pinned ? "Pinned" : bucket(entry.updatedAt);
      const group = result.at(-1);
      if (group?.label === label) group.items.push(entry);
      else result.push({ label, items: [entry] });
    }
    return result;
  }, [entries, view, deferredQuery]);

  const createNote = () => {
    const entry = getLibrary().create(view.kind);
    void navigate({ to: "/notes/$noteId", params: { noteId: entry.id }, search: (s) => s });
  };

  return (
    <section
      aria-label={view.title}
      className={cn(
        "flex w-full flex-col bg-surface md:w-[330px] md:shrink-0 md:border-r md:border-separator",
        className,
      )}
    >
      <header className="flex flex-col gap-3 px-4 pt-[max(16px,env(safe-area-inset-top))] pb-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <IconButton label="Show library" className="lg:hidden" onClick={onOpenSidebar}>
              <SidebarIcon size={20} />
            </IconButton>
            <h1 className="text-[22px] font-bold tracking-tight">{view.title}</h1>
          </div>
          <IconButton label="New note" tone="accent" onClick={createNote}>
            <PenIcon size={20} strokeWidth={1.9} />
          </IconButton>
        </div>
        <SearchField value={query} onChange={(event) => setQuery(event.target.value)} />
      </header>

      <div className="flex grow flex-col overflow-y-auto px-2.5 pb-8">
        {ready && groups.length === 0 && (
          <EmptyList searching={Boolean(deferredQuery)} onCreate={createNote} />
        )}
        {groups.map((group) => (
          <div key={group.label} className="flex flex-col">
            <h2 className="px-2.5 pt-3 pb-1 text-[12px] font-semibold text-label-tertiary">
              {group.label}
            </h2>
            <AnimatePresence initial={false}>
              {group.items.map((entry) => (
                <motion.div
                  key={entry.id}
                  layout="position"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={spring.smooth}
                >
                  <NoteRow entry={entry} active={entry.id === activeId} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </section>
  );
}

function NoteRow({ entry, active }: { entry: LibraryEntry; active: boolean }) {
  const kind = entry.kind === "note" ? null : noteKindLabels[entry.kind];
  return (
    <Link
      to="/notes/$noteId"
      params={{ noteId: entry.id }}
      search={(s) => s}
      className={cn(
        "group relative flex flex-col gap-[3px] rounded-[14px] px-3 py-3 no-underline transition-colors duration-fast",
        active ? "bg-accent-soft" : "hover:bg-fill/60",
      )}
    >
      <span className="flex items-center gap-1.5 text-[15px] font-semibold text-label">
        {entry.pinned && <PinIcon size={13} className="text-accent-text" />}
        <span className="truncate">{entry.title || "New Note"}</span>
      </span>
      <span className="truncate text-[13px] text-label-secondary">
        <b className="font-medium text-label">{formatUpdated(entry.updatedAt)}</b>
        {"  "}
        {entry.excerpt || "No additional text"}
      </span>
      {(kind || entry.publicationId) && (
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
