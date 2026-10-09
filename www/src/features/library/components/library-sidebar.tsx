import { type LinkProps, useNavigate } from "@tanstack/react-router";
import {
  BookIcon,
  CalendarIcon,
  cn,
  GlobeIcon,
  InvoiceIcon,
  LayoutIcon,
  LessonIcon,
  NoteIcon,
  PenIcon,
  PeopleIcon,
  PinIcon,
  RecentIcon,
  SearchIcon,
  StoryIcon,
  spring,
  TrashIcon,
  WalletIcon,
} from "@ultrapeach/ui";
import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useEffect, useState } from "react";
import { t } from "../../../i18n/i18n";
import { shortcutLabel } from "../../../lib/keyboard/shortcuts";
import { useBooks, useTrashedBooks } from "../../books/store/book-store";
import { useSeries } from "../../books/store/series-store";
import { useUpcomingCount } from "../../calendar/store/use-upcoming-count";
import { usePeople } from "../../connections/lib/use-people";
import { useInvoices } from "../../invoices/store/invoice-store";
import { noteMenu } from "../../notes/actions/note-menu";
import { openSearch } from "../../search/store/search-palette";
import { updatePreferences, usePreferences } from "../../settings/store/preferences-store";
import { binNotes, binSeriesAndBooks } from "../../trash/lib/bin-groups";
import { formatAge } from "../lib/date-format";
import { planningKinds, readingKinds, writingKinds } from "../model/library-views";
import { type SidebarItemId, sidebarItemSections, sidebarItemTitles } from "../model/sidebar-items";
import { isListedNote, useLibrary } from "../store/library-store";
import { RECENT_WINDOW, useOpened } from "../store/recents-store";
import { SidebarEditor } from "./sidebar-editor";
import { SidebarProfileRow } from "./sidebar-profile-row";
import { ActionRow, DisclosureRow, NavItem, SectionHeader } from "./sidebar-rows";
import { SidebarTopBar } from "./sidebar-top-bar";

/** Where the app is: a view of notes, books or settings. */
export type SidebarLocation =
  | SidebarItemId
  | "all"
  | "calendar"
  | "connections"
  | "settings"
  | "wallet"
  | "trash";

export const sidebarIcons: Record<SidebarItemId, ReactNode> = {
  writing: <StoryIcon size={17} />,
  books: <BookIcon size={17} />,
  planning: <LessonIcon size={17} />,
  invoices: <InvoiceIcon size={17} />,
  published: <GlobeIcon size={17} />,
};

/** Places folded under Artifacts, so the sidebar stays short. */
const artifactPlaces: readonly SidebarLocation[] = ["calendar", "wallet", "invoices"];

const PINNED_LIMIT = 8;
const RECENTS_LIMIT = 8;

export function Sidebar({
  active,
  activeNoteId,
  onNewNote,
  className,
  style,
}: {
  active: SidebarLocation;
  activeNoteId?: string;
  onNewNote: () => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  const books = useBooks();
  const invoices = useInvoices();
  const upcoming = useUpcomingCount();
  const online = usePeople().filter((person) => person.online).length;
  const library = useLibrary();
  const entries = library.filter(isListedNote);
  const trashedBooks = useTrashedBooks();
  const allSeries = useSeries();
  const bin = binSeriesAndBooks(trashedBooks, allSeries);
  const binCount = binNotes(library, trashedBooks).length + bin.books.length + bin.series.length;
  const { order, hidden, counts, artifactsOpen } = usePreferences().sidebar;
  const [editing, setEditing] = useState(false);
  // Arriving at Calendar, Wallet or Invoices opens Artifacts, so the place shows.
  const inArtifacts = artifactPlaces.includes(active);
  const [artifactsShown, setArtifactsShown] = useState(artifactsOpen || inArtifacts);
  useEffect(() => {
    if (inArtifacts) setArtifactsShown(true);
  }, [inArtifacts]);
  const toggleArtifacts = () => {
    const open = !artifactsShown;
    setArtifactsShown(open);
    updatePreferences((p) => ({ ...p, sidebar: { ...p.sidebar, artifactsOpen: open } }));
  };
  const navigate = useNavigate();
  const pinned = entries.filter((entry) => entry.pinned).slice(0, PINNED_LIMIT);
  // Notes opened on this device in the last two days; pinned ones already show above.
  const opened = useOpened();
  const now = Date.now();
  const recents = entries
    .filter((entry) => !entry.pinned && now - (opened[entry.id] ?? 0) < RECENT_WINDOW)
    .sort((a, b) => (opened[b.id] ?? 0) - (opened[a.id] ?? 0))
    .slice(0, RECENTS_LIMIT);

  const count = (id: SidebarItemId | "all") => {
    if (id === "invoices") return invoices.length;
    if (id === "books") {
      return books.length + entries.filter((e) => readingKinds.includes(e.kind)).length;
    }
    if (id === "all") return entries.length;
    if (id === "published") return entries.filter((e) => e.publicationId).length;
    const kinds = id === "writing" ? writingKinds : planningKinds;
    return entries.filter((e) => kinds.includes(e.kind)).length;
  };
  const link = (id: SidebarItemId): LinkProps =>
    id === "books"
      ? { to: "/books" }
      : id === "invoices"
        ? { to: "/invoices" }
        : { to: "/", search: { view: id } };

  const visible = (id: SidebarItemId) => !hidden.includes(id);
  // Writing, Plan & learn and Published, in the order people chose.
  const notePlaces = order.filter((id) => visible(id) && sidebarItemSections[id] === "notes");
  const sidebarItem = (id: SidebarItemId) => (
    <NavItem
      key={id}
      {...link(id)}
      active={active === id}
      icon={sidebarIcons[id]}
      trailing={counts ? count(id) : undefined}
      menu={() => [
        {
          label: t("nav.hideFromSidebar"),
          onSelect: () =>
            updatePreferences((p) => ({
              ...p,
              sidebar: { ...p.sidebar, hidden: [...p.sidebar.hidden, id] },
            })),
        },
        { label: t("nav.editSidebar"), onSelect: () => setEditing(true) },
      ]}
    >
      {sidebarItemTitles[id]}
    </NavItem>
  );

  return (
    <nav
      aria-label={t("nav.main")}
      style={style}
      className={cn("flex shrink-0 flex-col overflow-hidden px-2.5", className)}
    >
      <SidebarTopBar />

      {/* Like a chat app's sidebar: actions, then the places, then recents. */}
      <div className="flex flex-col gap-px pb-4">
        <ActionRow icon={<PenIcon size={17} />} shortcut={shortcutLabel("N")} onClick={onNewNote}>
          {t("nav.newNote")}
        </ActionRow>
        <ActionRow
          icon={<SearchIcon size={17} />}
          shortcut={shortcutLabel("K")}
          onClick={openSearch}
        >
          {t("common.search")}
        </ActionRow>
        {visible("books") && sidebarItem("books")}
        <DisclosureRow
          icon={<LayoutIcon size={17} />}
          open={artifactsShown}
          onToggle={toggleArtifacts}
          controls="sidebar-artifacts"
        >
          {t("nav.artifacts")}
        </DisclosureRow>
        <AnimatePresence initial={false}>
          {artifactsShown && (
            <motion.div
              id="sidebar-artifacts"
              className="flex flex-col gap-px overflow-hidden ps-4"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={spring.snappy}
            >
              <NavItem
                to="/calendar"
                active={active === "calendar"}
                icon={<CalendarIcon size={17} />}
                trailing={counts && upcoming > 0 ? upcoming : undefined}
              >
                {t("nav.calendar")}
              </NavItem>
              <NavItem to="/wallet" active={active === "wallet"} icon={<WalletIcon size={17} />}>
                {t("wallet.title")}
              </NavItem>
              {visible("invoices") && sidebarItem("invoices")}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="no-scrollbar -mx-2.5 flex grow flex-col gap-5 overflow-y-auto px-2.5 pb-4">
        <AnimatePresence mode="popLayout" initial={false}>
          {editing ? (
            <motion.section
              key="editor"
              aria-label={t("nav.editSidebar")}
              className="flex flex-col"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={spring.snappy}
            >
              <SectionHeader
                title={t("nav.library")}
                action={
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="rounded-lg px-1.5 text-caption font-medium text-accent-text"
                  >
                    {t("common.done")}
                  </button>
                }
              />
              <SidebarEditor icons={sidebarIcons} />
              <p className="px-2.5 pt-2 text-caption leading-snug text-label-tertiary">
                {t("nav.sidebarHint")}
              </p>
            </motion.section>
          ) : (
            <motion.div
              key="items"
              className="flex flex-col gap-px"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={spring.snappy}
            >
              <SectionHeader title={t("nav.workspace")} />
              <NavItem
                to="/"
                active={active === "all"}
                icon={<NoteIcon size={17} />}
                trailing={counts ? count("all") : undefined}
              >
                {t("nav.allNotes")}
              </NavItem>
              {notePlaces.map((id) => sidebarItem(id))}
              <NavItem
                to="/connections"
                active={active === "connections"}
                icon={<PeopleIcon size={17} />}
                trailing={
                  online > 0 ? (
                    <span className="flex items-center gap-1 text-success">
                      <span className="size-1.5 rounded-full bg-success" />
                      {online}
                    </span>
                  ) : undefined
                }
              >
                {t("nav.connections")}
              </NavItem>
              {(binCount > 0 || active === "trash") && (
                <NavItem
                  to="/trash"
                  active={active === "trash"}
                  icon={<TrashIcon size={17} />}
                  trailing={counts ? binCount : undefined}
                >
                  {t("nav.recentlyDeleted")}
                </NavItem>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {pinned.length > 0 && (
          <section aria-label={t("nav.pinned")} className="flex flex-col">
            <SectionHeader title={t("nav.pinned")} />
            <div className="flex flex-col gap-px">
              {pinned.map((entry) => (
                <NavItem
                  key={entry.id}
                  to="/notes/$noteId"
                  params={{ noteId: entry.id }}
                  search={(s) => s}
                  active={entry.id === activeNoteId}
                  icon={<PinIcon size={15} />}
                  menu={() => noteMenu(entry, navigate)}
                  trailing={formatAge(entry.updatedAt)}
                >
                  {entry.title || t("notes.newNote")}
                </NavItem>
              ))}
            </div>
          </section>
        )}

        {recents.length > 0 && (
          <section aria-label={t("nav.recents")} className="flex flex-col">
            <SectionHeader title={t("nav.recents")} />
            <div className="flex flex-col gap-px">
              {recents.map((entry) => (
                <NavItem
                  key={entry.id}
                  to="/notes/$noteId"
                  params={{ noteId: entry.id }}
                  search={(s) => s}
                  active={entry.id === activeNoteId}
                  icon={<RecentIcon size={15} />}
                  menu={() => noteMenu(entry, navigate)}
                  trailing={formatAge(opened[entry.id] ?? entry.updatedAt)}
                >
                  {entry.title || t("notes.newNote")}
                </NavItem>
              ))}
            </div>
          </section>
        )}
      </div>

      <SidebarProfileRow active={active === "settings"} />
    </nav>
  );
}
