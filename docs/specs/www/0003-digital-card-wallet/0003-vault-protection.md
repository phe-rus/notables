# Vault and optional protection

## Summary

Stored wallet data is always encrypted. Sensitive protection is optional and off
by default. Its only methods are native Passcode, Face ID and Fingerprint where
a real device capability probe supports them. There is no wallet password or
password fallback. Existing prototype password wrappers are migration inputs,
not a supported product mode. Preserve them until an authenticated migration
can commit and verify a device wrapper without losing existing data.

## Decision

Use RustCrypto XChaCha20Poly1305 for authenticated encryption with native OS key wrappers. Keep the random data key in OS secure storage while protection is off. Use a separate vault SQLite file containing only IDs, kinds of encrypted records, revision numbers, nonces and ciphertext, never card labels or fields. (basis: verified RustCrypto documentation and the current SQLite storage pattern)

### Cryptographic envelope

Generate a random 32 byte data key using the OS random source. Each encrypted payload has a fresh random 24 byte nonce, format version, record ID and revision as authenticated additional data. Every mutation generates new nonces. Use `zeroize` for native keys where possible. JavaScript strings and WebView memory cannot guarantee physical erasure; clear references promptly and state that limitation.

Keep `wallet/vault.sqlite` under the app data directory, apart from ordinary note and media storage. Its schema is `wallet_header(singleton, format_version, wallet_id, revision, protection_mode, wrappers_json, key_generation, transition_phase)` and `wallet_records(id, category, revision, nonce, ciphertext)` plus `wallet_operations(operation_id, result_ciphertext)` for bounded retry receipts. Receipts contain an authenticated canonical request fingerprint; reusing an ID with different input is `invalid-operation`. Category names contain no user labels. Cards, their fields and codes can be one encrypted aggregate. Templates, source images and audit records are encrypted aggregates too. Required record relations are validated before a transaction commits. This does not require changes to the existing notes database.

Header wrappers contain encrypted key material and native key references, never unwrapped keys or device credentials. Authenticate the header and policy as part of a dedicated encrypted metadata record. On boot, reject inconsistent header policy, unsupported versions and missing wrappers. Keep the previous valid state after any failure. Record ciphertext should not appear in application logs.

Legacy prototype password envelopes retain their bounded Argon2id profile only
for authenticated migration. New vault initialization accepts device mode only.
An unavailable device key store leaves initialization unavailable.

### Key storage by OS

| Target | Default key protection | Optional unlock |
|---|---|---|
| Android | AndroidKeyStore wrapping key, private encrypted wrapper | Native Passcode or Fingerprint when supported |
| iOS | Keychain item restricted to this device, accessible when the device is unlocked | Native Passcode, Face ID or Fingerprint when supported |
| macOS | Keychain item in the user keychain | Only native methods confirmed by a target adapter, otherwise unavailable |
| Windows | User scoped secure credential store through the native adapter | Only native methods confirmed by a target adapter, otherwise unavailable |
| Linux | Secret Service through a configured user key store | Only native methods confirmed by a target adapter, otherwise unavailable |

Android protected unwrap is performed inside the native adapter using an authentication bound AndroidKeyStore key. iOS protected unwrap needs a Keychain access control item requiring user presence; until this is implemented and tested the iOS system method is unavailable. A mobile prompt alone is insufficient. Use platform adapters, with `keyring` where its target backend meets the contract. Android needs a Kotlin native adapter because platform wrapping and authentication must stay outside JavaScript. The official biometric plugin supports Android and iOS; it does not establish desktop parity. No OS password or face image is ever read by Notables. Show authentication choices from the runtime probe, not from the OS name alone.

A secure store that is unavailable or locked cannot fall back to a hardcoded or
plain file key, or to a wallet password. Explain the limitation and allow retry.
Native targets need a tested adapter before release. Android stores the encrypted
data key wrapper under `noBackupFilesDir`, with an AES GCM wrapping key in
AndroidKeyStore and the key reference bound as authenticated additional data.
Default wrappers do not require user authentication.

### Protection transitions

Off: retrieve the data key from the device wrapper and permit access without a wallet prompt. Ciphertext remains encrypted, but the owner of an open OS session can open the wallet.

Enable: require native authentication for the selected supported method. Stage
an authentication bound wrapper and verify protected unwrap before atomically
committing the new policy. Remove the old unattended wrapper. A successful prompt
alone must not leave an unattended bypass. Unsupported methods stay unavailable.

Disable or change method: require fresh current native authentication. Stage and
verify the next wrapper before committing policy, then remove obsolete wrappers.
Changing protection is audited. Cancellation and precommit failures keep the
previous policy and readable vault.

For crash consistency, use versioned key store names and a vault header generation. Write the next wrapper before updating SQLite. On recovery, only the committed header generation may be used. Cleanup unreferenced staged wrappers after a successful boot. Never choose an older unattended wrapper when the committed header says protected. Once the new policy commits it stays authoritative. Persist `cleanup-pending` with the obsolete wrapper names. A deletion failure leaves the new policy in force, blocks success reporting and retries cleanup at launch; never revert to the old unattended wrapper. Precommit failure leaves the prior policy in force. Treat rollback resistance against an attacker restoring an entire device snapshot as outside the v1 claim.

### Sessions and lifecycle

Rust owns a session generation and the in memory data key. Content commands run only with a valid session. Validate native window identity, never accept a supplied session token as proof. `wallet_unlock` authenticates natively and opens a new generation; preferred system method cancellation leaves the wallet locked. A changed or unavailable biometric enrollment leaves the wallet protected. Offer only another method already authorized by the committed native policy; never silently disable protection.

Five idle minutes use a monotonic clock advanced by accepted foreground wallet operations. Enforce expiry on every native content command as well as the timer. App background clears UI and worker state and locks a protected native session; process exit always drops the key. OS session lock is handled where an adapter can observe it. On platforms where background notification cannot be trusted, the foreground transition requires reauthentication before sensitive rendering. Off mode does not acquire an unlock requirement through inactivity.

A lock cancels pending recognition and preview handles, empties decrypted TanStack state, revokes object URLs and closes presentation. Mutations and exports compare their starting generation before committing or writing a destination. Async completion cannot repopulate a locked UI. IPC errors expose coarse codes only. Grant wallet methods to the main local window; deny remote origins and secondary windows.

### Retention, audit and operating limits

Source images and logos are encrypted records, not ordinary media files. Capture previews and OCR buffers live in memory only; disable worker persistent caches. Delete a card and its source records in one transaction. Immediate confirmed deletion has no note recycle bin or Undo promise. SQLite and flash can retain historical ciphertext; deletion does not promise forensic erasure.

Audit protection changes, unlock outcomes, saves, deletes, exports and imports. Store only action, UTC time, outcome and random operation ID inside the encrypted vault. No card ID, label or value is needed in the audit. Retain at most 1,000 audit entries or 30 days. Failed unlock audit entries are queued in bounded memory and appended after the next successful unlock; persistent global logs contain only coarse failures. This is a local diagnostic trail, not certified tamper proof auditing.

One Rust write lock owns revision changes and idempotency receipts. Limit operation receipts to the latest 1,000 operations; stale IDs outside that window may be retried only with matching revisions. Reject exhausted quotas before commit. Do not expose a path for arbitrary vault or key deletion from JavaScript. No unencrypted thumbnails or sensitive crash telemetry.

### Build and checks

Main tasks 1 and 3 implement this child, satisfying AC-7 through AC-12, AC-15, AC-17 and AC-18. Test ciphertext alteration, nonce changes, unavailable key stores, rejected native authentication, blocked direct commands, all lifecycle races and wrapper transition failures. Inspect SQLite including journals for known plaintext fixtures. A mocked OS key store is useful for fault tests but does not count as real target evidence.

## Rationale

Encryption and access gating solve different problems. Keeping the default convenient honors your choice, while an optional protection mode must remove unattended access rather than simply hiding a screen. Recovery remains deferred until its native protected design is approved.
