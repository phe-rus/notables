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

- **Logo direction** (decided 9 October): the curling honey page read as
  cartoonish. The mark is now a sheet of warm paper with a quiet dog-ear,
  the ink N and a honey full stop; orange only in the dot. Full-bleed for
  iOS (`icons/source/app-icon.svg`), framed for desktop, web and the in-app
  mark (`app-icon-desktop.svg`). Android keeps its adaptive N on paper.

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

## Owner's direction, 17 October 2026

The owner's follow-up after testing changes the home to a Workspace folder
manager, asks for inset note cards, consistent icons and scrollable controls,
real camera scanning, side-by-side photos, complete link metadata and measured
smoothness. Gallery previews show opening note content, folder names drive back
labels, and a default More button replaces the separate compose control.
Artifacts remains on Workspace and is removed from the sidebar. Circles now lives
there, with direct Workspace back links. On mobile, only Workspace shows the
sidebar toggle; wider layouts retain their sidebar controls. Settings is grouped into compact device, personalization, writing/tool
and app/privacy sections. See [the refinement record](reviews/2026-10-17-writing-refinement.md).


Device linking and management come first. The owner tested v0.2.2:
Android can approve the iPhone, but Android cannot finish joining the
iPhone's space after the four words. Android reports a connection error.
Put Connected Devices directly below the account card, keep Linked Devices
for browsers, mask the space and current device IDs under No account needed,
and provide a way to disconnect without deleting local notes.

After that, work through the writing changes below. These are the owner's
requested direction. The [17 October checkpoint](reviews/2026-10-17-writing-checkpoint.md)
records implementation, phone evidence and the remaining boundaries.

1. [ ] Fix the iOS editor toolbar when the keyboard opens. Android already
   places it above the keyboard; on iOS it is hidden and another bar appears.
   Use denser Hino controls, reduce the gaps, and make more editing actions
   available. The editor navigation title shows the note title, or New Note,
   with a small scrolling title preview rather than All notables.
   Include text styles, tabs where useful, bold, italic, subscript,
   superscript, links, lists, checklists, pen and image or file attachments.
   Link previews show compact metadata and an image. Notes with images
   show their first image as a thumbnail in the list and gallery.
2. [x] Introduce folders as the Workspace, with editable default folders
   Writings, Notes and Tasks. Each can be renamed or deleted. The Workspace
   heading has an add folder button. Hold a folder to rename it in the
   sidebar; tapping opens its contents or details. Keep Recently Deleted.
3. [ ] Unify writing, plans and learning as notes with tags and selectable
   formats. Replace the All notables entry with Writings and its icon. Allow
   choosing the format when creating a note and changing it later; explore
   automatic detection without surprising conversions.
4. [ ] Add list and gallery views to folders. Beside the compose button,
   More offers the other view, Create Note, Select Notes, Sort By, Group by
   Date and View Attachments. Remove the separate Select text button.
   Date groups include Today, This Week, Previous 30 Days and This Year;
   grouping is optional and on by default in the compact list refinement. Define nonoverlapping date
   boundaries and the older notes group before implementation.
   Notes can move between folders. Support text and document scanning,
   drawing, and locking a note through the shared Lock design (spec 0004).
5. [x] Put Books under Artifacts alongside Calendar and Invoices. Remove
   Published from the Workspace. Move Connections to Workspace Artifacts as Circles (17 October revision),
   for people who can receive selected notes in their Notables. Keep Recents
   with a small fixed maximum, replacing older entries. Opening Settings
   closes the sidebar on layouts where it overlays the page.
6. [ ] Improve the editor's audio and sharing toolbar with Hino. Fix
   transcription failing with an error about audio needing 32 bit float
   samples. Add a table of contents, tasks, reminders, attachments and
   calculations. Calendar, reminders and invoices should work together.
7. [x] Add a spreadsheet note format for budgets: a full table editing
   surface with formulas and calculations, rather than only an embedded
   table. Define supported formulas, currencies and editing behavior first.
8. [ ] Support multiple image attachments, rearranging, resizing, removing,
   replacing and editing images. Default their display to aspect-video.
9. [ ] Simplify sharing to links, scanning a person, entering an ID and
   platform sharing such as AirDrop, Quick Share and Bluetooth. Finish media
   transfer between the person's devices on the same local network, then
   decide which nearby transports each platform can actually support.

## Queued from the 16 October review (in this order)

From [the parity and compliance review](reviews/2026-10-16-parity-and-compliance.md).
A comes first because it stands between `v0.2.0` and any public release;
B is what makes Notables equal to Apple Notes; C runs alongside.

A. Before a public release
1. [ ] Check `v0.2.0` on both phones (TestFlight, Play internal), then
   promote it to Play closed testing.
2. [ ] Report on a published note's page, takedown on our side, and
   stopping a device that publishes abuse from publishing again.
3. [ ] AI consent: a screen before the first request naming the provider
   and what is sent; review App Privacy and Play data safety for it.
4. [ ] Settle user-generated content in the Apple age rating and
   `listing.md`; add the two extra App Privacy data types there.
5. [ ] Owner, in the dashboards (deferred, to do eventually):
   - Cloudflare: turn off Bot Fight Mode for pherus.org (Security, Bots),
     or add a rule letting crawlers reach `/legal/*`. The privacy page
     answers Google's user agents with 200 from here, so the 403 Google
     saw is most likely that setting blocking Google's real addresses.
   - Play Console: give `https://pherus.org/legal/privacy-policy` as the
     data deletion link (its section 4 explains deleting Notables data).
6. [ ] Accessibility pass (VoiceOver, TalkBack, Dynamic Type) and the App
   Store accessibility labels.

B. Equal to Apple Notes
1. [ ] Linked devices proven end to end on the release builds (`v0.2.2`
   fixed the room address), then media: photos, recordings, drawn pages
   and covers don't travel yet. Spec 0005 sends media only over direct
   links (AC-10, AC-21), so build the same-network direct link first; then
   a relay for devices that are not online together.
2. [ ] The Lock (spec 0004), before promoting the wallet.
3. [ ] Share extension and Android share target ("Add to Notables"),
   widgets on both phones, Shortcuts and Siri.
4. [ ] Document scanning, tables, search inside images and handwriting.
5. [ ] Speed on low-end Android; finish the translations.

C. Alongside
1. [ ] Owner's bugs: Enter after a heading on phones; the desktop window
   can't be dragged and its corners aren't rounded.
2. [ ] Real-device checks of everything AGENTS.md marks untested.

## Queued from the 15 October review (in this order)

The owner's order: Android smoothness and audio, then Hino, then a fresh
start after onboarding, then sync (spec 0005, accepted), then optional
PassID, the person's own cloud (Google Drive, iCloud), people and
AirDrop-like sharing, the torrent-like network; desktop packaging (deb
through apt, Windows) last. Notables follows Apple Notes closely.

1. [x] **Android smoothness and audio** (15 Oct, `91f1982`): media streams
   through the local media server, large saves in pieces, read aloud adapts
   its steps per device, long books paginate per chapter, PDF import finds
   paragraphs and chapters (`6c3c353`).
2. [x] **Hino** (15 Oct, `2c7c53d`) replaced `packages/ultrapeach`; dates
   and times use Hino's CompactDatePicker and CompactTimePicker
   (`75bdbf6`, `3297795`); no native date or time input remains.
3. [x] **Start fresh** (15 Oct): setup's last step offers Start with
   examples or Start fresh (nothing is written); Settings > Notes list
   removes the examples to Recently Deleted, with Undo, or adds them back
   (`features/onboarding/lib/examples.ts`; older devices find them by title).
4. [x] **Keyboard awareness and read mode** (15 Oct): notes open for
   reading on touch screens (`5214157`); the caret stays above the
   keyboard and tools (`1f341d3`). Checked on Android, not yet an iPhone.
5. [x] **Hold and slide to select** on Android (15 Oct, `6b24cac`).
   Optional later: iOS's two-finger drag, and sliding down the selection
   circles in Select mode.
6. [x] **Drawing and handwriting** (15 Oct): handwriting has Done and
   fingers scroll after it (`d5e9343`); photos are media files, not
   inlined, so they survive restarts (`543dcf6`); erasing a note deletes
   all its media (`59e63a0`); a daily sweep deletes media unused for a
   week (`4773b1e`); shared notes send their media (`870dddf`, not yet
   tried between two real devices).
7. [ ] **Slash commands** for blocks and options, **hashtags** for tags,
   and a way to turn a line into a reminder.
8. [ ] **Attachments, as in Apple Notes**: scan text, scan documents, take
   a photo or video, choose a photo or video, record audio, attach a file;
   scan and fill in details automatically.
9. [ ] **Formatting**: alignment, bulleted, numbered and checklists,
   tables, and a spreadsheet note kind.
10. [ ] **Layouts** for tablets, foldables and ChromeOS.
11. [ ] **Folders** to organize notes.
12. [ ] **Locking** with a passcode, Face ID, fingerprint or face unlock
    (the Lock, spec 0004).

### Owner's notes, 15 October evening (to slot into the order above)

- **Reading and listening**: highlighting in books is hard; going back a
  little to hear a missed part is hard; the seek bar still isn't Apple-like.
- **Natural voice only**: drop the device's own voices (too poor to use);
  read aloud needs a downloaded voice pack, and a freshly downloaded pack
  becomes the default voice on its own.
- **Images in notes**: touch and hold to replace or edit; resize and crop.
- **iOS keyboard**: the keyboard hides the bottom tools (Aa, checklist,
  image, voice); the bar needs to ride above it, plus the additions in 8.
- **Hino everywhere**: some components still follow the old look.
- **Wallet** is unfinished; **Privacy & Security** and the Lock (12:
  passcode, Face ID, fingerprint, face unlock, unlocking settings) are
  not done at all.
- **Arabic (RTL)**: the sidebar and layouts don't mirror or adjust well.
- **Pop-ups and the keyboard**: a dropdown with a text field (and its list)
  hides behind the on-screen keyboard; fine when the keyboard is closed.
  Pop-ups must place themselves in the visible area above the keyboard.
- **Spreadsheet note kind** (expands 9): a grid like Excel for data entry,
  aimed mainly at budgets: a year of income and spending by month and
  category, with totals.

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


### Latest owner refinement, 17 October: Personal, Finances and ChromeOS

Personal replaces the Workspace Artifacts label. Finances replaces Invoices
and serves personal use and business use with optional tax ID. One automatic
ledger combines documents with confirmed income and expenses. Receipt camera
and image imports and pasted mobile money message review are implemented;
background SMS monitoring remains to be designed and verified. Folder colors,
a smaller Workspace title, nested New Note popup, wide editor title and blank
library drafts are implemented. Tab roots omit mobile back arrows.

The Chromebook target is the Android app in ARC, not the Linux desktop app.
ARM translation crashes on this Dell; the native x86-64 APK opens. Continue
native linking, keyboard/mouse, resize and tablet-layout verification. Keep
the TECNO space when joining; then verify both-direction changes and which
installed device serves a linked browser. See the latest refinement record.


17 Oct checkpoint: native Chromebook/TECNO sync was checked both ways. Known
peer history and compact device/profile components are implemented. The latest
Settings layout redesign was rejected and reverted; inspect the actual linked
browser and installed native screens before further refinement. Temporary APKs
from that rejected layout must not be installed.

Owner clarification before push: preserve web Settings layout. Refine compact
component usage on installed apps. Workspace must remain the original vertical
stack with Personal below folders. Remote Disconnect must target the other device
from either app and remains the first unfinished device task, spec 0005 step 7.
