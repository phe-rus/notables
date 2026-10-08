import { accents, defaultAccent } from "./accent";

/**
 * Semantic color roles. Warm "paper" neutrals with a blush accent: the feel
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
  /** Glass materials: the lit top edge and the hairline rim. */
  glassHighlight: string;
  glassRim: string;
  /** Clear glass: its faint tint, the specular edge light and the sheen across it. */
  glassTint: string;
  glassSpecular: string;
  glassSheen: string;
  /** Shadows under floating glass, and the deeper one under menus. */
  shadowFloating: string;
  shadowMenu: string;
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
  ...accents[defaultAccent].light,
  highlight: "#ffe58a",
  heart: "#ff375f",
  inverse: "#1c1c1e",
  onInverse: "#ffffff",
  success: "#248a3d",
  warning: "#c93400",
  danger: "#d70015",
  glassHighlight: "rgb(255 255 255 / 0.55)",
  glassRim: "rgb(227 220 203 / 0.7)",
  // Clear, but in the sidebar's own warm paper, so it belongs to the app.
  glassTint: "rgb(243 239 230 / 0.42)",
  glassSpecular: "rgb(255 255 255 / 0.85)",
  glassSheen: "rgb(255 255 255 / 0.32)",
  shadowFloating: "rgb(40 30 0 / 0.18)",
  shadowMenu: "rgb(40 30 0 / 0.24)",
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
  ...accents[defaultAccent].dark,
  highlight: "#7a5c00",
  heart: "#ff375f",
  inverse: "#f5f2ec",
  onInverse: "#1c1c1e",
  success: "#30d158",
  warning: "#ff9f0a",
  danger: "#ff453a",
  glassHighlight: "rgb(255 255 255 / 0.1)",
  glassRim: "rgb(58 55 50 / 0.75)",
  glassTint: "rgb(26 25 23 / 0.5)",
  glassSpecular: "rgb(255 250 240 / 0.22)",
  glassSheen: "rgb(255 255 255 / 0.1)",
  shadowFloating: "rgb(0 0 0 / 0.5)",
  shadowMenu: "rgb(0 0 0 / 0.55)",
};

export const colors = { light, dark } as const;
