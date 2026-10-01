# 0002. Share logic, not UI

- **Status:** Accepted
- **Date:** 2026-09-29

## Context

Universal UI kits (react-native-web, Tamagui) let one component tree render
everywhere, but tend to feel slightly foreign on every platform. Apple's own
apps share models and services, not views.

## Decision

Shared packages contain **no platform UI**:

- `@notables/core` — domain types, validation schemas, Yjs document layout.
- `@notables/sync` — sync client, connection lifecycle, auth tokens.
- `@notables/design-tokens` — colors, type scale, spacing, radii and spring
  curves consumed by both Tailwind (web) and React Native styles.

Each app implements its own views with platform-native primitives.

## Consequences

- More view code, but each platform can use its best interaction patterns
  (SF Symbols, haptics, context menus, keyboard shortcuts, hover states).
- Design consistency depends on tokens and review, not on shared components.
