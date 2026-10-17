# Writing workspace checkpoint, 17 October 2026

The first device linking fix is committed and pushed as `6b2d9d3`.
The larger writing changes described here are the next implementation checkpoint.
No new TestFlight or Play release has been tagged.

## Implemented

- Native Connected Devices below the account, separate browser Linked Devices,
  masked IDs and disconnect preserving local notes. Android can replace an
  existing space credential instead of failing its create-only secure-store write.
- Synced folders with editable Writings, Notes and Tasks defaults, add/hold rename,
  safe delete and move. Tombstones prevent concurrent renaming or first-run
  migration from resurrecting a deleted folder. Orphaned notes remain visible.
- List/gallery, optional date groups off by default, sort/select/attachment filter
  in More, first-image thumbnails, manual and hashtag tags, five unpinned Recents.
  Books is under Artifacts; Connections is Circles in Settings.
- Actual note title in the editor, dense formatting and insert menus, subscript,
  superscript, alignment, tables with row/column controls, live contents outline,
  checklists, files and multiple images. Images support preset widths/ratios,
  fit, move, replace and remove. Existing drawing editing remains available.
- Visual viewport toolbar positioning and disabled iOS accessory bar. Android
  transcription decodes JSON byte arrays before validating float32 alignment.
- Note reminders and invoice payment reminders carry a structured source link.
  Invoice reminders start from the due date and reuse an existing linked event.
- Spreadsheet format preserves the rich document when switching. Cells sync
  independently; bounded formulas support references, ranges, arithmetic, SUM,
  AVERAGE, MIN, MAX, COUNT, ABS and ROUND. Currency formats and CSV export included.
- Explicit link preview insertion with bounded Worker metadata retrieval and
  public-address validation; scan text/document entry points reuse native OCR.
- Encrypted media through direct sessions, browser upload/download and native
  direct-link negotiation with relay fallback. Browser sharing operations use
  the phone's credentials through encrypted RPC. Fresh linked-browser storage
  stays in memory; no IndexedDB is opened before admission.
- Android system share chooser adapter added. A generic share operation is not
  presented as proof of AirDrop, Quick Share or Bluetooth transport.

## Evidence

On the TECNO CI6 through Wi-Fi ADB and real Android input: folder creation and
hold-to-rename, rich insert/style menus, spreadsheet `=SUM(A1:A2)` producing 200
from 120 and 80, browser image upload arriving on the phone, browser reload
retrieving that image from the phone, QR sharing through phone-owned credentials,
and Insert Reminder showing a working source link back to the writing.
The packaged debug APK was installed and launched successfully. Its resources
contain no development-server requests. Android accepted the new share adapter
and displayed its native chooser; it was dismissed without sending anything.

After the Wi-Fi address changed to `192.168.1.3`, a full port scan found ADB on
5555. Restoring port forwarding and reloading cleared the failed-request WebView
screen. Automatic reconnection remains active in the local development session.

Repository checks passed: frozen dependency install, lint (four warnings), all
four package type checks, 300 TypeScript tests, web build and native Linux
prerender build. Rust formatting and clippy passed; 49 native library tests passed with two
model-dependent tests ignored. The Android arm64 debug APK also built successfully. Build logs are local `/tmp` artifacts,
not durable release evidence.

## Remaining, in order

1. Have the owner review the installed packaged debug app on the TECNO.
   The installed release package and its data remain separate.
2. Physical iPhone: reverse pairing after four words, toolbar with keyboard,
   accessory bar and rich editor selection. Linux cannot prove these checks.
3. Two native devices: direct local-network media, reconnect/fallback, existing
   notes arriving both ways. Browser media evidence alone does not prove this.
4. Run OCR and actual transcription on a phone with the needed model installed.
   The TECNO currently has no Whisper pack, so no successful transcription claim.
5. Implement shared Lock spec 0004 with encrypted note storage, native sessions,
   recovery and method adapters. The current disabled setting remains honest;
   hiding text or adding a lock icon would not satisfy this requirement.
6. Separate public person identity and addressed invitations: person QR/input ID,
   iOS native sharing. Private space IDs must never become public person IDs.
7. Complete free image resizing/crop editing and a dedicated attachment gallery.
   Current View Attachments filters notes containing attachments. Scanning a
   document currently attaches a captured page, not a multipage PDF scanner.
8. Reproduce the reported heading Enter issue with the phone keyboard. Lexical's
   existing heading implementation normally inserts a paragraph at its end.
9. Final check of all supported surfaces, commit/push, deploy the preview endpoint
   if shipping the web, then prepare store builds when authorized.

The request remains in progress. These boundaries are intentionally not marked
complete in the specification or stages.
