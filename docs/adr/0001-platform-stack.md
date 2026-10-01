# 0001. Platform stack

- **Status:** Accepted
- **Date:** 2026-09-29

## Context

Notables must ship on iOS, Android, web and desktop with a premium,
Apple-grade feel. The web app must run on Cloudflare Workers, and the team
prefers the TanStack ecosystem.

## Decision

- **Monorepo:** pnpm workspaces + Turborepo, TypeScript throughout.
- **Web:** TanStack Start (TanStack Router, Query, Form) deployed to
  Cloudflare Workers via `@cloudflare/vite-plugin`.
- **Mobile:** Expo (React Native, new architecture) with Expo Router,
  Reanimated, Gesture Handler and React Native Skia. TanStack Query, Form,
  Store and DB are used on mobile too; TanStack Router is web-only.
- **Desktop:** Tauri 2 wrapping the web client, with native menus and
  on-disk SQLite. Apple Silicon Macs can additionally run the iPad build.
- **Backend:** Cloudflare Workers, Durable Objects, D1, R2 and Workers AI.

### Alternatives considered

- **Tauri 2 everywhere (incl. mobile):** single codebase, but a WebView on
  phones cannot deliver the native feel this product depends on.
- **Expo everywhere (incl. web):** maximises shared UI, but gives up
  TanStack Start, produces a less web-native experience and fits Workers
  less cleanly.
- **Flutter:** consistent rendering, but abandons TypeScript sharing with
  the Workers backend and the TanStack ecosystem.

## Consequences

- Two UI layers (React DOM and React Native) must be built and kept visually
  consistent — mitigated by `packages/design-tokens`.
- React versions must stay aligned with the Expo SDK; the pnpm catalog
  enforces a single version.
