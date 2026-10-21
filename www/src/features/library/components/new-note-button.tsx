import { PlusIcon } from "@phe-rus/hino";
import { IconButton } from "@phe-rus/hino/icon-button";
import { t } from "@/i18n/i18n";
import { openNoteCreation } from "../lib/note-creation-menu";
import type { NewNoteButtonProps } from "../model/note-creation-types";

export function NewNoteButton({ onCreate, className }: NewNoteButtonProps) {
  return (
    <IconButton
      size="icon-xs"
      variant="ghost"
      label={t("nav.newNote")}
      className={className}
      onClick={(event) => openNoteCreation(event.currentTarget, onCreate)}
    >
      <PlusIcon size={20} />
    </IconButton>
  );
}
