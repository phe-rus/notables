# Store listing

The words and settings for Google Play and the App Store. Keep both stores
in step with this file. Limits are in brackets.

## Shared

- **Tagline:** Anything notable, always with you.

- **Category:** Productivity (secondary on the App Store: Books)
- **Privacy policy:** https://pherus.org/legal/privacy-policy (section 4 covers Notables; [docs/PRIVACY.md](../PRIVACY.md) is the long form)
- **Support / website:** https://github.com/phe-rus/notables
- **Marketing URL:** https://notables.pherus.org
- **Support email:** support@pherus.org (company and privacy: pherus@pherus.org)
- **Phone:** +256772769734
- **Price:** free, no ads, no in-app purchases
- **Copyright:** 2026 Pherus

## App Store

**Name** [30]: Notables by Pherus

**Subtitle** [30]: Anything notable, with you

**Promotional text** [170]:
Notes, books, plans and invoices in one beautifully made app. Write, draw,
record, read and publish, all on your device, offline, with no account.

**Keywords** [100]:
notes,journal,diary,writing,books,reader,audiobook,comics,invoice,calendar,planner,handwriting

**Description** [4000]: the full description below.

## Google Play

**App name** [30]: Notables by Pherus

**Short description** [80]:
Notes, books and plans. Yours to make. Yours to keep. No account needed.

**Full description** [4000]: the full description below.

## Full description

A thought. A plan. Your next chapter.

Notables brings your writing, reading and everyday plans together. Capture a quick thought, sketch an idea or turn a collection of notes into a book. Start without an account, and keep writing offline on your phone or tablet.

Make room for your ideas.
Write notes, journals, stories and checklists. Add headings, links, photos, recordings and handwritten sketches. Arrange your notes in folders, choose their colours and browse in a list or gallery.

Give your words another chapter.
Gather your writing into books with parts and chapters. Import EPUBs, PDFs, comics and audiobooks. Read at your own pace, listen while you do something else, and return to the stories you want to keep close.

Put your day on the page.
Keep plans, reminders, birthdays and trips together. Move between day, week, month and year views. See public holidays for your country, or describe a plan in a sentence to get started.

Keep the details that matter.
Organise invoices, receipts and quotations. Create documents with a signed seal and a QR code that lets the recipient check them. Keep reference details for your bank, identity, electricity, SIM and membership cards in Wallet, encrypted on your device and protected by device authentication. Wallet cards stay on the device where you add them.

Speak it. Sketch it. Keep it.
Record audio beside your writing. Transcribe on your device, or listen to your words read aloud. Draw handwritten pages, comics and picture books, with strokes you can return to and edit.

Choose what travels with you.
Link your devices while they are online. Open the web through a linked device, or share selected notes with other people. Export your work as PDF, EPUB, Word, Markdown and more. Recently Deleted gives you seven days to recover deleted items.

Your library starts on your device. AI help is optional and uses a provider key you choose to add. There are no ads and no account is required to start.

Available in English, French, Spanish, Portuguese, Swahili, Arabic and Chinese.

Voice features may need a model download. Linking, sharing and online services need a connection. Available features depend on your device.

Made by Pherus. Open source at github.com/phe-rus/notables

## Questionnaires

Reviewed 18 October 2026. The marketing copy above is saved in the Play
Console draft. The questionnaire entries below remain a release checklist,
not evidence that the current console answers have been corrected.

Published notes can include text, photos and audio. Device introductions
and encrypted sync traffic pass through the signalling service. Optional
AI sends the requested content directly to the chosen provider using the
person's own key. Wallet contents stay on the device.

Android's bundled ML Kit text recognizer processes card images on the
device, but its SDK collects diagnostics and usage analytics, including
per-installation identifiers, device and app information, performance,
API configuration, input/output sizes, event types and errors. Do not claim
that the app has no analytics. Google's disclosure says this telemetry is
encrypted in transit and is not shared with third parties. It does not
say that the card image or recognized text is uploaded.

Source: [ML Kit data disclosure](https://developers.google.com/ml-kit/android-data-disclosure).

### Google Play: Data safety

- Collects user data: **Yes**. Published content and the bundled SDK's
  telemetry must both be accounted for.
- Review **Other user-generated content**, **Photos**, **Audio files**,
  **Device or other IDs**, and **App info and performance** against the
  actual form. Map diagnostic events to the applicable data types and
  analytics purpose before submitting.
- Publishing is optional. Do not assume every SDK telemetry field is
  optional just because scanning is an optional feature.
- Published content can be removed by unpublishing in the app; support
  contact: support@pherus.org. Confirm the live deletion page and privacy
  policy describe the SDK before public testing.
- Account creation: **No account**.
- Pending: console questionnaire correction, privacy policy alignment and
  final verification of the release artifact's SDK inventory.

### Google Play: Content rating (IARC)

- Category: **Utility, Productivity, Communication or Other**.
- Violence, sex, language, drugs, gambling: **No** to all.
- Users can interact or exchange content: **Yes** (shared notes and public
  pages). Shares location: **No**. Digital purchases: **No**.
- Expected result: Everyone / PEGI 3, with "Users Interact".

### Google Play: Target audience and content

- Target age groups: **13-15, 16-17, 18 and over** (not under 13, so the
  Families policy does not apply). Appeals to children: **No**.
- Ads: **No**. News app: **No**. Government app: **No**. Financial
  features: **None** (the wallet only stores copies of cards).
- Health: **No**. COVID-19 tracing: **No**.

### App Store: App Privacy

- Published notes can contain **Other User Content**, **Photos or Videos**,
  and **Audio Data**, for **App Functionality**, without tracking. Verify
  these against the iOS archive and current App Store Connect answers.
  Android ML Kit telemetry does not by itself establish iOS collection.

### App Store: Age rating

- Every content question: **None**. Unrestricted web access: **No**.
- User-generated content: **Yes**. Messaging or chat: **No**. Gambling,
  contests, loot boxes: **No**. Parental controls, age assurance: **No**.
- Expected result: 4+ or 9+ by Apple's calculation; accept what it gives.

### App Store: Other fields

- Category: Productivity, secondary Books. Price: free, all territories
  (France blocked until the encryption declaration is filed).
- Sign-in required for review: **No**. Review notes: "No account is required. Writing and reading work offline. Linking,
  sharing and optional AI need a connection. Wallet uses device authentication."
- Contact for review: support@pherus.org, +256772769734.

## Release notes template

What's new in this test: [one or two plain sentences]. Tell us what you
think from TestFlight or by email at support@pherus.org.
