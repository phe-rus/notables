# Sync recovery, 19 October 2026

## Report and installed versions

The owner reports that iPhone links to Android and ChromeOS Android apps but
content does not arrive. Browser sessions work. The TECNO at 192.168.1.4 and
ChromeOS runtime at 100.115.92.2 both report production 0.2.8 (10021). The owner
is testing iPhone 0.2.9 (10022). Engine failures below are reproduced locally;
they do not constitute physical verification of the entire reported connection.

## Reproduced failures and changes

- SessionHost skipped a fresh state-vector exchange for documents already open
  when switching transports. Its offer now requests missing updates every time.
- SpacePeer exchanged its digest once but did not offer bodies of newly added
  notes. It now watches library additions while attached.
- Hashing only state vectors missed delete-only offline edits. Digests now hash
  encoded CRDT state, including delete sets. This reads full stored documents;
  measure large libraries before replacing it with a cheaper equivalent.
- Permanent note deletion could lose to an offline metadata update. A durable
  removed-notes map now takes precedence and removes resurrected index entries.
- Recently Deleted state shared the whole metadata object with titles and other
  fields. A separate note-trash map now preserves deletion against unrelated
  offline edits, while an explicit later restore still works.
- Apps try local WebRTC before relay, with an eight-second fallback. Open local
  links survive missing room presence or a lost room socket. Real local link
  failure still falls back only when the peer is present in the room.
- Returning to the foreground or regaining connectivity replaces stale room
  sockets. Late messages from a replaced socket are ignored.

Regression commands: `bun test packages/sync/test/engine/space-peer.test.ts`,
`bun test packages/sync/test/session/room-socket.test.ts`,
`bun test www/test/library/folders.test.ts`, and
`bun test www/test/platform/space-sync.test.ts`.

## Naming and migration

The binding is SPACE. The Worker exports the class as space, producing the
notables_space namespace naming convention. Legacy migration v1 remains intact;
v2 renames SpaceRoom to space rather than creating a replacement namespace.
The object continues to forward messages without storing document content.

## Conflict rules and remaining work

Document text uses Yjs logical versions, not wall-clock latest-wins. Previously
seen deletions remain represented when an offline device rejoins. Folder removal
already uses removed-folders markers. Permanent note deletion now dominates a
concurrent edit; Recently Deleted can be explicitly restored. This protection
requires the updated apps. Concurrent changes to other metadata fields still
use whole-object Yjs map conflict resolution, not a field-by-field history UI.

The room still introduces peers and supplies the encrypted fallback relay.
Local WebRTC has no STUN/TURN servers. Native discovery for cold-start LAN or
hotspot syncing without internet is not implemented. Direct connections across
separate networks and user-visible revision history are not implemented either.
Do not describe those features as shipped. Keep Wallet restricted to its own
explicitly enabled local-only transfer path.

Pending acceptance: install the same updated build on both native Android
runtimes and iPhone; create and edit notes both ways, reconnect after background,
delete while the other device is offline, then reconnect and confirm no
resurrection. Also unplug internet after establishing a local link and verify
edits continue. Never use the owner's private notes for synthetic test data.

## Local verification

App and package suites: 235 app tests, 63 sync tests, 46 core tests and 19 editor
tests pass. Type checking, lint, web build and native prerender pass. Generated
Wrangler binding types confirm SPACE points to the space export. Cargo format and Clippy pass; native Rust tests pass (56 passed, 2 ignored). Tests use synthetic documents and identifiers.

The same release also carries the previously pending finance year sheets,
receipt picker/native OCR fixes, date grouping/scroll space and README images.
Wallet adds live masked detection feedback and rejects empty manual reviews;
its system-prompt lifecycle guards still require iPhone hardware verification.

## Deployment and follow-up

Commit 78b2850 is pushed. Web Worker b7a1c6c8-186f-47ea-9b61-7084cf9b096e
is deployed: the homepage returns 200, and two synthetic WebSocket peers passed
presence and addressed-message routing through SPACE. The old namespace class
was renamed through migration v2, not replaced by an empty newly created class.
Wrangler authentication was renewed without exposing credentials.

The v0.2.10 native build was cancelled before completion to supersede it with
v0.2.11, adding a newly reproduced Vision parser bug: card-number groups emitted
on separate lines were ignored, and a labeled number could keep only the first
four digits. Three synthetic tests now cover Visa/Amex wrapping, expiry and
label truncation. The updated app suite passes 238 tests. Physical iPhone
recognition and cross-device acceptance remain pending the new build.
