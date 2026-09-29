# Notables — Architecture

Notables is a local-first creative notebook: rich notes, a freeform canvas,
audio recordings with automatic transcription, photo journals, stories and
books. Anything can stay private, be shared with specific people, or be
published publicly — and unpublished again.

This document describes how the system is put together. Individual decisions
and their trade-offs are recorded as ADRs in [`docs/adr`](./adr).

## Goals

1. **Premium, native feel** on every platform — Apple-level motion, gestures
   and typography rather than a lowest-common-denominator UI.
2. **Local-first.** The app is fully usable offline. The device holds the
   source of truth for private content; the cloud is a sync peer.
3. **Private by default, public by choice.** Publishing is an explicit act
   that produces a snapshot; unpublishing removes it without touching the
   private original.
4. **One language, one data model.** TypeScript end-to-end, with the domain
   model and sync protocol shared by every client and the backend.

## Platforms

| Target            | Technology                                   | Location        |
| ----------------- | -------------------------------------------- | --------------- |
| Web               | TanStack Start on Cloudflare Workers         | `apps/web`      |
| iOS / Android     | Expo (React Native) + Expo Router            | `apps/mobile`   |
| macOS / Win / Linux | Tauri 2 shell around the web client        | `apps/desktop`  |

Logic is shared across platforms; UI is not. Each client renders
platform-appropriate UI on top of shared packages (see
[ADR-0002](./adr/0002-share-logic-not-ui.md)).

## Repository layout

```
apps/
  web/            TanStack Start app, deployed as a Cloudflare Worker
  mobile/         Expo app for iOS and Android
  desktop/        Tauri 2 desktop shell
packages/
  core/           Domain model, schemas, Yjs document structure
  sync/           Client sync engine (Yjs providers, auth tokens, retry)
  design-tokens/  Colors, typography, spacing, radii, motion curves
workers/
  api/            Social + publishing API (Hono, D1, R2)
  sync/           Real-time document sync (Durable Objects, one per note)
docs/
  ARCHITECTURE.md
  adr/            Architecture Decision Records
```

## Data model: two worlds

The most important boundary in the system
([ADR-0003](./adr/0003-local-first-private-server-authoritative-social.md)):

```
 ┌──────────────── Private (local-first) ────────────────┐   ┌──── Public (server-authoritative) ────┐
 │ Device SQLite  ◄──►  Yjs doc  ◄──►  Sync DO (per note)  │   │  D1: publications, likes, hearts,     │
 │ notes, canvases, recordings, journals, drafts          │──►│  ratings, comments, read counts       │
 └────────────────────────────────────────────────────────┘ publish (snapshot)  R2: published media   │
                                                             └───────────────────────────────────────┘
```

- **Private content** — notes, canvases, recordings, diary entries — lives in
  local SQLite on every device. Each note body is a **Yjs** document, synced
  through a Cloudflare **Durable Object** per note. Sharing with friends,
  family or specific people means granting them access to that Durable
  Object; real-time collaboration comes for free.
- **Public/social data** — publications, likes, hearts, ratings, comments,
  view and read counts — is server-authoritative, stored in **D1**. Counters
  and moderation need a single source of truth, so they are not local-first.
- **Publishing** takes a snapshot of the note's Yjs document and writes it
  to the public side. **Unpublishing** deletes that snapshot. The private
  original is never modified by either action.

### Visibility

Every note has one of four visibility levels (`packages/core`):

| Visibility  | Who can read                                    |
| ----------- | ----------------------------------------------- |
| `private`   | Only the owner                                  |
| `people`    | The owner plus an explicit list of people        |
| `circle`    | A named group (e.g. Friends, Family)             |
| `public`    | Anyone — requires a publication snapshot        |

## Content types

A note is a Yjs document containing one or more **surfaces**:

- **Text** — rich text (headings, lists, checklists, quotes, code, embeds),
  edited with Tiptap/ProseMirror on web and desktop, and the same editor
  inside a native WebView on mobile, all bound to the same Yjs XML fragment.
- **Canvas** — freeform board (ink, shapes, sticky notes, images, links).
  Rendered with React Native Skia on mobile and Skia/CanvasKit on the web,
  so one canvas engine serves every platform
  ([ADR-0004](./adr/0004-editor-and-canvas.md)).
- **Audio** — recordings stored in R2, with time-aligned transcript segments.
- **Media** — photos and video for journals and galleries.

Notes can be grouped into **collections** (notebooks, series, manga
volumes) and compiled into **books** (ordered chapters, cover, exported as
EPUB/PDF).

## Audio & transcription

1. Record locally (`expo-audio` on mobile, MediaRecorder on web).
2. Transcribe **on-device first** — Apple Speech on iOS, `whisper.rn`
   elsewhere — so private audio never has to leave the device.
3. Fall back to **Workers AI Whisper** when on-device transcription is
   unavailable or the user opts in.
4. Transcript segments are stored with timestamps so text and audio stay
   linked; a narrated story can be turned directly into a book chapter.

## Identity

`account.pherus.org` acts as an **OpenID Connect** provider. Clients use the
Authorization Code + PKCE flow. Until a user signs in, the app runs with a
local-only identity; on first sign-in local data is attached to the account
and begins syncing ([ADR-0005](./adr/0005-identity-via-pherus-accounts.md)).

## Backend (Cloudflare)

| Concern                  | Service                          |
| ------------------------ | -------------------------------- |
| Web app SSR              | Workers (`apps/web`)             |
| Real-time sync           | Durable Objects (`workers/sync`) |
| Social + publishing API  | Workers + Hono (`workers/api`)   |
| Relational data          | D1                               |
| Audio, images, exports   | R2                               |
| Transcription fallback   | Workers AI                       |

## Quality bar

- TypeScript strict mode everywhere; Biome for lint and format.
- Domain logic lives in `packages/core` and is unit tested with Vitest.
- CI runs lint, typecheck, test and build on every pull request.
- Conventional Commits (see [CONTRIBUTING](../CONTRIBUTING.md)).
