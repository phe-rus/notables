import {
  Button,
  FolderIcon,
  IconButton,
  openMenu,
  PinIcon,
  spring,
  TrashIcon,
} from "@phe-rus/hino";
import { motion } from "motion/react";
import { noteFolderItems, togglePinned } from "@/features/notes/actions/note-menu";
import { moveNotesToBin } from "@/features/trash/lib/recycle-bin";
import { t } from "@/i18n/i18n";
import { isGeneratedLedger } from "../model/generated-entry";
import type { LibraryEntry } from "../store/library-store";

/** What can be done to every chosen note at once, floating over the list. */
export function NotesSelectionBar({
  chosen,
  allSelected,
  onToggleAll,
  onDone,
}: {
  chosen: LibraryEntry[];
  allSelected: boolean;
  onToggleAll: () => void;
  onDone: () => void;
}) {
  const none = chosen.length === 0;
  const allPinned = !none && chosen.every((entry) => entry.pinned);
  return (
    <motion.div
      initial={{ y: 24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 24, opacity: 0 }}
      transition={spring.smooth}
      className="glass-menu absolute inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-10 flex items-center justify-between gap-1 rounded-4xl p-2 max-md:bottom-24"
    >
      <Button variant="ghost" onClick={onToggleAll}>
        {allSelected ? t("notes.deselectAll") : t("notes.selectAll")}
      </Button>
      <div className="flex items-center gap-1">
        <IconButton
          variant="ghost"
          size="icon"
          label={allPinned ? t("notes.unpin") : t("notes.pin")}
          disabled={none}
          onClick={() => togglePinned(chosen)}
        >
          <PinIcon size={19} />
        </IconButton>
        <IconButton
          variant="ghost"
          size="icon"
          label={t("workspace.moveToFolder")}
          disabled={none}
          onClick={(event) =>
            openMenu(event.currentTarget, noteFolderItems(chosen), { above: true })
          }
        >
          <FolderIcon size={19} />
        </IconButton>
        <IconButton
          variant="ghost"
          size="icon"
          label={t("common.delete")}
          disabled={none || chosen.every(isGeneratedLedger)}
          className="text-danger"
          onClick={() => {
            moveNotesToBin(chosen);
            onDone();
          }}
        >
          <TrashIcon size={19} />
        </IconButton>
      </div>
    </motion.div>
  );
}
