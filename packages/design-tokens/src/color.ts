/**
 * Semantic color roles, modelled on Apple's system colors so the app feels
 * at home on iOS and macOS while staying consistent on Android and the web.
 */
export interface ColorScheme {
  background: string;
  backgroundElevated: string;
  backgroundGrouped: string;
  surface: string;
  label: string;
  labelSecondary: string;
  labelTertiary: string;
  separator: string;
  fill: string;
  accent: string;
  accentContrast: string;
  paper: string;
  ink: string;
  highlight: string;
  heart: string;
  success: string;
  warning: string;
  danger: string;
}

export const light: ColorScheme = {
  background: "#ffffff",
  backgroundElevated: "#ffffff",
  backgroundGrouped: "#f2f2f7",
  surface: "#f9f9fb",
  label: "#1c1c1e",
  labelSecondary: "#3c3c4399",
  labelTertiary: "#3c3c434d",
  separator: "#3c3c4329",
  fill: "#78788033",
  accent: "#e8a200",
  accentContrast: "#1c1c1e",
  paper: "#fbf8f1",
  ink: "#1c1c1e",
  highlight: "#ffe58a",
  heart: "#ff375f",
  success: "#34c759",
  warning: "#ff9f0a",
  danger: "#ff3b30",
};

export const dark: ColorScheme = {
  background: "#000000",
  backgroundElevated: "#1c1c1e",
  backgroundGrouped: "#000000",
  surface: "#1c1c1e",
  label: "#f5f5f7",
  labelSecondary: "#ebebf599",
  labelTertiary: "#ebebf54d",
  separator: "#54545899",
  fill: "#7878805c",
  accent: "#ffc53d",
  accentContrast: "#1c1c1e",
  paper: "#1a1917",
  ink: "#f5f5f7",
  highlight: "#8a6d00",
  heart: "#ff375f",
  success: "#30d158",
  warning: "#ff9f0a",
  danger: "#ff453a",
};

export const colors = { light, dark } as const;
