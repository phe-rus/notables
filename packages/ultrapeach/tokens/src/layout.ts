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

/**
 * Corner radii, in 2 px steps while small (the eye notices every pixel
 * there) and 4 px steps beyond. Nested shapes stay concentric: an inner
 * radius is the outer radius minus the padding between them. Pair with
 * `borderCurve: "continuous"` on iOS.
 */
export const radius = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 10,
  xl: 12,
  "2xl": 14,
  "3xl": 16,
  "4xl": 20,
  "5xl": 24,
  sheet: 28,
  full: 9999,
} as const;
