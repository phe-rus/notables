import { NoteKind } from "@notables/core";
import { type ContextMenuItem, confirmDialog, toast } from "@notables/ui";
import type { useNavigate } from "@tanstack/react-router";
import { publicUrl } from "../../../platform/public-url";
import { noteKindLabels } from "../../library/model/note-kind-labels";
import { getLibrary, type LibraryEntry } from "../../library/store/library-store";
import { deleteNote } from "./delete-note";

type Navigate = ReturnType<typeof useNavigate>;

/** Asks, then deletes a note and confirms with a toast. */
export async function confirmDeleteNote(entry: LibraryEntry): Promise<boolean> {
  const confirmed = await confirmDialog({
    title: "Delete this note?",
    message: "It will be removed from this device, with its photos and recordings.",
    confirmLabel: "Delete",
    destructive: true,
  });
  if (!confirmed) return false;
  await deleteNote(entry.id);
  toast("Note deleted", { description: entry.title || undefined });
  return true;
}

/** What right-click or long-press on a note offers. */
export function noteMenu(entry: LibraryEntry, navigate: Navigate): ContextMenuItem[] {
  const library = getLibrary();
  return [
    {
      label: "Open",
      onSelect: () => void navigate({ to: "/notes/$noteId", params: { noteId: entry.id } }),
    },
    {
      label: entry.pinned ? "Unpin" : "Pin",
      onSelect: () => library.update(entry.id, { pinned: !entry.pinned }),
    },
    ...(entry.publicationId
      ? [
          {
            label: "Copy public link",
            onSelect: () => {
              void navigator.clipboard
                .writeText(publicUrl(`/p/${entry.publicationId}`))
                .then(() => toast.success("Link copied"));
            },
          },
        ]
      : []),
    "divider",
    { heading: "Kind" },
    ...NoteKind.options.map((kind) => ({
      label: noteKindLabels[kind],
      checked: entry.kind === kind,
      onSelect: () => {
        if (kind === entry.kind) return;
        library.update(entry.id, { kind });
        toast(`Moved to ${noteKindLabels[kind]}`, { description: entry.title || undefined });
      },
    })),
    "divider",
    {
      label: "Delete",
      destructive: true,
      onSelect: () => {
        void confirmDeleteNote(entry);
      },
    },
  ];
}
