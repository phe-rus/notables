/**
 * Spring presets shared by Reanimated (mobile) and CSS/Motion (web) so
 * interactions feel identical everywhere. Values follow SwiftUI's defaults.
 */
export interface Spring {
  damping: number;
  stiffness: number;
  mass: number;
}

export const springs = {
  /** Default UI transitions. */
  smooth: { damping: 26, stiffness: 240, mass: 1 },
  /** Buttons, toggles and small feedback. */
  snappy: { damping: 22, stiffness: 380, mass: 1 },
  /** Sheets, cards and playful moments. */
  bouncy: { damping: 14, stiffness: 220, mass: 1 },
} as const satisfies Record<string, Spring>;

export const duration = {
  instant: 100,
  fast: 200,
  normal: 300,
  slow: 450,
} as const;

/** CSS easing approximating the `smooth` spring for non-spring contexts. */
export const easing = {
  standard: "cubic-bezier(0.2, 0.8, 0.2, 1)",
  emphasized: "cubic-bezier(0.3, 1.3, 0.4, 1)",
} as const;
