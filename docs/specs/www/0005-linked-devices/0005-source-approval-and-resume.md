# Source approval and resumable sync

Decision authorized by the owner on 18 October 2026. This is an implementation
contract under spec 0005, not evidence that the feature has shipped.

## Summary

Your receiving native app keeps working on its local notes while another device
sleeps. Changes merge when they reconnect. Protected content requires approval
on its source device. A browser uses an approved phone on the same network and
keeps documents in memory only.

## Requirements

- **SR-1:** Device rows distinguish Source, Receiving and Synced device, using
  the actual session direction. These roles describe a connection, not which
  device owns all ordinary notes. Both native peers can send edits.
- **SR-2:** A remote request to view protected content is approved only on the
  source, with native authentication. Its prompt names the requesting device
  and requested scope. Authentication on a receiver cannot replace approval.
- **SR-3:** Approval expires according to that protection scope. Reconnecting,
  changing transport or waking the source never extends it. An unavailable
  source cannot approve a new request. Cancellation, expiry and revocation
  leave the receiver locked and remove decrypted content from its UI and memory.
- **SR-4:** Receiving native apps persist ordinary local edits and resume Yjs
  exchange after reconnection, interruption or process restart. Protected
  content is excluded from ordinary plaintext replication. Local presence or
  a pairing secret alone never grants protected access.
- **SR-5:** Browser sessions keep the existing memory only rule. When their
  phone is absent, visible content becomes read only and unsent edits stay in
  memory while the tab remains open. Reloading cannot promise to retain those
  edits. A linked Android phone can be explicitly approved as another browser
  host through normal pairing. Host selection never silently transfers trust,
  session keys, protected access or pending edits between phones.
- **SR-6:** iPhone wake is an optimization. A rate limited background push
  requests a brief sync when iOS permits it. A user requested notification
  offers Tap to reconnect when background delivery does not restore the link.
  Force quit, denied notifications and offline phones have an honest fallback.
- **SR-7:** Wallet sync is off by default, enabled separately for selected
  linked native devices, requires an explicit source approved transfer, and
  uses a verified direct local network path only. Wallet payloads and unlock
  requests never use an internet relay, browser session or push payload.
  Receiving Wallets retain mandatory local device protection as well.

## Decision

Improve the current session transport in place. Reuse local persistence and
Yjs state exchange, plus explicit source approval for protected scopes. Prefer
an approved Android phone as the browser host when continuous availability is
needed. Keep iPhone background work opportunistic.

An always running iPhone server is not a supported assumption. A persistent
browser working copy is rejected because it changes the accepted privacy model.
No background audio or VPN workaround is used to keep the app alive.

## Design

The source is the phone serving the active browser session, or the native
device designated as authority for a protected resource. Authority starts on
the device enabling that protection. Moving it requires explicit approval from
the current source. No automatic authority election or recovery bypass exists.

Each protected request carries a random request ID, source ID, receiver ID,
resource ID, scope, session ID and a fresh receiver session public key. The
source authenticates the person and binds approval to all of those values,
plus policy version and expiry. Use the existing authenticated encrypted peer
channel. Access keys are wrapped for that receiver session, never derived just
from the shared space secret. New sessions require new approval. Reject replay,
wrong recipients, stale policy versions and removed peers at the native boundary.
Native expiry uses monotonic elapsed time with a source supplied remaining
lifetime; wall clock changes cannot extend access. Browsers use an in memory
deadline and revalidate on visibility changes before showing protected content.

Protected notes, folders, books and calendar data need resource encryption and
access checks on document, library preview, search, export and media paths before
remote viewing is enabled. Hiding an item in React is insufficient. Existing
plaintext copies already received by another device cannot be remotely erased.

Wallet has its independent mandatory 30 minute unlock, configurable per device,
and an additional five minute grant for sensitive fields. Other locks use their
own policy, until app close or a configured timeout. Full app lock starts off.
Source approval never replaces those existing local protection requirements.

Connection states are Connecting, Connected, Waiting for source, Waiting for
approval and Ended. Display source and receiver names from authenticated device
identity, transport from the actual selected link, and sync status from local
pending changes and confirmed sync completion. Reconnect exchanges state vectors
before declaring completion. Media resumes only through its permitted transport.

APNs setup needs native push registration, a device token, the push entitlement,
and provider credentials held by the notification service. Push carries only an
opaque routing reference and a sync hint, never document content or keys. The
service validates the linked session, throttles requests and removes invalid
tokens. A blocked push path does not prevent local editing or later reconnect.
Choose a provider path with verified APNs protocol support before shipping it.

## Build plan

1. Add source and receiver identity to one real session, then enforce one
   protected request end to end at the native boundary (SR-1 to SR-3).
2. Encrypt protected resources and close alternate read paths before enabling
   their remote view. Test offline edits and restart recovery (SR-2 to SR-4).
3. Complete Android background hosting and explicit alternate phone selection.
   Retain browser memory and read only behavior (SR-5).
4. Add iOS resume hooks, bounded background sync and APNs delivery. Check
   sleeping, force quit, denied notification and network change cases (SR-6).
5. Add the separate opt in Wallet transfer only after local network transport
   and source grants are proven. Deny every browser and relay route (SR-7).

## Consequences

Native editing can continue without keeping the iPhone awake. Browser continuity
requires an available approved phone, so an iPhone alone cannot guarantee it.
Expiry and revocation govern cooperative clients and future key access; they
cannot retract a screenshot or plaintext already copied by a compromised device.

## Migration and verification

Keep existing ordinary note sync and pairing working. Enable protected serving
only after encryption and native authorization checks land. Retain old encrypted
Wallets and keys. Add no automatic Wallet migration into the space document.

Verify approval cancellation, replay, expiry during background, receiver restart,
source loss, changed clocks and alternate host selection on physical devices.
Verify no protected preview, search result, media or export bypasses the grant.
For Wallet, assert zero payloads on browser and relay transports. A successful
reconnect must merge offline edits without extending any access grant.

## Rationale

The existing browser session already reconnects to one phone and binds documents
in memory. Extending that path is smaller than replacing persistence. Native
replicas address continued work; background notifications improve freshness but
cannot guarantee iPhone availability. Apple documents background delivery as
discretionary with limited execution time.

Platform basis: [Apple background updates](https://developer.apple.com/documentation/usernotifications/pushing-background-updates-to-your-app).
