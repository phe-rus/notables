import {
  BookIcon,
  CalendarIcon,
  cn,
  confirmDialog,
  FolderIcon,
  GlobeIcon,
  IconButton,
  InvoiceIcon,
  LayoutIcon,
  LessonIcon,
  NoteIcon,
  PenIcon,
  PinIcon,
  PlusIcon,
  RecentIcon,
  SearchIcon,
  StoryIcon,
  TrashIcon,
  WalletIcon,
} from "@phe-rus/hino";
import { useNavigate } from "@tanstack/react-router";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { setDrawerOpen } from "../../../components/layout/drawer-store";
import { t } from "../../../i18n/i18n";
import { shortcutLabel } from "../../../lib/keyboard/shortcuts";
import { inBrowserSession } from "../../../platform/session/browser-session-store";
import { useTrashedBooks } from "../../books/store/book-store";
import { useSeries } from "../../books/store/series-store";
import { useUpcomingCount } from "../../calendar/store/use-upcoming-count";
import { noteMenu } from "../../notes/actions/note-menu";
import { openSearch } from "../../search/store/search-palette";
import { usePreferences } from "../../settings/store/preferences-store";
import { binNotes, binSeriesAndBooks } from "../../trash/lib/bin-groups";
import { formatAge } from "../lib/date-format";
import type { SidebarItemId } from "../model/sidebar-items";
import {
  type Folder,
  getLibrary,
  isListedNote,
  useFolders,
  useLibrary,
} from "../store/library-store";
import { RECENT_WINDOW, useOpened } from "../store/recents-store";
import { SidebarProfileRow } from "./sidebar-profile-row";
import { ActionRow, DisclosureRow, NavItem, SectionHeader } from "./sidebar-rows";
import { SidebarTopBar } from "./sidebar-top-bar";

export type SidebarLocation =
  | SidebarItemId
  | "all"
  | "calendar"
  | "connections"
  | "settings"
  | "wallet"
  | "trash"
  | `folder:${string}`;
export const sidebarIcons: Record<SidebarItemId, ReactNode> = {
  writing: <StoryIcon size={17} />,
  books: <BookIcon size={17} />,
  planning: <LessonIcon size={17} />,
  invoices: <InvoiceIcon size={17} />,
  published: <GlobeIcon size={17} />,
};
const artifactPlaces: readonly SidebarLocation[] = ["books", "calendar", "wallet", "invoices"];

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
  const navigate = useNavigate();
  const folders = useFolders();
  const library = useLibrary();
  const entries = library.filter(isListedNote);
  const upcoming = useUpcomingCount();
  const trashedBooks = useTrashedBooks();
  const series = useSeries();
  const bin = binSeriesAndBooks(trashedBooks, series);
  const binCount = binNotes(library, trashedBooks).length + bin.books.length + bin.series.length;
  const { counts } = usePreferences().sidebar;
  const inArtifacts = artifactPlaces.includes(active);
  const [artifactsShown, setArtifactsShown] = useState(inArtifacts);
  const folderName = useRef<HTMLInputElement>(null);
  const [renaming, setRenaming] = useState<{ id: string | null; name: string } | null>(null);
  useEffect(() => {
    if (inArtifacts) setArtifactsShown(true);
  }, [inArtifacts]);
  const renameId = renaming?.id;
  const adding = renaming !== null;
  useEffect(() => {
    if (adding) {
      folderName.current?.focus();
      folderName.current?.select();
    }
  }, [renameId, adding]);
  const opened = useOpened();
  const now = Date.now();
  const pinned = entries.filter((entry) => entry.pinned).slice(0, 8);
  const recents = entries
    .filter((entry) => !entry.pinned && now - (opened[entry.id] ?? 0) < RECENT_WINDOW)
    .sort((a, b) => (opened[b.id] ?? 0) - (opened[a.id] ?? 0))
    .slice(0, 5);
  const removeFolder = async (folder: Folder) => {
    if (
      !(await confirmDialog({
        title: t("workspace.deleteFolderTitle", { name: folder.name }),
        message: t("workspace.deleteFolderBody"),
        confirmLabel: t("common.delete"),
        destructive: true,
      }))
    )
      return;
    getLibrary().removeFolder(folder.id);
    if (active === `folder:${folder.id}`) void navigate({ to: "/", search: {} });
  };
  const saveFolder = () => {
    if (!renaming?.name.trim()) return;
    if (renaming.id) getLibrary().renameFolder(renaming.id, renaming.name);
    else {
      const folder = getLibrary().createFolder(renaming.name);
      void navigate({ to: "/", search: { view: `folder:${folder.id}` } });
    }
    setRenaming(null);
  };
  const folderInput = () => (
    <form
      className="flex min-w-0 items-center gap-1 px-2 py-1"
      onSubmit={(event) => {
        event.preventDefault();
        saveFolder();
      }}
    >
      <input
        ref={folderName}
        aria-label={t("workspace.folderName")}
        maxLength={120}
        value={renaming?.name ?? ""}
        onChange={(event) =>
          setRenaming((current) => current && { ...current, name: event.target.value })
        }
        onKeyDown={(event) => {
          if (event.key === "Escape") setRenaming(null);
        }}
        className="min-w-0 flex-1 rounded-lg control-field px-2 py-1.5 text-subheadline"
      />
      <button
        type="submit"
        disabled={!renaming?.name.trim()}
        className="px-1 text-footnote font-semibold text-accent-text"
      >
        {t("common.done")}
      </button>
      <button
        type="button"
        className="px-1 text-caption text-label-secondary"
        onClick={() => setRenaming(null)}
      >
        {t("common.cancel")}
      </button>
    </form>
  );
  return (
    <nav
      aria-label={t("nav.main")}
      style={style}
      className={cn("flex shrink-0 flex-col overflow-hidden px-2.5", className)}
    >
      <SidebarTopBar />
      <div className="flex flex-col gap-px pb-4">
        <ActionRow
          icon={<PenIcon size={17} />}
          shortcut={shortcutLabel("N")}
          onClick={() => {
            onNewNote();
            setDrawerOpen(false);
          }}
        >
          {t("nav.newNote")}
        </ActionRow>
        <ActionRow
          icon={<SearchIcon size={17} />}
          shortcut={shortcutLabel("K")}
          onClick={openSearch}
        >
          {t("common.search")}
        </ActionRow>
        <DisclosureRow
          icon={<LayoutIcon size={17} />}
          open={artifactsShown}
          onToggle={() => setArtifactsShown(!artifactsShown)}
          controls="sidebar-artifacts"
        >
          {t("nav.artifacts")}
        </DisclosureRow>
        {artifactsShown && (
          <div id="sidebar-artifacts" className="flex flex-col gap-px ps-4">
            <NavItem to="/books" active={active === "books"} icon={<BookIcon size={17} />}>
              {t("nav.books")}
            </NavItem>
            <NavItem
              to="/calendar"
              active={active === "calendar"}
              icon={<CalendarIcon size={17} />}
              trailing={counts && upcoming > 0 ? upcoming : undefined}
            >
              {t("nav.calendar")}
            </NavItem>
            {!inBrowserSession() && (
              <NavItem to="/wallet" active={active === "wallet"} icon={<WalletIcon size={17} />}>
                {t("wallet.title")}
              </NavItem>
            )}
            <NavItem to="/invoices" active={active === "invoices"} icon={<InvoiceIcon size={17} />}>
              {t("nav.invoices")}
            </NavItem>
          </div>
        )}
      </div>
      <div className="no-scrollbar -mx-2.5 flex grow flex-col gap-5 overflow-y-auto px-2.5 pb-4">
        <section className="flex flex-col gap-px">
          <SectionHeader
            title={t("nav.workspace")}
            action={
              <IconButton
                size="icon-sm"
                variant="ghost"
                label={t("workspace.newFolder")}
                onClick={() => setRenaming({ id: null, name: "" })}
              >
                <PlusIcon size={16} />
              </IconButton>
            }
          />
          {renaming?.id === null && folderInput()}
          {folders.map((folder) =>
            renaming?.id === folder.id ? (
              <div key={folder.id}>{folderInput()}</div>
            ) : (
              <NavItem
                key={folder.id}
                to="/"
                search={{ view: `folder:${folder.id}` }}
                active={active === `folder:${folder.id}`}
                icon={
                  folder.id === "default-writings" ? (
                    <StoryIcon size={17} />
                  ) : (
                    <FolderIcon size={17} />
                  )
                }
                trailing={
                  counts
                    ? entries.filter((entry) => entry.folderId === folder.id).length
                    : undefined
                }
                menu={() => [
                  {
                    label: t("workspace.renameFolder"),
                    onSelect: () => setRenaming({ id: folder.id, name: folder.name }),
                  },
                  {
                    label: t("common.delete"),
                    destructive: true,
                    onSelect: () => void removeFolder(folder),
                  },
                ]}
              >
                {folder.name}
              </NavItem>
            ),
          )}
          {folders.length === 0 && (
            <NavItem
              to="/"
              search={{ view: "all" }}
              active={active === "all"}
              icon={<NoteIcon size={17} />}
              trailing={counts ? entries.length : undefined}
            >
              {t("workspace.writings")}
            </NavItem>
          )}
          <NavItem
            to="/trash"
            active={active === "trash"}
            icon={<TrashIcon size={17} />}
            trailing={counts ? binCount : undefined}
          >
            {t("nav.recentlyDeleted")}
          </NavItem>
        </section>
        {pinned.length > 0 && (
          <section className="flex flex-col">
            <SectionHeader title={t("nav.pinned")} />
            {pinned.map((entry) => (
              <NavItem
                key={entry.id}
                to="/notes/$noteId"
                params={{ noteId: entry.id }}
                search={(s) => s}
                active={entry.id === activeNoteId}
                icon={<PinIcon size={15} />}
                menu={() => noteMenu(entry, navigate)}
              >
                {entry.title || t("notes.newNote")}
              </NavItem>
            ))}
          </section>
        )}
        {recents.length > 0 && (
          <section className="flex flex-col">
            <SectionHeader title={t("nav.recents")} />
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
          </section>
        )}
      </div>
      <SidebarProfileRow active={active === "settings"} />
    </nav>
  );
}
