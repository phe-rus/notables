import type { ContextMenuItem } from "@phe-rus/hino";
import type { AccentId } from "@phe-rus/hino/tokens";
import type { CompactAction } from "@/components/actions/types";
import type { Folder, LibraryEntry } from "../store/library-store";

export type EditingFolder = { id: string | null; name: string; color?: AccentId };
export type FolderActionsProps = { name: string; actions: readonly CompactAction[] };
export type PersonalDestination = "/books" | "/wallet" | "/calendar" | "/invoices" | "/connections";
export type SidebarFolderProps = {
  folder: Folder;
  entries: LibraryEntry[];
  active: boolean;
  activeNoteId?: string;
  counts: boolean;
  menu: () => ContextMenuItem[];
};
