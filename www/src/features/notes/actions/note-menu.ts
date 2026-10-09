import { NoteKind } from "@notables/core";
import type { useNavigate } from "@tanstack/react-router";
import { type ContextMenuItem, openFollowUpMenu, toast } from "@ultrapeach/ui";
import { t } from "../../../i18n/i18n";
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
    { heading: t("notes.font") },
    {
      label: t("notes.sameAsSettings"),
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

/** Choosing the kind of one or more notes; a check marks the kind they all share. */
export function noteKindItems(entries: LibraryEntry[]): ContextMenuItem[] {
  const shared = entries.every((entry) => entry.kind === entries[0]?.kind)
    ? entries[0]?.kind
    : undefined;
  return [
    { heading: t("notes.kind") },
    ...NoteKind.options.map((kind) => ({
      label: noteKindLabels[kind],
      checked: shared === kind,
      onSelect: () => {
        const moving = entries.filter((entry) => entry.kind !== kind);
        if (moving.length === 0) return;
        for (const entry of moving) getLibrary().update(entry.id, { kind });
        toast(t("notes.movedTo", { kind: noteKindLabels[kind] }), {
          description: moving.length === 1 ? moving[0]?.title || undefined : undefined,
        });
      },
    })),
  ];
}

/** Pins every note, or unpins them when all of them are pinned already. */
export function togglePinned(entries: LibraryEntry[]) {
  const pinned = !entries.every((entry) => entry.pinned);
  for (const entry of entries) getLibrary().update(entry.id, { pinned });
}

export function copyAppLink(entry: LibraryEntry) {
  void navigator.clipboard
    .writeText(appLinkFor(`notes/${entry.id}`))
    .then(() =>
      toast.success(t("notes.appLinkCopied"), { description: t("notes.appLinkCopiedBody") }),
    );
}

/**
 * What right-click or long-press on a note offers. Kept short, like an iOS
 * menu: Font and Kind open their own lists in its place.
 */
export function noteMenu(
  entry: LibraryEntry,
  navigate: Navigate,
  { onSelectMany }: { onSelectMany?: () => void } = {},
): ContextMenuItem[] {
  return [
    {
      label: t("common.open"),
      onSelect: () => void navigate({ to: "/notes/$noteId", params: { noteId: entry.id } }),
    },
    {
      label: entry.pinned ? t("notes.unpin") : t("notes.pin"),
      onSelect: () => togglePinned([entry]),
    },
    ...(onSelectMany ? [{ label: t("notes.select"), onSelect: onSelectMany }] : []),
    { label: t("notes.copyAppLink"), onSelect: () => copyAppLink(entry) },
    ...(entry.publicationId
      ? [
          {
            label: t("notes.copyPublicLink"),
            onSelect: () => {
              void navigator.clipboard
                .writeText(publicUrl(`/p/${entry.publicationId}`))
                .then(() => toast.success(t("notes.linkCopied")));
            },
          },
        ]
      : []),
    "divider",
    { label: t("notes.fontMenu"), onSelect: () => openFollowUpMenu(noteFontItems(entry)) },
    { label: t("notes.kindMenu"), onSelect: () => openFollowUpMenu(noteKindItems([entry])) },
    "divider",
    {
      label: t("common.delete"),
      destructive: true,
      onSelect: () => moveNotesToBin([entry]),
    },
  ];
}
