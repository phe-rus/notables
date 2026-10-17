export type NotePreviewBlock =
  | { kind: "heading"; text: string; level: number }
  | { kind: "paragraph" | "bullet" | "check" | "file"; text: string; checked?: boolean }
  | { kind: "image"; src: string; width: number }
  | { kind: "table"; rows: string[][] };
