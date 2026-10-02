import { NoteKind } from "@notables/core";
import { type ContextMenuItem, toast } from "@notables/ui";
import type { useNavigate } from "@tanstack/react-router";
import { appLinkFor } from "../../../platform/app-links";
import { publicUrl } from "../../../platform/public-url";
import { noteFontLabels, noteFonts } from "../../library/model/note-fonts";
import { noteKindLabels } from "../../library/model/note-kind-labels";
import { getLibrary, type LibraryEntry } from "../../library/store/library-store";
import { moveNotesToBin } from "../../trash/lib/recycle-bin";

type Navigate = ReturnType<typeof useNavigate>;

/** Choosing a note's font, each option shown in its own type. */
export function noteFontItems(entry: LibraryEntry): ContextMenuItem[] {
  const current = entry.font ?? null;
  return [
    { heading: "Font" },
    {
      label: "Same as Settings",
      checked: current === null,
      onSelect: () => getLibrary().update(entry.id, { font: undefined }),
    },
    ...noteFonts.map((font) => ({
      label: noteFontLabels[font],
      checked: current === font,
      onSelect: () => getLibrary().update(entry.id, { font }),
    })),
  ];
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
    {
      label: "Copy app link",
      onSelect: () => {
        void navigator.clipboard
          .writeText(appLinkFor(`notes/${entry.id}`))
          .then(() =>
            toast.success("App link copied", { description: "Opens this note in Notables." }),
          );
      },
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
    ...noteFontItems(entry),
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
