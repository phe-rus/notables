# Scope: Notables app (`www`)

Notables is a local first app for notes, journals, stories, books, comics,
audiobooks, invoices and plans, on iOS, Android, desktop and the web. This
scope covers the `www` app and the shared packages it is built on.

**Build approach:** Tracer Bullet (each feature works end to end through every layer before the next one starts).
**Workflow:** Beta (after `/develop`: `/check verify`, then `/test`). Features tagged `· GA` cover identity, privacy, sensitive financial data or release readiness.

_These are recommendations to keep the build orderly, not requirements. Skip anything that does not fit: if you already know how to build a feature, go straight to `/develop`. You decide when a feature is `done`._

## At a glance

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| A | Library and editor | Existing | existing |
| B | Publishing | Existing | existing |
| C | Books and readers | Existing | existing |
| D | Imports and exports | Existing | existing |
| E | Handwriting and drawing studio | Existing | existing |
| F | Recording and on device Whisper | Existing | existing |
| G | Invoices, receipts and quotes | Existing | existing |
| H | AI help with your own key | Existing | existing |
| I | Calendar and reminders | Existing | existing |
| J | Search, settings, setup, recycle bin | Existing | existing |
| K | Sharing by invitation link | Existing | existing |
| L | Listening (audiobooks, read along, read aloud) | Existing | in-progress |
| M | Six languages | Existing | in-progress |
| N | Widgets | Existing | in-progress |
| 1 | Loud, clean sound | Slice 1 | in-progress |
| 2 | Natural voice on the device | Slice 1 | in-progress |
| 3 | Cloud voices with your own key | Slice 1 | planned |
| 4 | Responsive layout for tablets and small windows | Slice 2 | in-progress |
| 5 | Four media kinds | Slice 3 | in-progress |
| 6 | Read aloud where it belongs | Slice 3 | planned |
| 7 | Turn audio into a book | Slice 3 | planned |
| 8 | Your identity: name and @code | Slice 4 | planned |
| 9 | People nearby | Slice 4 | planned |
| 10 | Find someone by @code | Slice 4 | planned |
| 11 | Connections screen | Slice 4 | in-progress |
| 12 | Share with contacts | Slice 4 | planned |
| 13 | Code tidy up | Slice 5 | planned |
| 14 | Mobile voice packs | Slice 1 | planned |
| 15 | Android notification startup | Slice 2 | planned |
| 16 | Android export destinations | Slice 2 | planned |
| 17 | ChromeOS build | Slice 2 | planned |
| 18 | Pluraliti editor polish | Product polish | planned |
| 19 | Library organization and visual polish | Product polish | planned |
| 20 | Digital card wallet | Wallet | in-progress |
| 21 | Card autofill and contactless capability | Wallet | planned |
| 22 | Shared note conversations and contact mentions | Connections | planned |
| 23 | Nearby note drop | Connections | planned |
| 24 | Income, expenses and calculation sheets | Money and calculations | planned |
| 25 | Store release readiness | Release | planned |
| 26 | Settings and navigation refresh | Product polish | planned |

## Already built

### A. Library and editor · existing
Local first library (SQLite natively, IndexedDB on the web) and the custom Lexical editor. code in `www/src/features/library`, `www/src/features/notes`, `packages/pluraliti`

### B. Publishing · existing
Server rendered public pages with hearts, ratings and counts; unpublish at any time. code in `www/src/features/publishing`

### C. Books and readers · existing
Books with page turns, highlights, series, comic and manga readers. code in `www/src/features/books`, `www/src/features/reader`

### D. Imports and exports · existing
EPUB, PDF, CBZ and audio imports; EPUB, PDF, Word, HTML, Markdown, text, CBZ and audiobook exports. code in `www/src/features/imports`, `www/src/features/books/export`

### E. Handwriting and drawing studio · existing
Ink blocks with pen pressure, handwriting fonts, and a studio for comic and picture book pages. code in `www/src/features/studio`, `packages/pluraliti`

### F. Recording and on device Whisper · existing
Voice notes with live transcription; Whisper runs in the Rust core. code in `www/src/features/recording`, `www/src-tauri/src/transcription`

### G. Invoices, receipts and quotes · existing
Signed seal, QR and number checks, hidden tamper mark, PDF, business profile. code in `www/src/features/invoices`, `packages/notable-core/src/invoicing`

### H. AI help with your own key · existing
Writing help through Claude, Gemini or OpenRouter, off by default. code in `www/src/features/ai`

### I. Calendar and reminders · existing
Plans, birthdays, repeats, notifications, chime and vibration. Phone scheduling is untested on a device. code in `www/src/features/calendar`, `packages/notable-core/src/calendar`

### J. Search, settings, setup, recycle bin · existing
Full text search, appearance settings, first run setup, seven day recycle bin. code in `www/src/features/search`, `www/src/features/settings`, `www/src/features/setup`, `www/src/features/trash`

### K. Sharing by invitation link · existing
Peer to peer sharing of one note through an invitation link; works while both devices are online. Slice 4 builds people and contacts on top of it. code in `www/src/features/sharing`, `packages/sync/src/peer`

### L. Listening (audiobooks, read along, read aloud) · in-progress
App wide audiobook session, read along with Whisper, read aloud with device or Gemini voices. Gemini voices are untested with a real key; voice quality is Slice 1. code in `www/src/features/listening`

### M. Six languages · in-progress
English, French, Spanish, Portuguese, Swahili and Arabic with RTL. Deeper screens (invoice editor, importers, reader labels) are still English. code in `www/src/i18n`

### N. Widgets · in-progress
Desktop Today widget works. Android has a Today home screen widget and Add to Home Screen, tested on a real phone. The iOS widget still needs a generated project and device checks. code in `www/src/features/widgets`, `www/src-tauri/widgets`

## Slice 1: Voices and sound

### 1. Loud, clean sound · in-progress
Every sound the app makes plays at full loudness, so the device volume alone decides how loud it is: reminder chimes, generated voices, audiobooks. Device voices are listed once each.
**Done when:** the reminder chime and read aloud are clearly audible at normal device volume on Linux, macOS, Windows, iOS and Android, and the voice picker shows no duplicates.
- [x] Build it: `/develop loud, clean sound` (commit 97a0d83)
- [ ] Verify it: `/check verify loud, clean sound`
- [ ] Test it: `/test loud, clean sound`
code in `www/src/features/listening/lib`, `www/src/features/calendar/lib/alert-feedback.ts`

### 2. Natural voice on the device · in-progress
A premium sounding voice you download once that reads offline and privately on every platform, with the calm, Apple like feel you want. It also replaces the robotic built in voice on Linux.
**Done when:** after one download, read aloud uses a natural voice with no connection and no key, on desktop and phones, and starts speaking within about a second.
- [x] Design it (spec): `/architect natural voice on the device`
- [ ] Build it: `/develop natural voice on the device`
  - [x] Models served from R2 and downloaded, checksummed and resumable in Rust, with the bucket and database renamed (AC-7, AC-11, AC-14)
  - [x] Supertonic speaking in read aloud on desktop: Rust synthesis, the natural voice engine, ranking and content language (AC-3, AC-4, AC-5, AC-6, AC-12, AC-13)
  - [x] Automatic, manageable and updatable packs in Settings > Listening (AC-1, AC-2, AC-8, AC-9, AC-15)
  - [x] Whisper moved onto the same packs, every string in six languages (AC-10, AC-16)
- [ ] Verify it: `/check verify natural voice on the device`
- [ ] Test it: `/test natural voice on the device`
spec [0001](../../specs/www/0001-natural-voice-on-device/index.md)
code in `www/src-tauri/src/models`, `www/src-tauri/src/voice`, `www/src/features/listening`, `www/src/server/models`, `scripts/models`

Resume: finish publishing the packs and deploying the serving endpoint, confirm the resource rename, then verify spec 0001. The handover still reports these release steps open. Android read aloud currently has no device voice, so feature 1 also needs its native speech path before phone verification.

### 3. Cloud voices with your own key · needs a decision
ChatGPT quality voices for people who add their own key, alongside Gemini's. The default should feel like ChatGPT's Juniper: open and upbeat, and speaking whatever language the text is in. Juniper itself is only in the ChatGPT app, so the spec picks the closest voice developers can use (likely `marin`) and steers its tone to match.
**Done when:** with a key added in Settings, the voice picker offers the cloud voices with a Juniper like default that sounds open and upbeat, reads each passage in its own language without a language setting, plays at full loudness, and is hidden without a key.
- [ ] Design it (spec): `/architect cloud voices with your own key`

### 14. Mobile voice packs · planned · needs a decision
Make downloaded voices practical on phones, with connection awareness and measured startup time. This follows spec 0001 and supports feature 2.
**Done when:** Android and iOS respect the mobile data choice, run an appropriately sized voice pack offline, and have recorded startup timing on real phones.
- [ ] Design it (spec): `/architect mobile voice packs`
From spec [0001 follow up](../../specs/www/0001-natural-voice-on-device/index.md#follow-up).

## Slice 2: Responsive layout

### 4. Responsive layout for tablets and small windows · in-progress
Desktop and web layouts adapt to tablet widths and to small desktop windows, so controls never crowd each other. Today the Publish button and the "Saved on this device" indicator get pushed out of place in a narrow window.
**Done when:** at every width from a phone to a wide monitor, and on tablets in both orientations, the editor bar, sidebar and lists stay usable with nothing overlapping or pushed off screen.
- [ ] Finish and verify the remaining widths: `/develop responsive layout`
code in `www/src/components`, `www/src/features/notes`, `www/src/features/calendar`, `packages/ultrapeach/ui`

Resume: adaptive note controls, phone calendar layouts and screen bounded menus are built. Check tablet orientations and small desktop windows against the definition of done.

### 15. Android notification startup · planned
Fix the startup permission check that the Android handover reports as refused, then prove calendar alerts on a real phone.
**Done when:** permission can be requested from the running app, refusal is handled, and a scheduled calendar alert arrives on a real Android device.
- [ ] Build it: `/develop Android notification startup`

### 16. Android export destinations · planned
Prove that exports reach the destination chosen in the Android save dialog.
**Done when:** document and media exports save to a chosen Android destination and open with their contents intact, with cancellation handled cleanly.
- [ ] Build it: `/develop Android export destinations`

### 17. ChromeOS build · planned · needs a decision
Resolve the missing processor target reported by the Android handover so ChromeOS has a runnable build.
**Done when:** the app builds for x86_64 Android and launches on ChromeOS, with voice availability made clear.
- [ ] Design it (spec): `/architect ChromeOS build`

## Slice 3: Media kinds

### 5. Four media kinds · in-progress
Books, comics, manga and audiobooks become four distinct kinds, each with its own shelf and its own tools, instead of formats bolted onto one book type.
**Done when:** every item in the library is clearly one of the four kinds, imports land in the right one, and each kind shows only the actions that fit it.
- [x] Design it (spec): `/architect four media kinds`
- [x] Build it: `/develop four media kinds`
  - [x] Kinds everywhere: stored kind, four shelves, New menu, actions per kind, comic and manga switching, adding files (AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-21)
  - [x] Delete and restore a whole series through Recently Deleted (AC-16, AC-17, AC-18, AC-19)
  - [x] Franchises, parts and loose chapters (AC-8, AC-9, AC-10, AC-11)
  - [x] Imports that guess the kind, find parts, merge into series and offer franchises (AC-12, AC-13, AC-14, AC-15)
  - [x] Every new string in six languages (AC-20)
- [ ] Verify it: `/check verify four media kinds`
- [ ] Test it: `/test four media kinds`
spec [0002](../../specs/www/0002-four-media-kinds/index.md)
code in `www/src/features/books`, `www/src/features/imports`, `www/src/features/trash`

### 6. Read aloud where it belongs · needs a decision
Read aloud is offered for books and comics (text you can hear), never for audiobooks, which already have sound.
**Done when:** read aloud appears on books and comics, not on audiobooks, and uses the voice chosen in Slice 1.
- [ ] Design it (spec): `/architect read aloud where it belongs`

### 7. Turn audio into a book · needs a decision
Transcription turns audio into text: for audiobooks (so they can be read along or read as text), and for books you write by speaking.
**Done when:** you can turn an audiobook, or your own recorded chapters, into a readable book whose text stays timed to the audio.
- [ ] Design it (spec): `/architect turn audio into a book`

## Slice 4: Connections

### 8. Your identity: name and @code · needs a decision · GA
You pick a display name; the device adds a short code tied to its key (for example `@lani·4F2K`), so you are unique without an account. Pherus PassID later swaps in a real handle.
**Done when:** you can set your name, see and copy your @code, and the code stays the same on that device and proves it is you.
- [ ] Design it (spec): `/architect your identity`

### 9. People nearby · needs a decision · GA
People using Notables on the same Wi-Fi appear by name automatically, like AirDrop. Nobody is listed to the whole world.
**Done when:** two devices on one network see each other by name and @code within seconds, and you can turn being visible off.
- [ ] Design it (spec): `/architect people nearby`

### 10. Find someone by @code · needs a decision · GA
Anyone not nearby can be found by typing their exact @code; there is no public directory to browse.
**Done when:** typing a valid @code of someone online finds them, a wrong one finds nobody, and partial codes reveal nothing.
- [ ] Design it (spec): `/architect find someone by code`

### 11. Connections screen · in-progress
A Connections screen already lists people from shared notes, online presence, last seen and invitations. Finish saved contacts and adding people from nearby discovery or exact code lookup after features 8 to 10.
**Done when:** you can add a nearby or found person as a contact, see who is online, and remove a contact; the list survives a restart.
- [ ] Design the remaining contacts flow (spec): `/architect connections screen`
code in `www/src/features/connections`

### 12. Share with contacts · needs a decision · GA
Publishing stays public (everyone can see it). Sharing becomes picking specific contacts, building on today's invitation links.
**Done when:** you can share a note with chosen contacts in a couple of taps, they get it when online, and you can revoke one person without affecting the others.
- [ ] Design it (spec): `/architect share with contacts`

## Slice 5: Cleanup

### 13. Code tidy up · needs a decision
A pass over the codebase to remove duplication, dead code and inconsistent patterns, so new features land on clean ground. The remaining list of cleanups belongs with the spec. A first structural pass renamed the reusable packages and separated sidebar window controls, profile display and row rendering; it does not complete this feature.
**Done when:** the agreed cleanups are done, nothing behaves differently, and lint, typecheck, tests and both builds pass.
- [ ] Design it (spec): `/architect code tidy up`

## Next product slices

These are the requested next slices after structural cleanup. Beta remains the project default. Wallet, personal finance, shared content and release features use GA. The wallet follows Apple Wallet with a card stack and scan then review journey. Access protection is optional, using only native Passcode, Face ID or Fingerprint. Real card data and contactless behavior need their own decisions.

## Product polish

### 18. Pluraliti editor polish · planned · needs a decision
Improve the editor toolbar, narrow layouts, touch targets, keyboard behavior and optional haptics using familiar platform conventions.
**Done when:** Editing works on phones, tablets and small windows with keyboard and screen reader support, and haptics respect device capability and the person's preference.
- [ ] Design it (spec): `/architect pluraliti editor polish`

### 19. Library organization and visual polish · planned · needs a decision
Give your library clear names, ordering and grouping, with restrained surfaces and predictable controls inspired by native platform design.
**Done when:** You can find, arrange and filter content consistently across device sizes, existing items keep their identities, and every new label is translated.
- [ ] Design it (spec): `/architect library organization`

## Wallet

### 20. Digital card wallet · in-progress · GA
Scan physical cards into reviewed fields and rendered digital templates, with front and back presentation. Stored data is encrypted; there is no wallet unlock by default. Settings, Account, can enable Sensitive protection.
**Done when:** Native apps support offline capture, editable templates, supported codes, optional protection and password protected backup with target evidence.
- [x] Design it (spec): `/architect digital card wallet`
- [ ] Build it: `/develop digital card wallet`
  - [ ] Manual card through encrypted vault, native route and presentation (AC-1, AC-3, AC-4, AC-5, AC-7, AC-8, AC-15, AC-17, AC-18)
  - [ ] Capture, recognition, templates, codes and image retention (AC-1, AC-2, AC-3, AC-4, AC-6, AC-12, AC-15, AC-17)
  - [ ] Optional protection, native authentication and safe previews (AC-7, AC-8, AC-9, AC-10, AC-11, AC-15, AC-18)
  - [ ] Backup, reviewed restore and recovery (AC-13, AC-14, AC-15)
  - [ ] Languages, accessibility and target verification (AC-1 through AC-18)
- [ ] Verify it: `/check verify digital card wallet`
- [ ] Test it: `/test digital card wallet`
- [ ] Review it (fresh model): `/check review digital card wallet`
- [ ] Document it: `/document digital card wallet`
spec [0003](../../specs/www/0003-digital-card-wallet/index.md)
code in `www/src-tauri/src/wallet`, `www/src/features/wallet` and `www/src/routes/_app/wallet.tsx`
Resume: the user rejected the manual form and forced password experience. Replace it with an Apple Wallet style card stack and scan then review journey. Default access requires no wallet credential; optional protection allows only native Passcode, Face ID and Fingerprint. The existing prototype supports setup, password fallback, masked lists, search, edit, delete, live preview and front/back presentation. Native commands enforce the local main wallet route, foreground sessions, background and idle locking, encrypted audits, revision checks and bounded retry receipts. Desktop key adapters are implemented; the real Linux credential store passed write, read and cleanup. Physical Android testing is now the priority: the ARM64 debug APK installed on a connected TECNO CI6 running Android 13, and the wallet route rendered. Physical testing exposed the unsupported Android desktop focus getter and SELinux denial of hard links. The guard now uses native mobile pause/resume events; Android vault publication uses an atomic no-overwrite rename syscall. The rebuilt APK passed password setup and loaded the empty wallet. Sample card save, presentation, restart and background locking are still awaiting uninterrupted phone testing. Milestone 1 remains unchecked pending Android/iOS key adapters, macOS/Windows target evidence and completed live flow verification. Capture, templates, protection transitions and backups remain later milestones. Browser wallet access is unavailable by design.

### 21. Card autofill and contactless capability · planned · needs a decision · GA
Explore explicit card autofill and supported NFC use separately from visual card storage. You requested CVV or CVC visibility and autofill; storage, reveal behavior and eligible uses still need a decision.
**Done when:** Supported platforms and card schemes are documented and proven, filling requires explicit intent, and unavailable features have clear fallbacks. A scanned picture is never represented as a provisioned payment card or official digital identity.
- [ ] Design it (spec): `/architect card autofill and contactless capability`

## Connections

### 22. Shared note conversations and contact mentions · planned · needs a decision · GA
Add conversations associated with shared notes, with mentions drawn from chosen contacts, names or email addresses. Decide between anchored comments, a note chat and live collaboration before building.
**Done when:** Authorized participants can converse in a note, see mention recipients, remove access and handle offline delivery predictably. Contact access is optional, permission refusal works, and typing a name does not silently invite or expose anyone.
- [ ] Design it (spec): `/architect shared note conversations`

### 23. Nearby note drop · planned · needs a decision · GA
Send selected notes between nearby Notables devices with a clear offer and acceptance flow, building on People nearby and Share with contacts. Explore NFC as a pairing gesture where supported.
**Done when:** Two devices can discover each other, accept a selected transfer and confirm receipt, with visibility controls, rejection, interruption and permission refusal handled. Unsupported devices have a usable fallback.
- [ ] Design it (spec): `/architect nearby note drop`

## Money and calculations

### 24. Income, expenses and calculation sheets · planned · needs a decision · GA
Track income and expenses in a list, ledger or note, with categories, editable budget suggestions and calculation tables. Start with manual entries before deciding on imports or account connections.
**Done when:** You can record and correct income and expenses, compare totals with a budget, switch presentation without changing records, and use defined formulas with clear currency, rounding and error behavior.
- [ ] Design it (spec): `/architect income expenses and calculation sheets`

## Release

### 25. Store release readiness · planned · needs a decision · GA
Prepare evidence for Google Play, App Store Connect and selected desktop stores as features settle. Review permissions, privacy, sensitive data handling, distribution requirements and shared content safeguards.
**Done when:** Each selected store has a current checklist backed by tested app behavior, accurate disclosures, required signing and packaging, and review materials. Approval remains a store decision.
- [ ] Design it (spec): `/architect store release readiness`

### 26. Settings and navigation refresh · planned · needs a decision
Refine Settings, bottom tabs and icons with a coherent Apple inspired direction using existing tokens and TanStack app capabilities.
**Done when:** Account and sensitive controls are easy to find, navigation and icons are consistent across sizes, and accessibility, platform conventions and six languages are verified.
- [ ] Design it (spec): `/architect settings and navigation refresh`
From spec 0003.

## Current resume points

Features 1 and 5 are built but still need `/check verify`, then `/test`. Feature 1 also needs the Android speech fix recorded in the handover. Feature 2 needs release readiness before verification. Feature 4 needs width checks and remaining layout fixes. Feature 11 needs its remaining contacts design. Listening still needs a real key check for cloud speech, remaining translations are deferred, and Widgets still needs iOS integration. Neither governing spec is marked Assumed.

## Deferred
Kept so the plan stays honest; not in this pass.
- **Translate the remaining screens**: invoice editor, importers, reader labels
- **Whisper while recording**: streaming transcription in the native apps · needs a decision
- **iOS home screen widget**: generate the iOS project, build in the widget and verify it on a real device · needs a decision
- **Social post templates**: sized for TikTok, X and Instagram · needs a decision
- **Freeform canvas**: shapes, stickies and images · needs a decision
- **Pherus PassID**: optional sign in, cloud backup, and a relay so sharing works when people are not online together (ADR 0005, 0006) · needs a decision · GA
- **Learning**: lessons, flashcards and tutoring notes · needs a decision
- **Natural voice in the browser**: the same voice pack on the web build with onnxruntime-web, stored in the Origin Private File System · from spec 0001 · needs a decision
- **Stop writing old book fields**: drop `format` and `direction` once every app version reads `kind` · from spec 0002 · needs a decision
- **Series screen and Move to Volume**: a page per series, and moving loose chapters into a volume · from spec 0002 · needs a decision
- **Model delivery between devices**: revisit if download demand warrants it, from spec 0001 · needs a decision
- **Model download abuse controls**: revisit if abuse appears, from spec 0001 · needs a decision
- **Natural Swahili voice**: when an open Swahili voice with a license that allows commercial use appears · from spec 0001 · needs a decision

## Legend

**The decision box.** Each feature has one box whose label ends with `(spec)`; skills find it by that suffix. Every other box is an execution box.

| State | Set by | The feature shows |
|---|---|---|
| `planned` · needs a decision | `/scope` | one box: `Design it (spec): /architect <feature>` |
| `in-progress` (designed) | `/architect` | `Design it` ticked, spec linked, `Build it` with 2 to 5 milestones, then `Verify it` and `Test it` (GA adds `Review it` and `Document it`) |
| `in-progress` (building) | `/develop` | milestones tick one by one; code pointer filled |
| `done` | you, when you decide; `/sync` reconciles | the boxes you ran ticked |

- **Next step** is the first unticked box.
- **needs a decision** means run `/architect` first; the tag drops once the spec exists.
- **Status** `planned` → `in-progress` → `done`, plus `existing` (built before this workflow) and `dropped` (kept for history).
- **`· GA`** beside a heading means that feature also gets a fresh model `/check review` and `/document`.
- Build tasks live in each spec's `## Build plan`, not here.
