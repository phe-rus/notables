import { accents } from "./accent";

/**
 * Semantic color roles. Warm "paper" neutrals with a honey accent: the feel
 * of a well-made notebook, tuned to sit naturally beside Apple's system UI.
 */
export interface ColorScheme {
  /** Window background. */
  background: string;
  /** Sidebar and toolbars. */
  sidebar: string;
  /** Lists and secondary panes. */
  surface: string;
  /** Writing and reading surface. */
  paper: string;
  /** Cards, popovers and sheets. */
  elevated: string;
  /** Inputs, chips and pressed states. */
  fill: string;
  separator: string;
  label: string;
  labelSecondary: string;
  labelTertiary: string;
  /** Body text on paper. */
  ink: string;
  /** Selection, active items and primary fills. */
  accent: string;
  /** Text and icons placed on `accent`. */
  onAccent: string;
  /** Accent-colored text and icons on neutral backgrounds (AA contrast). */
  accentText: string;
  /** Subtle accent tint for selected rows. */
  accentSoft: string;
  highlight: string;
  heart: string;
  /** Floating toolbars and primary buttons. */
  inverse: string;
  onInverse: string;
  success: string;
  warning: string;
  danger: string;
}

export const light: ColorScheme = {
  background: "#ffffff",
  sidebar: "#f3efe6",
  surface: "#fdfcf9",
  paper: "#fffdf8",
  elevated: "#ffffff",
  fill: "#efebe2",
  separator: "#e3dccb",
  label: "#1c1c1e",
  labelSecondary: "#6b6458",
  labelTertiary: "#8b8478",
  ink: "#24221f",
  ...accents.honey.light,
  highlight: "#ffe58a",
  heart: "#ff375f",
  inverse: "#1c1c1e",
  onInverse: "#ffffff",
  success: "#248a3d",
  warning: "#c93400",
  danger: "#d70015",
};

export const dark: ColorScheme = {
  background: "#121110",
  sidebar: "#1a1917",
  surface: "#161514",
  paper: "#1a1917",
  elevated: "#24221f",
  fill: "#2c2a26",
  separator: "#3a3732",
  label: "#f5f2ec",
  labelSecondary: "#b5aea2",
  labelTertiary: "#8f887b",
  ink: "#ece6da",
  ...accents.honey.dark,
  highlight: "#7a5c00",
  heart: "#ff375f",
  inverse: "#f5f2ec",
  onInverse: "#1c1c1e",
  success: "#30d158",
  warning: "#ff9f0a",
  danger: "#ff453a",
};

export const colors = { light, dark } as const;
