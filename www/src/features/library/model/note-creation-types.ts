import type { NoteKind } from "@notables/core";
export type CreateNote = (kind?: NoteKind, format?: "document" | "spreadsheet") => void;
export type NewNoteButtonProps = { onCreate: CreateNote; className?: string };
