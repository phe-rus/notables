# 0006. Writing workspace and capture

**Status**: In progress, implementation checkpoint 17 October
**Date**: 2026-10-17
**Authorized by**: the owner requested all changes in this chat across mobile,
desktop and web, asked for autonomous work while sleeping and short device checks.

## Requirements

The owner's complete request is in docs/STAGES.md, Owner's direction, 17 October.
Apple Notes supplies interaction references; Hino supplies controls and tokens.
Preserve every existing note, book, recording, card and synced document.

## Implementation decisions

- Folders are a `folders` Y.Map in the existing library document. Their IDs,
  names, creation dates and order sync like the notes. `folderId` and `tags`
  are optional note index metadata; kind remains the content format.
- Seed three deterministic default IDs once, Writings, Notes and Tasks.
  Existing listed notes go to the Writings folder so the old All notables library is
  intact. Renaming and deleting defaults is supported and never reseeds them.
  Deleting a folder moves its notes to another existing folder, or leaves
  them unfiled if none remain; it never deletes note contents.
- Home is Workspace, a folder manager with counts and snippets. Artifacts follows
  the folders on Workspace only; the sidebar has no Artifacts section. Folder navigation uses the existing `view` search parameter with
  `folder:<id>` values. Old view links keep working as filters. Missing or
  deleted folder links show the library, not a blank inaccessible editor.
- New notes inherit the current folder. Moving supports one or many notes.
  Tags are independent of folders and kinds. User names are 1 to 120 characters.
- List/gallery and group by date follow existing synced preferences. Grouping
  defaults on in the refined list. Date boundaries use the device's local calendar: Today,
  then the current Monday based week, then the prior 30 calendar days,
  then this calendar year, then prior years. Each note has exactly one group.
- Workspace lists folders with an Add control and a long hold context menu.
  Rename edits in place, Delete moves notes safely. Books moves to Artifacts.
  Published leaves the navigation; Circles uses the existing
  Connections feature in Workspace Artifacts (owner revision, 17 October). Recents is limited to five unpinned notes.
- More in the list header owns layout, select, sorting, grouping and attachment
  browsing. Selecting notes exposes Move. Note index thumbnails reference
  existing media IDs, never duplicate file contents in the library document.
- The editor header always shows the note title or New Note, independent of
  the library view. Its tools follow the visual viewport above iOS keyboards,
  retain touch selections, and group dense formatting and insert controls.
- Reuse Lexical commands and node serialization for supported formatting,
  tables, TOC and media. New content must round trip through Yjs, renderers
  and exports. Multiple photos use the existing media store; display defaults
  to 16:9, stored dimensions remain editable, and remove/replace reuse nodes.
- Native transcription accepts PCM float32 at its declared boundary. Android
  JSON byte arrays are decoded by the existing IPC byte helper before checking
  alignment. Never reinterpret a JSON representation as raw PCM.
- Spreadsheet notes store a bounded, editable grid in their Yjs document,
  with formulas evaluated without eval, explicit errors and currency formatting.
  Use existing TanStack infrastructure where useful. Preserve rich note data
  when switching formats. Scanning uses existing packaged OCR and camera paths.
- Sharing options use real platform capabilities. Do not label a generic
  share operation as working AirDrop/Bluetooth or add nonfunctional actions.
  Native OS sharing may offer those transports; direct LAN media uses the
  encrypted connection. Browser notes/media stay in memory through their phone.
- Lock follows spec 0004. UI masking alone is never an access protection claim.
  Keep unsupported native methods unavailable; implement protected storage and
  session checks before exposing a working Lock control.

## Build plan

- [x] Implement keyboard viewport positioning, note title, dense controls and Android PCM byte decoding.
- [ ] Verify toolbar positioning and pairing on a physical iPhone.
- [x] Add synced folders, safe migration and moving, folder Workspace and Circles in Artifacts.
- [x] Add gallery, optional date sections, list menus, thumbnails and capped Recents.
- [x] Add formatting, TOC, checklists, linked reminders, tables and image/attachment management.
- [x] Add scan entry points, explicit link previews, formulas and spreadsheet notes.
- [x] Link invoice reminders to their source and reuse an existing reminder.
- [x] Add encrypted browser media upload/download and direct peer transport with relay fallback.
- [ ] Verify direct media between two real native devices.
- [ ] Verify native OCR and transcription with downloaded models on a phone.
- [ ] Finish person public ID addressing and scanning, iOS system sharing and native Lock protections.
- [ ] Finish free image resizing/crop editing and a dedicated attachment gallery.
- [x] Refine Workspace home, card lists, icon menus and scrollable controls.
- [x] Add camera page review/PDF scans, multi-photo rows and deployed metadata previews.
- [x] Complete the Android packaged launch and native share chooser check.
- [x] Record and commit the implementation checkpoint; remaining work stays listed below.

See [the checkpoint](../../../reviews/2026-10-17-writing-checkpoint.md) for
actual evidence and limitations. Implemented does not imply physical iPhone verification.

## Ratify

The user supplied the product direction and authorized autonomous implementation.
The internal defaults above are recorded as assumptions for later review.
