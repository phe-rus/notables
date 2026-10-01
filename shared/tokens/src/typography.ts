export const fontFamily = {
  sans: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", "Segoe UI", Roboto, sans-serif',
  display:
    '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", "Segoe UI", Roboto, sans-serif',
  /** Reading and writing. Newsreader is bundled; New York is used where present. */
  serif: '"Newsreader", "New York", "Iowan Old Style", Georgia, serif',
  mono: 'ui-monospace, "SF Mono", "JetBrains Mono", Menlo, monospace',
} as const;

export interface TextStyle {
  size: number;
  lineHeight: number;
  weight: 400 | 500 | 600 | 700;
  tracking: number;
}

/** Mirrors the iOS Dynamic Type "Large" scale, in points / CSS pixels. */
export const textStyles = {
  largeTitle: { size: 34, lineHeight: 41, weight: 700, tracking: 0.4 },
  title1: { size: 28, lineHeight: 34, weight: 700, tracking: 0.38 },
  title2: { size: 22, lineHeight: 28, weight: 700, tracking: -0.26 },
  title3: { size: 20, lineHeight: 25, weight: 600, tracking: -0.45 },
  headline: { size: 17, lineHeight: 22, weight: 600, tracking: -0.43 },
  body: { size: 17, lineHeight: 22, weight: 400, tracking: -0.43 },
  callout: { size: 16, lineHeight: 21, weight: 400, tracking: -0.31 },
  subheadline: { size: 15, lineHeight: 20, weight: 400, tracking: -0.23 },
  footnote: { size: 13, lineHeight: 18, weight: 400, tracking: -0.08 },
  caption: { size: 12, lineHeight: 16, weight: 400, tracking: 0 },
} as const satisfies Record<string, TextStyle>;

export type TextStyleName = keyof typeof textStyles;
