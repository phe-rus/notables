import {
  BookIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  type ContextMenuItem,
  cn,
  GlobeIcon,
  InvoiceIcon,
  LessonIcon,
  NoteIcon,
  PenIcon,
  PinIcon,
  SearchIcon,
  SettingsIcon,
  SidebarIcon,
  StoryIcon,
  spring,
  TrashIcon,
  useContextMenu,
} from "@notables/ui";
import { Link, type LinkProps, useNavigate, useRouter } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useState } from "react";
import { AppMark } from "../../../components/brand/app-mark";
import { ToolbarButton } from "../../../components/layout/toolbar-button";
import { WindowControls } from "../../../components/window/window-controls";
import { shortcutLabel } from "../../../lib/keyboard/shortcuts";
import { useAuthorName } from "../../../platform/author-preferences";
import { windowChrome } from "../../../platform/window-chrome";
import { useBooks, useTrashedBooks } from "../../books/store/book-store";
import { useUpcomingCount } from "../../calendar/store/use-upcoming-count";
import { useInvoices } from "../../invoices/store/invoice-store";
import { noteMenu } from "../../notes/actions/note-menu";
import { openSearch } from "../../search/store/search-palette";
import {
  toggleSidebarCollapsed,
  updatePreferences,
  usePreferences,
} from "../../settings/store/preferences-store";
import { binNotes } from "../../trash/lib/recycle-bin";
import { formatAge } from "../lib/date-format";
import { planningKinds, readingKinds, writingKinds } from "../model/library-views";
import { type SidebarItemId, sidebarItemTitles } from "../model/sidebar-items";
import { isListedNote, useLibrary } from "../store/library-store";
import { SidebarEditor } from "./sidebar-editor";

/** Where the app is: a view of notes, books or settings. */
export type SidebarLocation = SidebarItemId | "all" | "settings" | "trash";

export const sidebarIcons: Record<SidebarItemId, ReactNode> = {
  writing: <StoryIcon size={17} />,
  books: <BookIcon size={17} />,
  planning: <LessonIcon size={17} />,
  calendar: <CalendarIcon size={17} />,
  invoices: <InvoiceIcon size={17} />,
  published: <GlobeIcon size={17} />,
};

const PINNED_LIMIT = 8;

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
  const library = useLibrary();
  const entries = library.filter(isListedNote);
  const trashedBooks = useTrashedBooks();
  const binCount = binNotes(library, trashedBooks).length + trashedBooks.length;
  const { order, hidden, counts } = usePreferences().sidebar;
  const [editing, setEditing] = useState(false);
  const navigate = useNavigate();
  const pinned = entries.filter((entry) => entry.pinned).slice(0, PINNED_LIMIT);

  const count = (id: SidebarItemId | "all") => {
    if (id === "invoices") return invoices.length;
    if (id === "calendar") return upcoming;
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
        : id === "calendar"
          ? { to: "/calendar" }
          : { to: "/", search: { view: id } };

  return (
    <nav
      aria-label="Library"
      style={style}
      className={cn("flex shrink-0 flex-col overflow-hidden px-2.5", className)}
    >
      <SidebarTopBar />

      <div className="flex flex-col gap-px pb-4">
        <ActionRow icon={<PenIcon size={17} />} shortcut={shortcutLabel("N")} onClick={onNewNote}>
          New note
        </ActionRow>
        <ActionRow
          icon={<SearchIcon size={17} />}
          shortcut={shortcutLabel("K")}
          onClick={openSearch}
        >
          Search
        </ActionRow>
      </div>

      <div className="no-scrollbar -mx-2.5 flex grow flex-col gap-5 overflow-y-auto px-2.5 pb-4">
        <div className="flex flex-col gap-px">
          <NavItem
            to="/"
            active={active === "all"}
            icon={<NoteIcon size={17} />}
            trailing={counts ? count("all") : undefined}
          >
            All Notes
          </NavItem>
        </div>

        <section aria-label="Library" className="flex flex-col">
          <SectionHeader
            title="Library"
            action={
              <button
                type="button"
                onClick={() => setEditing((value) => !value)}
                className={cn(
                  "rounded-md px-1.5 text-[12px] font-medium transition-colors",
                  editing ? "text-accent-text" : "text-label-tertiary hover:text-label",
                )}
              >
                {editing ? "Done" : "Edit"}
              </button>
            }
          />
          <AnimatePresence mode="popLayout" initial={false}>
            {editing ? (
              <motion.div
                key="editor"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={spring.snappy}
              >
                <SidebarEditor icons={sidebarIcons} />
                <p className="px-2.5 pt-2 text-[12px] leading-snug text-label-tertiary">
                  Drag to reorder, or hide what you don’t use. All Notes, Search and Settings always
                  stay.
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="items"
                className="flex flex-col gap-px"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={spring.snappy}
              >
                {order
                  .filter((id) => !hidden.includes(id))
                  .map((id) => (
                    <NavItem
                      key={id}
                      {...link(id)}
                      active={active === id}
                      icon={sidebarIcons[id]}
                      trailing={counts ? count(id) : undefined}
                      menu={() => [
                        {
                          label: "Hide from sidebar",
                          onSelect: () =>
                            updatePreferences((p) => ({
                              ...p,
                              sidebar: { ...p.sidebar, hidden: [...p.sidebar.hidden, id] },
                            })),
                        },
                        { label: "Edit sidebar…", onSelect: () => setEditing(true) },
                      ]}
                    >
                      {sidebarItemTitles[id]}
                    </NavItem>
                  ))}
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {(binCount > 0 || active === "trash") && (
          <div className="-mt-3 flex flex-col gap-px">
            <NavItem
              to="/trash"
              active={active === "trash"}
              icon={<TrashIcon size={17} />}
              trailing={counts ? binCount : undefined}
            >
              Recently Deleted
            </NavItem>
          </div>
        )}

        {pinned.length > 0 && (
          <section aria-label="Pinned" className="flex flex-col">
            <SectionHeader title="Pinned" />
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
                  {entry.title || "New Note"}
                </NavItem>
              ))}
            </div>
          </section>
        )}
      </div>

      <ProfileRow active={active === "settings"} />
    </nav>
  );
}

/** Window controls, then sidebar, back and forward buttons. */
function SidebarTopBar() {
  const chrome = windowChrome();
  const router = useRouter();
  return (
    <div data-tauri-drag-region className="flex h-[52px] shrink-0 items-center gap-1 pl-2">
      {chrome === "custom" && <WindowControls className="mr-3" />}
      {/* macOS draws its own traffic lights here. */}
      {chrome === "native-mac" && <div className="w-[64px] shrink-0" />}
      {chrome === "none" && (
        <span className="mr-auto flex items-center gap-2">
          <AppMark size={24} />
          <span className="text-[15px] font-semibold tracking-tight">Notables</span>
        </span>
      )}
      <div
        data-tauri-drag-region
        className={cn("flex items-center gap-0.5", chrome !== "none" && "grow")}
      >
        <ToolbarButton
          label="Hide sidebar"
          onClick={toggleSidebarCollapsed}
          className="max-lg:hidden"
        >
          <SidebarIcon size={17} />
        </ToolbarButton>
        <ToolbarButton label="Back" onClick={() => router.history.back()}>
          <ChevronLeftIcon size={17} />
        </ToolbarButton>
        <ToolbarButton label="Forward" onClick={() => router.history.forward()}>
          <ChevronRightIcon size={17} />
        </ToolbarButton>
      </div>
    </div>
  );
}

function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex h-7 items-center justify-between pr-1 pl-2.5">
      <span className="text-[12px] font-medium text-label-tertiary">{title}</span>
      {action}
    </div>
  );
}

const rowClass =
  "group relative isolate flex items-center gap-2.5 rounded-[9px] px-2.5 py-[6px] text-[14px] text-label no-underline transition-colors duration-fast";

function ActionRow({
  icon,
  shortcut,
  onClick,
  children,
}: {
  icon: ReactNode;
  shortcut: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} className={cn(rowClass, "text-left hover:bg-fill/70")}>
      <span className="flex text-label-secondary">{icon}</span>
      <span className="grow">{children}</span>
      <kbd className="font-sans text-[12px] text-label-tertiary opacity-0 transition-opacity group-hover:opacity-100">
        {shortcut}
      </kbd>
    </button>
  );
}

const NO_MENU = () => [];

function NavItem({
  active,
  icon,
  trailing,
  menu,
  children,
  ...link
}: LinkProps & {
  active: boolean;
  icon: ReactNode;
  trailing?: ReactNode;
  /** Actions for right-click and long-press. */
  menu?: () => ContextMenuItem[];
  children: ReactNode;
}) {
  const handlers = useContextMenu(menu ?? NO_MENU);
  return (
    <Link
      {...link}
      {...(menu ? handlers : {})}
      className={cn(
        rowClass,
        "touch-manipulation [-webkit-touch-callout:none]",
        active ? "font-medium" : "hover:bg-fill/70",
      )}
    >
      {active && (
        <motion.span
          layoutId="sidebar-selection"
          className="absolute inset-0 -z-10 rounded-[9px] bg-accent-soft"
          transition={spring.snappy}
        />
      )}
      <span
        className={cn(
          "flex transition-colors",
          active ? "text-accent-text" : "text-label-secondary",
        )}
      >
        {icon}
      </span>
      <span className="grow truncate">{children}</span>
      {trailing !== undefined && (
        <span
          className={cn(
            "shrink-0 text-[12px] tabular-nums",
            active ? "text-accent-text" : "text-label-tertiary",
          )}
        >
          {trailing}
        </span>
      )}
    </Link>
  );
}

function ProfileRow({ active }: { active: boolean }) {
  const name = useAuthorName();
  return (
    <div className="flex shrink-0 items-center gap-2.5 border-t border-separator/60 px-1.5 py-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[14px] font-semibold text-accent-text">
        {(name || "N").slice(0, 1).toUpperCase()}
      </span>
      <span className="flex min-w-0 grow flex-col">
        <span className="truncate text-[14px] font-medium">{name || "On this device"}</span>
        <span className="truncate text-[12px] text-label-tertiary">No account needed</span>
      </span>
      <Link
        to="/settings"
        aria-label="Settings"
        data-tooltip="Settings"
        className={cn(
          "flex size-8 items-center justify-center rounded-lg transition-colors duration-fast",
          active
            ? "bg-accent-soft text-accent-text"
            : "text-label-tertiary hover:bg-fill/80 hover:text-label",
        )}
      >
        <SettingsIcon size={18} />
      </Link>
    </div>
  );
}
