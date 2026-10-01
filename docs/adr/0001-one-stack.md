# 0001. One stack: Bun, TanStack, Tauri, Cloudflare

- **Status:** Accepted
- **Date:** 2026-10-01

## Context

Notables must ship on iOS, Android, desktop and the web with a premium feel.
The web must run on Cloudflare Workers. A small team cannot maintain several
UI stacks, an API framework and multiple services.

## Decision

- **Bun + Turborepo** for the monorepo, package management, scripts and tests.
- **Tauri 2** for every native target — iOS, Android, macOS, Windows, Linux —
  with one Rust core for device capabilities (SQLite, audio, files,
  on-device transcription).
- **TanStack Router** for the app and **TanStack Start** for server
  functions, API routes and server rendering on **Cloudflare Workers**.
- **No separate API framework.** Server code is TanStack Start server
  functions / API routes, or Rust commands when it belongs on the device.

### Alternatives considered

- **Expo for mobile + Tauri for desktop:** native mobile UI, but two UI
  stacks and two sets of platform code.
- **A separate API service (e.g. Hono):** clean, but a second framework and
  deployment for logic TanStack Start already hosts.

## Consequences

- One UI codebase everywhere; polish comes from our design system and
  motion work rather than native widgets.
- Mobile runs in the system WebView (WKWebView / Android WebView); we must
  keep the DOM lean and animations on the compositor.
- The Tauri build is a static SPA that calls the deployed Worker for server
  functions, so the Worker must allow the Tauri origins (CORS).
