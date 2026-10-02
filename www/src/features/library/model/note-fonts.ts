import { t } from "../../../i18n/i18n";
/** How a note's text is set: the app's type, a book serif, or a hand. */
export type NoteFont = "default" | "serif" | "script" | "print";

export const noteFonts: NoteFont[] = ["default", "serif", "script", "print"];

export const noteFontLabels: Record<NoteFont, string> = {
  get default() {
    return t("settings.fontDefault");
  },
  get serif() {
    return t("settings.fontSerif");
  },
  get script() {
    return t("settings.fontScript");
  },
  get print() {
    return t("settings.fontPrint");
  },
};

/** The family each option uses, for showing the choice in its own type. */
export const noteFontFamilies: Record<NoteFont, string> = {
  default: "var(--font-sans)",
  serif: "var(--font-serif)",
  script: "var(--font-script)",
  print: "var(--font-print)",
};
