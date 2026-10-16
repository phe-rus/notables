# Where Notables stands: Apple Notes parity and store compliance

16 October 2026, after `v0.2.0` reached TestFlight and Google Play internal
testing and both store pages were filled in as drafts. This is the
assessment the plan in [STAGES.md](../STAGES.md) ("Queued from the 16
October review") is built from.

## Compared with Apple Notes

Apple Notes is the bar: Notables must be at least as good wherever they
overlap, and better everywhere else.

| Area | Apple Notes | Notables today |
|---|---|---|
| Sync | iCloud, instant and invisible | Linked devices built; notes arriving both ways not yet proven |
| System reach | Lock Screen, Control Center, Quick Note, Siri, Shortcuts, Spotlight, share sheet, widgets | No share extension, Siri or Shortcuts; iOS widget never compiled |
| Capture | Document scanning, search inside photos, tables, math, call and audio transcription | Recording with on-device transcription, handwriting; no scanning or tables |
| Polish | Years of Apple-only tuning, Apple Pencil, full accessibility | Strong design (Hino), young; device testing has gaps |
| Collaboration | Live shared notes through iCloud | Only while both devices are online; no relay yet |
| Security | Locked notes with Face ID | The Lock is designed (spec 0004) but switched off |

### What Notables already does better than Apple Notes and most others

- Every platform: iPhone, iPad, Android, macOS, Windows, Linux and the web
  (through the phone, storing nothing on a server).
- Local first with no account at all.
- Writing that becomes books: parts, chapters, page turns, export to EPUB,
  PDF, Word and CBZ.
- Comics, manga and picture books drawn in the app and read in proper
  readers.
- Audiobooks with read-along, on-device Whisper and an on-device natural
  voice.
- Invoices, receipts and quotes clients can verify (signed seal, QR check).
- Calendar with holidays, birthdays and trips; a wallet; publishing a note.
- AI with the person's own key, off by default.
- Open source under MIT.

### What it needs to equal or beat Apple Notes

1. Sync that feels invisible: linked devices proven, then a relay when
   devices are not online together.
2. System integration: share extension ("Add to Notables"), widgets on both
   phones, Shortcuts and Siri on iOS, quick capture.
3. Capture basics: document scanning, tables, search inside images and
   handwriting.
4. The Lock, for locked notes and the wallet.
5. A speed and accessibility pass: VoiceOver and TalkBack, Dynamic Type
   everywhere, fast startup on low-end Android.
6. Finished translations, and real-device testing of everything marked
   untested in AGENTS.md.

Against Notion, Obsidian, Bear, Goodnotes and Google Keep: Notables wins on
privacy, platforms and breadth; they win on maturity, plugins and templates
(Notion, Obsidian), pure writing calm (Bear) and handwriting depth
(Goodnotes).

### Potential and the main risk

Notables can be the one private place for everything a person writes,
reads and makes, on every device, without an account. Nobody holds that
position: Apple is locked to Apple, Keep is shallow, Notion is cloud first
and needs an account. Creators (books, comics, audiobooks), freelancers
(verifiable invoices) and Android or Windows people who want Apple-quality
design have no good private option today.

The main risk is breadth: so many features that core note taking feels less
polished than Apple Notes. Make writing, sync and capture flawless first,
and let the rest be depth people discover later.

## Store compliance

Not a legal certification; these are the known gaps.

1. AI and third parties. With AI on, notes go to Anthropic, Google or
   OpenRouter. Apple 5.1.2(i) wants explicit consent before personal data
   reaches a third-party AI. Needed: a consent screen naming the provider
   and what is sent, and the App Privacy and Play data safety answers
   reviewed for it. The pherus.org privacy policy already discloses it.
2. Published notes are user-generated content (Apple 1.2, Google UGC
   policy): report, block and filter in the app, plus a published contact.
   The terms (Notables section, 16 Oct) now set the rules, a 24-hour review
   and support@pherus.org; the app still has no Report on a published page.
   Apple's age rating says no user-generated content while `listing.md`
   says yes: settle it, and expect a higher rating if it is yes.
3. Data deletion. Now on pherus.org (privacy policy, section 4): use that
   link for Play's data deletion question.
4. Google's crawler got 403 on the privacy link. pherus.org answers 200 to
   Google's user agents and robots.txt allows it, so the block is most
   likely Cloudflare Bot Fight Mode on Google's real addresses: a dashboard
   setting (Security, Bots) for the owner.
5. Encryption export: France stays excluded until the French declaration
   is filed; every build asks the questions until an encryption document is
   uploaded.
6. Accessibility: not audited; the App Accessibility page in App Store
   Connect is empty.
7. The wallet holds IDs and passports, encrypted on the device; ship the
   Lock before promoting the wallet.
8. In order: privacy policy and terms on pherus.org (updated 16 Oct,
   governing law Uganda), Apple App Privacy, Play data safety, ratings and
   audience, no ads, no purchases, store text naming no other apps.
