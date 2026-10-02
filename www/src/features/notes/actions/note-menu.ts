import { NoteKind } from "@notables/core";
import { type ContextMenuItem, toast } from "@notables/ui";
import type { useNavigate } from "@tanstack/react-router";
import { publicUrl } from "../../../platform/public-url";
import { noteKindLabels } from "../../library/model/note-kind-labels";
import { getLibrary, type LibraryEntry } from "../../library/store/library-store";
import { moveNotesToBin } from "../../trash/lib/recycle-bin";

type Navigate = ReturnType<typeof useNavigate>;

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
        moveNotesToBin([entry]);
      },
    },
  ];
}
