# Stages

The plan from here, one stage at a time. Any session, human or AI, resumes
from the first stage that isn't done. When a stage finishes, tick it here,
update **Status** in `AGENTS.md`, and record lasting decisions in `docs/adr/`.

## Decisions so far (8 to 9 October 2026)

- **UltraPeach** is the design language, Notables' answer to Liquid Glass or
  Material 3, built for this app and later ones. It lives in
  `packages/ultrapeach/` as `@ultrapeach/tokens` and `@ultrapeach/ui`.
- **Blush** (the iPhone 15 pink, `#f2d4d7`, text `#9e3b4f`) is the default
  accent and the brand color. Honey and the others remain choices.
- The app package (`www/`) is named `notes`; the repo root is `notables`.
- Guiding question for every surface: what would Apple do in 2026? Then add
  our own touch. Borrow shadcn's idea of components you own and can read,
  not its look.
- Wallet and Vault share one security model (9 October): off by default,
  then PassPin, a password, or the device's Face ID, fingerprint or
  passcode. Phone tabs: Notes, Wallet, Invoices, Settings.
- Everything stays on the device and is encrypted from the start. Sign in,
  cloud and relays are optional additions, never requirements.

## Open questions

- **Logo direction.** The current mark reads cartoonish. Needs a brief:
  mood words, what to keep (the "N", the folded corner), and references.

## Stage 1: UltraPeach foundation · in progress

- [x] Move tokens and components into `packages/ultrapeach/`, renamed.
- [x] Blush accent, default everywhere, contrast tested in both schemes.
- [x] Dynamic Type text styles as `text-*` and `leading-*`, named as
      SwiftUI names them, scaling with the text size setting; about 300
      one-off sizes converted.
- [x] Glass materials read theme tokens (they ignored the chosen theme).
- [x] Saved theme, accent, text size and platform applied before the first
      paint (`features/settings/lib/appearance-boot.ts`).
- [x] Corner radius scale (`xs` to `5xl`, `sheet`); 128 one-off radii
      converted, 18 and 22 px snapped to 20 and 24.
- [x] `data-theme` works on any element, with `color-scheme`; the recorder
      uses it instead of 18 copied dark hex values.
- [x] Remaining one-off font sizes: 14 px (84 uses) became `subheadline`,
      the iOS row and button size; near matches snapped to their styles.
      The 20 left are content or deliberately dense (artwork, invoice
      paper, calendar month and year labels, tab bar labels, large input
      text). Most remaining hex colors are content too and stay.
- [x] Blush control fills: controls use rose `#d16988` (3:1 on every light
      ground) while text keeps `#9e3b4f`; a non-text contrast test guards it.
- [x] CSS layers: editor and book reader styles moved into `components`.
- [x] SwiftUI names and one folder per control: `Switch` is `Toggle`,
      `Select` is `Picker`, choice controls split into `segmented-control/`,
      `toggle/` and `swatch-picker/`.
- [x] `Section` and `LabeledContent`, promoted from Settings.
- [ ] Still missing: Menu, Alert, NavigationSplitView.
- [x] Platform awareness built in: `data-os` variants for iOS, Android,
      macOS, Windows and Linux (Android keeps Material conventions where
      people expect them, such as back behavior and ripple-free but solid
      bars).
- [x] Tab bar, the iOS 26 way (`ui/src/components/tab-bar`): a floating glass bar of up to five tabs,
      Search as its own round button at the trailing end, an accessory
      slot above it for the mini player, shrinking while you scroll down
      and returning when you scroll up. Android gets a flush bottom bar.
- [x] `packages/ultrapeach/AGENTS.md`: the rules, so any AI keeps the
      language consistent.

## Queued from the 9 October review on the phone (in this order)

1. [ ] **Settings, iOS style, with a Lock section** (owner's priority). One
   lock for every secret place: Wallet, Vault, and other protected items.
   Methods, offered only where the device really has them: Face ID,
   fingerprint, device passcode; our own PassPin or password; a passkey
   bound to this device, so only this device unlocks. Off by default; data
   is encrypted either way. Decided 9 October: the Lock always covers
   secret places (Wallet, Vault, notes marked locked), with a separate
   optional "lock the app on open"; turning it on gives a one-time recovery
   key to keep safe (without it and the device, locked data stays locked).
   Needs a short security design first (key
   wrapping per method, recovery, what "must be this device" means), then
   native adapters (Android Keystore with user authentication, iOS
   Keychain access control, Windows Hello, macOS LocalAuthentication).
2. [ ] Wallet cards that look and feel real, per kind: bank (chip,
   contactless mark, network wordmark from the number), national ID
   (photo area, emblem band, MRZ strip), passport (data page), electricity
   (meter styling), SIM (chip outline, ICCID). Our own drawings; no copied
   logos or brand artwork.
3. [ ] Fix: swiping a card opens it instead of bringing it to the front.
4. [ ] Test scanning on the phone (high resolution camera, card guide,
   contrast, MRZ for passports and IDs, ID barcodes, SIM ICCID and PUK).
5. [ ] NFC: read contactless bank cards (EMV) where the device has NFC.
6. [ ] Calendar: pinch to zoom on the phone, then an Apple Calendar pass.
7. [ ] The notes list on phones: Apple polish.
8. [ ] Drawer: the first open after launch drops one long frame.

## Stage 2: Smoothness and the Rust core

Make lag invisible: never block a frame, answer instantly, finish later.

- Move heavy work to Rust: full text search index, thumbnails and image
  decoding, PDF and EPUB parsing, import scanning, OCR where native is
  faster.
- Optimistic UI everywhere; skeletons only after 150 ms; virtualized long
  lists; prefetch on hover and press.
- Measure first: frame timing and interaction latency on the TECNO phone.

## Stage 3: Code organization

- One naming guide for `www/src`, after SwiftUI's clarity: a feature is a
  noun (`wallet`, `vault`), its screens end in `-screen`, its parts are
  named for what they are, its state in `store/`, its rules in `model/`.
- A short `AGENTS.md` in every feature: purpose, entry points, invariants,
  how to test. Routes stay thin.
- Split the remaining oversized files (start with `books-list.tsx`,
  `setup-flow.tsx`, `calendar-screen.tsx`).

## Stage 4: Wallet, rebuilt

Apple Wallet's stack, add and present journeys, with cards of every kind
(bank, ID, electricity, TV, SIM, membership, other) as useful digital
copies: codes that scan, details you can copy. Finish the gaps in
`www/src/features/wallet/AGENTS.md` and spec 0003.

## Stage 5: Settings

Grouped lists like iOS Settings, search inside Settings, plain words,
nothing a person doesn't need. OS aware: system theme, text size, reduce
motion, language.

## Stage 6: Vault

Passwords, passcodes, PINs, two-factor codes (TOTP), accounts and secure
notes. Encrypted from the start with a device key; passwordless by
default, with optional PassPin, password, and Face ID, fingerprint or
passcode where the device offers them. Finds secrets in notes and offers
to move them. Autofill through each OS's own provider (iOS Credential
Provider, Android Autofill Service, browser extension). Needs its own
spec and ADR before any code.

## Stage 7: Writing everywhere

The rich text editor aware of each OS (keyboard, selection, text
services), edit and preview modes, export to PDF and every current format,
and protection options: block screenshots and screen recording where the
OS allows it (Android `FLAG_SECURE`, Windows display affinity, macOS and
iOS where possible). Code protection raises the bar but cannot make a
client app impossible to inspect; user data stays safe by encryption.

## Stage 8: Capture from anywhere

Save part of a web page or a link into a note from the share sheet (iOS
Share Extension, Android share target, desktop browser extension). With AI
turned on, add a summary. Scan documents and receipts into notes.

## Stage 9: Canvas, people and conversation

An infinite canvas in the spirit of Freeform. Contacts you can tag in notes
with `@`, and conversation beside a shared note.

## Stage 10: Sync and backup

Builds on ADR 0003, 0005 and 0006. Peer to peer as today, a relay for when
peers aren't online together, swarm transfer for large media, Tor as an
option. Encrypted backup to Google Drive, iCloud or PassID.

## Stage 11: Money

Invoices improved, budgeting, more formats, and receipt scanning that fills
in the details.

## Stage 12: Brand

A new mark: calmer, legible at 16 px, not cartoonish. Icons made per
platform: iOS 26 layered icons (light, dark, tinted, clear), Android
adaptive and themed monochrome, macOS, Windows and Linux.

## Stage 13: Stores

Ready for each store's rules before submitting:

- **App Store**: privacy manifest (`PrivacyInfo.xcprivacy`), privacy
  labels, export compliance for encryption, in-app account deletion once
  accounts exist, review notes for P2P and Tor.
- **Google Play**: Data safety form, current target SDK, 16 KB memory page
  support for native libraries (Whisper, ONNX Runtime).
- **Microsoft Store**: MSIX packaging and signing.
- **Mac App Store**: sandbox entitlements. **Linux**: Flathub.
