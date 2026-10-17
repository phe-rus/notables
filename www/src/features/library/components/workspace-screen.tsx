import {
  BookIcon,
  CalendarIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  confirmDialog,
  FolderIcon,
  IconButton,
  InvoiceIcon,
  MoreIcon,
  openMenu,
  PenIcon,
  PlusIcon,
  SidebarIcon,
  TrashIcon,
} from "@phe-rus/hino";
import { Button } from "@phe-rus/hino/button";
import { Sheet } from "@phe-rus/hino/sheet";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { setDrawerOpen } from "../../../components/layout/drawer-store";
import { t } from "../../../i18n/i18n";
import { folderView } from "../model/library-views";
import {
  type Folder,
  getLibrary,
  isListedNote,
  useFolders,
  useLibrary,
} from "../store/library-store";

/** The workspace contains folders; each folder owns its note list. */
export function WorkspaceScreen() {
  const folders = useFolders();
  const notes = useLibrary().filter(isListedNote);
  const [editing, setEditing] = useState<{ id: string | null; name: string } | null>(null);
  const remove = async (folder: Folder) => {
    if (
      await confirmDialog({
        title: t("workspace.deleteFolderTitle", { name: folder.name }),
        message: t("workspace.deleteFolderBody"),
        confirmLabel: t("common.delete"),
        destructive: true,
      })
    )
      getLibrary().removeFolder(folder.id);
  };
  const menu = (folder: Folder, index: number) => [
    {
      label: t("workspace.renameFolder"),
      icon: <PenIcon size={18} />,
      onSelect: () => setEditing({ id: folder.id, name: folder.name }),
    },
    ...(index > 0
      ? [
          {
            label: t("editor.moveUp"),
            icon: <ChevronUpIcon size={18} />,
            onSelect: () => getLibrary().moveFolder(folder.id, -1),
          },
        ]
      : []),
    ...(index < folders.length - 1
      ? [
          {
            label: t("editor.moveDown"),
            icon: <ChevronDownIcon size={18} />,
            onSelect: () => getLibrary().moveFolder(folder.id, 1),
          },
        ]
      : []),
    {
      label: t("common.delete"),
      icon: <TrashIcon size={18} />,
      destructive: true,
      onSelect: () => void remove(folder),
    },
  ];
  return (
    <section className="flex min-h-0 grow flex-col bg-background">
      <header
        data-tauri-drag-region
        className="flex items-center gap-3 px-5 pt-[max(16px,env(safe-area-inset-top))] pb-5"
      >
        <IconButton
          variant="ghost"
          label={t("nav.showLibrary")}
          className="lg:hidden"
          onClick={() => setDrawerOpen(true)}
        >
          <SidebarIcon size={22} />
        </IconButton>
        <h1 className="min-w-0 grow truncate text-large-title font-bold tracking-tight">
          {t("nav.workspace")}
        </h1>
        <IconButton
          variant="ghost"
          label={t("workspace.newFolder")}
          onClick={() => setEditing({ id: null, name: "" })}
        >
          <PlusIcon size={23} />
        </IconButton>
      </header>
      <div className="grow overflow-y-auto px-5 pb-32">
        <div className="mx-auto flex max-w-[800px] flex-col gap-5">
          <div className="overflow-hidden rounded-3xl border border-separator/50 bg-paper">
            {folders.map((folder, index) => {
              const fallback =
                folder.id ===
                (folders.find((item) => item.id === "default-writings") ?? folders[0])?.id;
              const entries = notes.filter(folderView(folder, fallback, folders).matches);
              return (
                <div
                  key={folder.id}
                  className="flex items-center border-b border-separator/50 last:border-b-0"
                >
                  <Link
                    to="/"
                    search={{ view: `folder:${folder.id}` }}
                    className="flex min-h-12 min-w-0 grow items-center gap-2.5 px-3.5 py-1 text-label no-underline active:bg-fill"
                  >
                    <FolderIcon size={20} className="shrink-0 text-accent-text" />
                    <span className="flex min-w-0 grow flex-col gap-0.5">
                      <span className="truncate text-subheadline leading-tight font-semibold">
                        {folder.name}
                      </span>
                      <span className="truncate text-caption leading-tight text-label-secondary">
                        {entries[0]?.title || t("workspace.emptyFolder")}
                      </span>
                    </span>
                    <span className="text-caption tabular-nums text-label-secondary">
                      {entries.length}
                    </span>
                  </Link>
                  <IconButton
                    size="icon-sm"
                    variant="ghost"
                    label={t("workspace.folderOptions", { name: folder.name })}
                    className="me-2 shrink-0"
                    onClick={(event) =>
                      openMenu(event.currentTarget, menu(folder, index), { edge: "trailing" })
                    }
                  >
                    <MoreIcon size={20} />
                  </IconButton>
                </div>
              );
            })}
            {folders.length === 0 && (
              <Button
                variant="ghost"
                className="m-4"
                onClick={() => setEditing({ id: null, name: "" })}
              >
                <PlusIcon size={19} />
                {t("workspace.newFolder")}
              </Button>
            )}
          </div>
          <section className="flex flex-col gap-2">
            <h2 className="px-1 text-footnote font-semibold text-label-secondary">
              {t("nav.artifacts")}
            </h2>
            <div className="overflow-hidden rounded-3xl border border-separator/50 bg-paper">
              {(
                [
                  { to: "/books", label: t("nav.books"), Icon: BookIcon },
                  { to: "/calendar", label: t("nav.calendar"), Icon: CalendarIcon },
                  { to: "/invoices", label: t("nav.invoices"), Icon: InvoiceIcon },
                ] as const
              ).map(({ to, label, Icon }) => (
                <Link
                  key={to}
                  to={to}
                  search={{}}
                  className="flex min-h-11 items-center gap-2.5 border-b border-separator/50 px-3.5 text-subheadline text-label no-underline last:border-b-0 active:bg-fill"
                >
                  <Icon size={18} className="text-accent-text" />
                  <span className="grow">{label}</span>
                </Link>
              ))}
            </div>
            <Link
              to="/trash"
              className="mt-2 flex min-h-11 items-center gap-2.5 rounded-2xl border border-danger/15 bg-danger/8 px-3.5 text-subheadline font-medium text-danger no-underline hover:bg-danger/12"
            >
              <TrashIcon size={18} className="text-danger" />
              <span className="grow">{t("nav.recentlyDeleted")}</span>
            </Link>
          </section>
        </div>
      </div>
      <Sheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        label={editing?.id ? t("workspace.renameFolder") : t("workspace.newFolder")}
        className="max-w-[420px]"
      >
        {editing && (
          <form
            className="flex flex-col gap-4 p-6"
            onSubmit={(event) => {
              event.preventDefault();
              if (!editing.name.trim()) return;
              if (editing.id) getLibrary().renameFolder(editing.id, editing.name);
              else getLibrary().createFolder(editing.name);
              setEditing(null);
            }}
          >
            <h2 className="text-title3 font-semibold">
              {editing.id ? t("workspace.renameFolder") : t("workspace.newFolder")}
            </h2>
            <input
              aria-label={t("workspace.folderName")}
              maxLength={120}
              value={editing.name}
              onChange={(event) => setEditing({ ...editing, name: event.target.value })}
              className="rounded-xl control-field px-3 py-3 text-body"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditing(null)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={!editing.name.trim()}>
                {t("common.save")}
              </Button>
            </div>
          </form>
        )}
      </Sheet>
    </section>
  );
}
