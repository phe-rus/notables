/** 4-point spacing grid. */
export const space = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

/** Continuous-corner radii; pair with `borderCurve: "continuous"` on iOS. */
export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  sheet: 28,
  full: 9999,
} as const;
