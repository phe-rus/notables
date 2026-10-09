import { LinkIcon, MoreIcon, PinIcon, TrashIcon } from "@ultrapeach/ui";
import type { ReactNode } from "react";
import { t } from "../../../i18n/i18n";
import { copyAppLink, togglePinned } from "../../notes/actions/note-menu";
import type { SwipeAction } from "../../settings/model/preferences";
import { moveNotesToBin } from "../../trash/lib/recycle-bin";
import type { LibraryEntry } from "../store/library-store";

/** One button revealed by a swipe, as it looks and what it does. */
export interface SwipeButton {
  id: SwipeAction | "more";
  label: string;
  icon: ReactNode;
  /** Background and text colors, like the system's swipe actions. */
  tone: string;
  run: () => void;
}

/** The button a swipe setting stands for on this note, or none. */
export function swipeButton(action: SwipeAction, entry: LibraryEntry): SwipeButton | null {
  switch (action) {
    case "pin":
      return {
        id: "pin",
        label: entry.pinned ? t("notes.unpin") : t("notes.pin"),
        icon: <PinIcon size={18} />,
        tone: "bg-warning text-white",
        run: () => togglePinned([entry]),
      };
    case "delete":
      return {
        id: "delete",
        label: t("common.delete"),
        icon: <TrashIcon size={18} />,
        tone: "bg-danger text-white",
        run: () => moveNotesToBin([entry]),
      };
    case "copyLink":
      return {
        id: "copyLink",
        label: t("notes.copyLink"),
        icon: <LinkIcon size={18} />,
        tone: "bg-accent text-on-accent",
        run: () => copyAppLink(entry),
      };
    case "none":
      return null;
  }
}

/** More sits beside the swipe-left action and opens every action. */
export function moreButton(open: () => void): SwipeButton {
  return {
    id: "more",
    label: t("notes.more"),
    icon: <MoreIcon size={18} />,
    tone: "bg-label-secondary text-surface",
    run: open,
  };
}
