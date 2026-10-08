# Wallet verification, 8 October 2026

The feature and its first milestone remain in progress.

## Physical Android evidence

A connected TECNO CI6 running Android 13 received the ARM64 debug APK through
`adb install -r`. Existing application data was preserved. The emulator also
attached to this host was not the test target.

Observed on the phone:

- The app launched, Settings rendered and the mobile sidebar exposed Wallet.
- The wallet route rendered.
- Initial native status failed because Android's desktop window focus getter
  always returns false. Desktop uses that getter; mobile now uses native
  Suspended and Resumed events to fence wallet sessions.
- Password setup initially failed because Android SELinux denies hard links
  in the app data directory. A temporary, empty file confirmed that restriction.
  The probe files were removed. Android now publishes the verified staged
  vault with the renameat2 syscall and RENAME_NOREPLACE, preserving an existing
  vault rather than replacing it. Other targets retain exclusive hard links.
- The rebuilt APK successfully created the password-protected vault and
  loaded the empty wallet.

The phone switched to another app before the sample card test. Touch automation
was paused. Saving, editing, deleting, masked lists, presentation, restart,
background locking and five-minute idle locking are not yet verified on this
physical device. Android secure key storage is not implemented, so only the
explicit password fallback is currently testable.

## Automated and desktop evidence

- Workspace type checking: six tasks passed.
- Web and Android frontend builds passed; ARM64 native compilation and APK
  packaging passed, including both phone-discovered fixes.
- Native library tests before the Android fixes: 40 passed, two model-dependent
  tests ignored. The added publication regression test passed separately.
- Clippy and Rust formatting checks passed after the Android fixes.
- Wallet frontend boundary tests: three passed.
- Full frontend suite: 151 passed, one unrelated publication test exceeded its
  five-second timeout under concurrent build load. The publication file passed
  all nine tests when rerun with a 30-second timeout.
- Wallet-specific Biome checks passed. Repository-wide lint reported existing
  skill-template formatting errors and broken skill symlinks.
- The real Linux credential store probe passed key write, read and cleanup.

macOS, Windows and iOS have no physical target evidence from this session.

## Resume work, 8 October 2026

Implemented the Android device key adapter using AndroidKeyStore AES GCM and
atomic encrypted wrappers under the application backup excluded directory.
The bridge is native JNI only, with no WebView JavaScript key interface.
Rust worker buffers are cleared and Java exceptions map to coarse errors.
The key store probe writes, reads, compares and deletes a disposable key.

Fresh setup exposes device storage only. Rust rejects password initialization.
The existing prototype vault is preserved and displays a migration pending
message, without a password form. Its authenticated migration is unfinished.
The wallet home now uses overlapping card previews without search and sort
controls. Add still needs the scan and review journey. Native optional protection
is unfinished and no capability claims have been added.

The vault and recovery contracts now remove withdrawn password requirements.
Recovery remains deferred pending its native protected design.

Checks: all six workspace type checks passed; all three wallet frontend tests
passed; all 14 tests selected by `cargo test ... wallet:: --lib` passed.
A Bun navigator with no language exposed a rendering failure; language detection
now skips missing values. ARM64 Android debug compilation and APK packaging
passed for the final source, including the adapter and revised setup. Rust
formatting, Clippy with warnings denied on the host, and diff whitespace checks
also passed. Android compilation retains three preexisting unused import warnings
in unrelated modules.

The physical TECNO CI6, serial `085452525P011328`, was confirmed attached alongside
an emulator. No APK was installed and no phone application was operated in this
resume session. Coordination about resuming device interaction is still pending.
No new physical runtime evidence is claimed. Do not clear or replace the existing
test vault. Next: verify the device key probe on the phone, implement and test
safe migration of the empty prototype vault, then continue scan and review.


## 8 October 2026 resumed authorization and broader card scope

The user authorized phone interaction with “proceed”, then clarified that Wallet
must include their Umeme card and NFC acquisition rather than bank cards only.
The prototype was migrated and reopened after process restart without a wallet
credential. Final migration additionally rotated the data key on the phone.
No existing card or note data was deleted.

Review and native validation now accept seven kinds, using per-kind templates
and fields. Umeme suggestions select electricity, with separate meter/account
strings preserving zeros. Bank security-code retention remains explicit.
Android read-only NDEF text acquisition is availability gated, bounded and
reviewed, never executed as a URI. Vendored NFC 2.4.1 patches cancel native scans,
clear them on background, end dispatch after read, and correct signed bytes and
empty messages. No writing capability is granted. TECNO feature enumeration
reports camera hardware but no NFC; successful physical NFC evidence is pending.

Checks: eight wallet frontend tests passed; nine native session tests passed,
including electricity save/restart/filter, migration rotation and rollback.
TypeScript passed after guarding indexed NFC bytes. Wallet Biome passed.
Android packaging initially rejected an NFC uses-feature declaration accidentally
inserted into the TV intent-filter; corrected to the manifest root and rebuilt.
Physical scan and save evidence will be added after installation.
