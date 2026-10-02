/** How a note's text is set: the app's type, a book serif, or a hand. */
export type NoteFont = "default" | "serif" | "script" | "print";

export const noteFonts: NoteFont[] = ["default", "serif", "script", "print"];

export const noteFontLabels: Record<NoteFont, string> = {
  default: "Default",
  serif: "Serif",
  script: "Handwritten",
  print: "Print",
};

/** The family each option uses, for showing the choice in its own type. */
export const noteFontFamilies: Record<NoteFont, string> = {
  default: "var(--font-sans)",
  serif: "var(--font-serif)",
  script: "var(--font-script)",
  print: "var(--font-print)",
};
