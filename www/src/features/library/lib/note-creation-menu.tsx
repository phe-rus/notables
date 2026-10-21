import { LayoutIcon, openMenu } from "@phe-rus/hino";
import { createElement } from "react";
import { t } from "@/i18n/i18n";
import type { CreateNote } from "../model/note-creation-types";
import { noteKindIcons } from "../model/note-kind-icons";
import { noteKindLabels } from "../model/note-kind-labels";

export function openNoteCreation(anchor: HTMLElement, onCreate: CreateNote) {
  openMenu(
    anchor,
    [
      ...(["note", "plan", "journal", "story", "article", "lesson", "comic", "manga"] as const).map(
        (kind) => ({
          label: noteKindLabels[kind],
          icon: createElement(noteKindIcons[kind], { size: 18 }),
          onSelect: () => onCreate(kind),
        }),
      ),
      "divider",
      {
        label: t("spreadsheet.title"),
        icon: <LayoutIcon size={18} />,
        onSelect: () => onCreate("note", "spreadsheet"),
      },
    ],
    { edge: "trailing" },
  );
}
