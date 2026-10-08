/**
 * Accent colors people can choose. Blush, the soft pink of the iPhone 15,
 * is the default and UltraPeach's own color; the others are calm, slightly
 * muted tones that sit well on warm paper.
 * Each sets the four accent roles for light and dark schemes.
 */
export interface AccentColors {
  accent: string;
  onAccent: string;
  accentText: string;
  accentSoft: string;
}

export type AccentId = "blush" | "honey" | "sage" | "ocean" | "lavender" | "rose" | "graphite";

export interface Accent {
  id: AccentId;
  name: string;
  /**
   * The color that stands for this accent in pickers and on the brand. Usually
   * the fill itself; Blush keeps its soft pink here while controls use a
   * deeper shade that can be seen against white.
   */
  swatch: string;
  light: AccentColors;
  dark: AccentColors;
}

export const accents: Record<AccentId, Accent> = {
  blush: {
    id: "blush",
    name: "Blush",
    swatch: "#f2d4d7",
    // The soft pink is too pale for a switched-on toggle (1.4:1); rose pink
    // reaches 3:1 on every light ground, the warm sidebar included.
    light: { accent: "#d16988", onAccent: "#1c1c1e", accentText: "#9e3b4f", accentSoft: "#fbeff0" },
    dark: { accent: "#e8b4bb", onAccent: "#22131a", accentText: "#efb3bc", accentSoft: "#36242a" },
  },
  honey: {
    id: "honey",
    name: "Honey",
    swatch: "#efbd52",
    light: { accent: "#efbd52", onAccent: "#1c1c1e", accentText: "#835608", accentSoft: "#f8eed6" },
    dark: { accent: "#e2b04f", onAccent: "#1c1c1e", accentText: "#e8bf6c", accentSoft: "#342b1a" },
  },
  sage: {
    id: "sage",
    name: "Sage",
    swatch: "#a9c29b",
    light: { accent: "#a9c29b", onAccent: "#1c1c1e", accentText: "#46653b", accentSoft: "#e6ede0" },
    dark: { accent: "#93b285", onAccent: "#141812", accentText: "#a9c79c", accentSoft: "#232b20" },
  },
  ocean: {
    id: "ocean",
    name: "Ocean",
    swatch: "#9cc3e6",
    light: { accent: "#9cc3e6", onAccent: "#1c1c1e", accentText: "#2c6193", accentSoft: "#e2ecf6" },
    dark: { accent: "#79acdb", onAccent: "#0f1720", accentText: "#93bde4", accentSoft: "#1d2834" },
  },
  lavender: {
    id: "lavender",
    name: "Lavender",
    swatch: "#c3b8ea",
    light: { accent: "#c3b8ea", onAccent: "#1c1c1e", accentText: "#5d4f9e", accentSoft: "#ece8f7" },
    dark: { accent: "#a99cdf", onAccent: "#16131f", accentText: "#bdb3ea", accentSoft: "#282435" },
  },
  rose: {
    id: "rose",
    name: "Rose",
    swatch: "#efb3bb",
    light: { accent: "#efb3bb", onAccent: "#1c1c1e", accentText: "#a23f51", accentSoft: "#f8e6e9" },
    dark: { accent: "#e5949f", onAccent: "#22131a", accentText: "#efadb6", accentSoft: "#36232a" },
  },
  graphite: {
    id: "graphite",
    name: "Graphite",
    swatch: "#3a3936",
    light: { accent: "#3a3936", onAccent: "#ffffff", accentText: "#4a4844", accentSoft: "#ebe8e2" },
    dark: { accent: "#d6d2ca", onAccent: "#151413", accentText: "#cfcbc3", accentSoft: "#2e2c29" },
  },
};

export const defaultAccent: AccentId = "blush";

export function isAccentId(value: unknown): value is AccentId {
  return typeof value === "string" && value in accents;
}
