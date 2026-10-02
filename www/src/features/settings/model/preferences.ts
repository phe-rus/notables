import { type AccentId, defaultAccent, isAccentId } from "@notables/tokens";
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
  list: ListPreferences;
  sidebar: SidebarPreferences;
}

export type ThemePreference = "system" | "light" | "dark";
export type TextSize = "small" | "medium" | "large";

export interface ListPreferences {
  density: "comfortable" | "compact";
  /** Show the first lines of each note under its title. */
  preview: boolean;
  /** Show the kind (Journal, Story…) under each note. */
  kindTags: boolean;
  sort: ListSort;
  /** Group notes under Today, Yesterday, Previous 7 Days… */
  groupByDate: boolean;
}

export type ListSort = "edited" | "created" | "title";

export interface SidebarPreferences {
  /** Every customizable item, in the order shown. */
  order: SidebarItemId[];
  hidden: SidebarItemId[];
  counts: boolean;
  /** Desktop sidebar width in pixels, set by dragging its edge. */
  width: number;
  /** Desktop sidebar tucked away for more room. */
  collapsed: boolean;
}

export const sidebarWidth = { min: 220, max: 360, default: 264 } as const;

export const defaultPreferences: Preferences = {
  theme: "system",
  accent: defaultAccent,
  textSize: "medium",
  list: {
    density: "comfortable",
    preview: true,
    kindTags: true,
    sort: "edited",
    groupByDate: true,
  },
  sidebar: {
    order: [...sidebarItemIds],
    hidden: [],
    counts: true,
    width: sidebarWidth.default,
    collapsed: false,
  },
};

export const textSizes: Record<TextSize, { label: string; bodyPx: number }> = {
  small: { label: "Small", bodyPx: 18 },
  medium: { label: "Default", bodyPx: 20 },
  large: { label: "Large", bodyPx: 23 },
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
    list: {
      density: oneOf(list.density, ["comfortable", "compact"], defaults.list.density),
      preview: flag(list.preview, defaults.list.preview),
      kindTags: flag(list.kindTags, defaults.list.kindTags),
      sort: oneOf(list.sort, ["edited", "created", "title"], defaults.list.sort),
      groupByDate: flag(list.groupByDate, defaults.list.groupByDate),
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
    },
  };
}
