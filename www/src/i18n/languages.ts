/** Languages Notables speaks, by their own names. */
export const languages = [
  { id: "en", name: "English", dir: "ltr" },
  { id: "fr", name: "Français", dir: "ltr" },
  { id: "es", name: "Español", dir: "ltr" },
  { id: "pt", name: "Português", dir: "ltr" },
  { id: "sw", name: "Kiswahili", dir: "ltr" },
  { id: "ar", name: "العربية", dir: "rtl" },
] as const;

export type LanguageId = (typeof languages)[number]["id"];

export const isLanguageId = (value: unknown): value is LanguageId =>
  languages.some((language) => language.id === value);
