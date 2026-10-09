import { type AccentId, defaultAccent, isAccentId } from "@ultrapeach/tokens";
import { t } from "../../../i18n/i18n";
import { isMediaKind, type MediaKind } from "../../books/model/media-kind";
import { type NoteFont, noteFonts } from "../../library/model/note-fonts";
import {
  isSidebarItemId,
  type SidebarItemId,
  sidebarItemIds,
} from "../../library/model/sidebar-items";

/** How this device looks and arranges things. Stored on the device. */
export interface Preferences {
  theme: ThemePreference;
  accent: AccentId;
  textSize: TextSize;
  /** The font notes use unless they choose their own. */
  noteFont: NoteFont;
  list: ListPreferences;
  sidebar: SidebarPreferences;
  /** The Books list's shelf: everything, or one kind. */
  booksShelf: BooksShelf;
  /** A light tap from the device as things are switched, picked and finished. */
  haptics: boolean;
}

export type BooksShelf = "all" | MediaKind;

export type ThemePreference = "system" | "light" | "dark";
export type TextSize = "small" | "medium" | "large";

export interface ListPreferences {
  density: "comfortable" | "compact";
  /** How many lines of each note show under its title, as in Mail; 0 hides them. */
  previewLines: PreviewLines;
  /** Show the kind (Journal, Story…) under each note. */
  kindTags: boolean;
  sort: ListSort;
  /** Newest first (A to Z by title), or the other way round. */
  order: ListOrder;
  /** Group notes under Today, Yesterday, Previous 7 Days… */
  groupByDate: boolean;
  /** Pinned notes in their own group at the top. */
  pinnedOnTop: boolean;
  /** The date before each preview. */
  showDates: boolean;
  /** What a swipe to the right, then to the left, does on a note. */
  swipeRight: SwipeAction;
  swipeLeft: SwipeAction;
}

export type ListOrder = "standard" | "reversed";

export const swipeActions = ["pin", "delete", "copyLink", "none"] as const;
export type SwipeAction = (typeof swipeActions)[number];

export type ListSort = "edited" | "created" | "title";

export const previewLineCounts = [0, 1, 2, 3, 4, 5] as const;
export type PreviewLines = (typeof previewLineCounts)[number];

export interface SidebarPreferences {
  /** Every customizable item, in the order shown. */
  order: SidebarItemId[];
  hidden: SidebarItemId[];
  counts: boolean;
  /** Desktop sidebar width in pixels, set by dragging its edge. */
  width: number;
  /** Desktop sidebar tucked away for more room. */
  collapsed: boolean;
  /** Artifacts (Calendar, Wallet, Invoices) shown open. */
  artifactsOpen: boolean;
}

export const sidebarWidth = { min: 220, max: 360, default: 264 } as const;

export const defaultPreferences: Preferences = {
  theme: "system",
  accent: defaultAccent,
  textSize: "medium",
  noteFont: "default",
  list: {
    density: "comfortable",
    previewLines: 2,
    kindTags: true,
    sort: "edited",
    order: "standard",
    groupByDate: true,
    pinnedOnTop: true,
    showDates: true,
    swipeRight: "pin",
    swipeLeft: "delete",
  },
  sidebar: {
    order: [...sidebarItemIds],
    hidden: [],
    counts: true,
    width: sidebarWidth.default,
    collapsed: false,
    artifactsOpen: false,
  },
  booksShelf: "all",
  haptics: true,
};

export const textSizes: Record<TextSize, { readonly label: string; bodyPx: number }> = {
  small: {
    get label() {
      return t("settings.textSmall");
    },
    bodyPx: 18,
  },
  medium: {
    get label() {
      return t("settings.textMedium");
    },
    bodyPx: 20,
  },
  large: {
    get label() {
      return t("settings.textLarge");
    },
    bodyPx: 23,
  },
};

const oneOf = <T extends string>(value: unknown, options: readonly T[], fallback: T): T =>
  options.includes(value as T) ? (value as T) : fallback;

const flag = (value: unknown, fallback: boolean) => (typeof value === "boolean" ? value : fallback);

/** Reads stored preferences, keeping what is valid and defaulting the rest. */
export function normalizePreferences(raw: unknown): Preferences {
  const input = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const list = (input.list ?? {}) as Record<string, unknown>;
  const sidebar = (input.sidebar ?? {}) as Record<string, unknown>;
  const defaults = defaultPreferences;

  const storedOrder = Array.isArray(sidebar.order) ? sidebar.order.filter(isSidebarItemId) : [];
  const order = [...new Set([...storedOrder, ...sidebarItemIds])];
  const hidden = Array.isArray(sidebar.hidden)
    ? [...new Set(sidebar.hidden.filter(isSidebarItemId))]
    : [];

  return {
    theme: oneOf(input.theme, ["system", "light", "dark"], defaults.theme),
    accent: isAccentId(input.accent) ? input.accent : defaults.accent,
    textSize: oneOf(input.textSize, ["small", "medium", "large"], defaults.textSize),
    noteFont: oneOf(input.noteFont, noteFonts, defaults.noteFont),
    list: {
      density: oneOf(list.density, ["comfortable", "compact"], defaults.list.density),
      // Before the line count, the preview was only on or off.
      previewLines: previewLineCounts.includes(list.previewLines as PreviewLines)
        ? (list.previewLines as PreviewLines)
        : list.preview === false
          ? 0
          : defaults.list.previewLines,
      kindTags: flag(list.kindTags, defaults.list.kindTags),
      sort: oneOf(list.sort, ["edited", "created", "title"], defaults.list.sort),
      order: oneOf(list.order, ["standard", "reversed"], defaults.list.order),
      groupByDate: flag(list.groupByDate, defaults.list.groupByDate),
      pinnedOnTop: flag(list.pinnedOnTop, defaults.list.pinnedOnTop),
      showDates: flag(list.showDates, defaults.list.showDates),
      swipeRight: oneOf(list.swipeRight, swipeActions, defaults.list.swipeRight),
      swipeLeft: oneOf(list.swipeLeft, swipeActions, defaults.list.swipeLeft),
    },
    sidebar: {
      order,
      hidden,
      counts: flag(sidebar.counts, defaults.sidebar.counts),
      width:
        typeof sidebar.width === "number" && Number.isFinite(sidebar.width)
          ? Math.round(Math.min(sidebarWidth.max, Math.max(sidebarWidth.min, sidebar.width)))
          : defaults.sidebar.width,
      collapsed: flag(sidebar.collapsed, defaults.sidebar.collapsed),
      artifactsOpen: flag(sidebar.artifactsOpen, defaults.sidebar.artifactsOpen),
    },
    booksShelf: isMediaKind(input.booksShelf) ? input.booksShelf : "all",
    haptics: flag(input.haptics, defaults.haptics),
  };
}
