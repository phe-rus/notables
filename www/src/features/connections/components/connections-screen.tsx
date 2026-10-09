import { Link } from "@tanstack/react-router";
import {
  AddPersonIcon,
  Button,
  ChevronDownIcon,
  cn,
  confirmDialog,
  GlobeIcon,
  IconButton,
  MoreIcon,
  openMenu,
  PeopleIcon,
  SearchField,
  SidebarIcon,
  spring,
  toast,
} from "@ultrapeach/ui";
import { AnimatePresence, motion } from "motion/react";
import { useDeferredValue, useState } from "react";
import { CollapsedSidebarControls } from "../../../components/window/collapsed-sidebar-controls";
import { locale, t } from "../../../i18n/i18n";
import { type LibraryEntry, useLibrary } from "../../library/store/library-store";
import { usePreferences } from "../../settings/store/preferences-store";
import { handOver } from "../../sharing/lib/hand-over";
import { linkFor, removePerson } from "../../sharing/lib/share-actions";
import { usePeople } from "../lib/use-people";
import type { Person, SharedNote } from "../model/people";
import { useLastSeen } from "../store/last-seen-store";
import { InviteSheet } from "./invite-sheet";

/**
 * The people this device shares notes with: who is here right now, and
 * everyone else with when they were last seen and what you share. Laid
 * out by the pane's own width, one column on a phone up to three.
 */
export function ConnectionsScreen({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const people = usePeople();
  const { collapsed } = usePreferences().sidebar;
  const [query, setQuery] = useState("");
  const [inviting, setInviting] = useState(false);
  const needle = useDeferredValue(query.trim().toLocaleLowerCase());
  const shown = needle
    ? people.filter((person) => person.name.toLocaleLowerCase().includes(needle))
    : people;
  const online = people.filter((person) => person.online);

  return (
    <div className="@container/people flex min-h-0 grow flex-col">
      <header
        data-tauri-drag-region
        className="flex flex-col gap-3 px-4 pt-[max(12px,env(safe-area-inset-top))] pb-3 @min-[600px]/people:px-6"
      >
        {collapsed && <CollapsedSidebarControls />}
        <div data-tauri-drag-region className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1">
            <IconButton label={t("nav.showLibrary")} className="lg:hidden" onClick={onOpenSidebar}>
              <SidebarIcon size={20} />
            </IconButton>
            <h1 className="truncate text-title2 font-bold tracking-tight">
              {t("nav.connections")}
            </h1>
          </div>
          <IconButton
            label={t("connections.invite")}
            tone="accent"
            className="@min-[480px]/people:hidden"
            onClick={() => setInviting(true)}
          >
            <AddPersonIcon size={20} />
          </IconButton>
          <Button
            variant="primary"
            className="@max-[480px]/people:hidden"
            onClick={() => setInviting(true)}
          >
            <AddPersonIcon size={16} />
            {t("connections.invite")}
          </Button>
        </div>
        {people.length > 0 && (
          <SearchField
            value={query}
            placeholder={t("connections.search")}
            onChange={(event) => setQuery(event.target.value)}
          />
        )}
      </header>

      <div className="flex min-h-0 grow flex-col gap-7 overflow-y-auto px-4 pt-2 pb-28 @min-[600px]/people:px-6 md:pb-10">
        {people.length === 0 ? (
          <EmptyState onInvite={() => setInviting(true)} />
        ) : (
          <>
            {online.length > 0 && !needle && (
              <section aria-label={t("connections.hereNow")} className="flex flex-col gap-3">
                <SectionTitle>{t("connections.hereNow")}</SectionTitle>
                <ul className="flex flex-wrap gap-4">
                  {online.map((person) => (
                    <li key={person.key} className="flex w-16 flex-col items-center gap-1.5">
                      <Avatar person={person} size="large" />
                      <span className="w-full truncate text-center text-caption font-medium">
                        {person.name}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <section aria-label={t("connections.everyone")} className="flex flex-col gap-3">
              <SectionTitle>{t("connections.everyone")}</SectionTitle>
              {shown.length === 0 ? (
                <p className="text-subheadline text-label-secondary">{t("common.noMatches")}</p>
              ) : (
                <ul className="grid items-start gap-3 @min-[720px]/people:grid-cols-2 @min-[1120px]/people:grid-cols-3">
                  {shown.map((person) => (
                    <PersonCard key={person.key} person={person} />
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
        <DiscoverCard />
      </div>

      <InviteSheet open={inviting} onClose={() => setInviting(false)} />
    </div>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <h2 className="text-footnote font-semibold tracking-[0.04em] text-label-tertiary uppercase">
      {children}
    </h2>
  );
}

/** A colour of its own for each name, steady across launches. */
function hueOf(key: string): number {
  let hash = 0;
  for (const char of key) hash = (hash * 31 + (char.codePointAt(0) ?? 0)) % 360;
  return hash;
}

function Avatar({ person, size = "small" }: { person: Person; size?: "small" | "large" }) {
  const hue = hueOf(person.key);
  return (
    <span className="relative inline-flex shrink-0">
      <span
        aria-hidden="true"
        style={{
          background: `oklch(0.88 0.06 ${hue})`,
          color: `oklch(0.38 0.09 ${hue})`,
        }}
        className={cn(
          "flex items-center justify-center rounded-full font-semibold",
          size === "large" ? "size-14 text-title2" : "size-11 text-body",
        )}
      >
        {[...person.name][0]?.toLocaleUpperCase()}
      </span>
      {person.online && (
        <span
          className={cn(
            "absolute end-0 bottom-0 rounded-full bg-success ring-[2.5px] ring-background",
            size === "large" ? "size-4" : "size-3",
          )}
        />
      )}
    </span>
  );
}

const relative = () => new Intl.RelativeTimeFormat(locale(), { numeric: "auto" });

/** "3 hours ago", "yesterday", "2 weeks ago". */
function ago(at: number, now = Date.now()): string {
  const minutes = Math.round((at - now) / 60_000);
  if (Math.abs(minutes) < 60) return relative().format(Math.min(-1, minutes), "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return relative().format(hours, "hour");
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 14) return relative().format(days, "day");
  return relative().format(Math.round(days / 7), "week");
}

function PersonCard({ person }: { person: Person }) {
  const [open, setOpen] = useState(false);
  const seen = useLastSeen()[person.key];
  const library = useLibrary();
  const byId = new Map(library.map((entry) => [entry.id, entry]));
  const live = person.liveOn.map((id) => byId.get(id)?.title).find(Boolean);
  const status = person.online
    ? live
      ? t("connections.liveOn", { title: live })
      : t("connections.online")
    : person.notes.every((note) => !note.joined)
      ? t("connections.notJoined")
      : seen
        ? t("connections.seen", { when: ago(seen) })
        : t("connections.notSeen");

  return (
    <li className="flex flex-col overflow-hidden rounded-4xl bg-elevated shadow-[inset_0_0_0_1px_var(--color-separator)]">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-3 p-3 text-start transition-colors hover:bg-fill/40"
      >
        <Avatar person={person} />
        <span className="flex min-w-0 grow flex-col">
          <span className="truncate text-callout font-semibold">{person.name}</span>
          <span
            className={cn(
              "truncate text-footnote",
              person.online ? "text-success" : "text-label-secondary",
            )}
          >
            {status}
          </span>
          <span className="truncate text-caption text-label-tertiary">
            {t("connections.notes", { count: person.notes.length })}
          </span>
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={spring.snappy}
          className="flex text-label-tertiary"
        >
          <ChevronDownIcon size={18} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={spring.smooth}
            className="flex flex-col overflow-hidden border-t border-separator/60 p-1.5"
          >
            {person.notes.map((note) => (
              <SharedNoteRow
                key={note.noteId}
                person={person}
                note={note}
                entry={byId.get(note.noteId)}
              />
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </li>
  );
}

function SharedNoteRow({
  person,
  note,
  entry,
}: {
  person: Person;
  note: SharedNote;
  entry: LibraryEntry | undefined;
}) {
  const title = entry?.title || t("common.untitled");
  const here = person.liveOn.includes(note.noteId);
  const actions = () => {
    const link = entry && note.inviteId ? linkFor(entry, note.inviteId) : null;
    return [
      ...(link
        ? [
            {
              label: t("connections.copyLink"),
              onSelect: () => void handOver(link, title),
            },
          ]
        : []),
      ...(note.relation === "invited" && note.inviteId
        ? [
            {
              label: t("connections.stopSharing"),
              destructive: true,
              onSelect: async () => {
                const confirmed = await confirmDialog({
                  title: t("connections.stopSharingTitle", { title, name: person.name }),
                  message: t("connections.stopSharingBody"),
                  confirmLabel: t("connections.stopSharing"),
                  destructive: true,
                });
                if (confirmed && note.inviteId) {
                  removePerson(note.noteId, note.inviteId);
                  toast(t("connections.stopSharing"));
                }
              },
            },
          ]
        : []),
    ];
  };
  const hasActions = note.relation === "invited" && note.inviteId !== null;
  return (
    <li className="flex items-center gap-1 rounded-xl pe-1 hover:bg-fill/40">
      <Link
        to="/notes/$noteId"
        params={{ noteId: note.noteId }}
        className="flex min-w-0 grow items-center gap-2.5 px-2.5 py-2 no-underline"
      >
        <span
          className={cn("size-2 shrink-0 rounded-full", here ? "bg-success" : "bg-separator")}
        />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-subheadline font-medium text-label">{title}</span>
          <span className="truncate text-caption text-label-tertiary">
            {t(`connections.relation.${note.relation}`)}
          </span>
        </span>
      </Link>
      {hasActions && (
        <IconButton
          label={t("notes.more")}
          onClick={(event) => {
            openMenu(event.currentTarget, actions(), { edge: "trailing" });
          }}
        >
          <MoreIcon size={18} />
        </IconButton>
      )}
    </li>
  );
}

function EmptyState({ onInvite }: { onInvite: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-accent-soft text-accent-text">
        <PeopleIcon size={30} />
      </span>
      <p className="font-serif text-title2 font-semibold tracking-tight">
        {t("connections.emptyTitle")}
      </p>
      <p className="max-w-[380px] text-subheadline leading-snug text-label-secondary">
        {t("connections.emptyBody")}
      </p>
      <Button variant="primary" className="mt-2" onClick={onInvite}>
        <AddPersonIcon size={16} />
        {t("connections.invite")}
      </Button>
    </div>
  );
}

/** Meeting people beyond the ones you share with waits for accounts; said plainly. */
function DiscoverCard() {
  return (
    <aside className="flex max-w-[640px] items-start gap-3 rounded-4xl border border-dashed border-separator px-4 py-3.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-fill text-label-secondary">
        <GlobeIcon size={18} />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-subheadline font-semibold">{t("connections.discoverTitle")}</span>
          <span className="rounded-full bg-fill px-2 py-0.5 text-caption2 font-semibold text-label-secondary">
            {t("connections.comingLater")}
          </span>
        </span>
        <span className="text-footnote leading-snug text-label-secondary">
          {t("connections.discoverBody")}
        </span>
      </span>
    </aside>
  );
}
