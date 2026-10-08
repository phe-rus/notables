# 0004. Lock

**Date**: 2026-10-09
**Status**: Design, awaiting build

## Summary

One Lock protects every secret place in Notables: the Wallet, the Vault and
notes marked as locked. It is off by default. When you turn it on, you choose
how you unlock: Face ID, fingerprint or the device passcode; our own PassPin
or a password; or a passkey that lives on this device. You also get a
one-time recovery key. Secret data is encrypted from the start whether the
Lock is on or not; the Lock decides who can open it.

## Decisions from the owner (9 October 2026)

- The Lock always covers secret places. Separately, an optional switch locks
  the whole app when it opens.
- Wallet and Vault share this one security model.
- Turning the Lock on gives a one-time recovery key. Without it and the
  device, locked data stays locked.
- A passkey or device method means only that device unlocks.

## Requirements

* **L-1**: Off by default. Secret data is always encrypted at rest with a
  random data key kept in the OS secure store (as the wallet does today).
* **L-2**: Turning the Lock on requires choosing at least one method the
  device really supports (probed at runtime, never guessed from the OS
  name) and saving the recovery key. Methods the device lacks are shown as
  unavailable, with the reason.
* **L-3**: Methods: device authentication (Face ID, fingerprint, device
  passcode, Windows Hello, Touch ID), PassPin (6 to 8 digits), password,
  passkey bound to this device. Several can be on at once; any one unlocks.
* **L-4**: Unlocking opens all secret places for the session. They lock
  again on app background, OS lock, five idle minutes and app exit, and
  immediately from a Lock button.
* **L-5**: The optional app lock asks to unlock when Notables opens or
  returns from the background, before showing any content.
* **L-6**: Changing methods, turning the Lock off and showing a new recovery
  key all require unlocking first. Every change is atomic: a failure keeps
  the previous working state.
* **L-7**: PassPin and password guesses are limited by the native side with
  growing delays, and are useless away from this device (see below).
* **L-8**: The recovery key unlocks on this device when every method is
  lost, and restores secret data on a new device from an encrypted backup
  once backups exist (Stage 10).
* **L-9**: No secret, PIN, password, recovery key or biometric data is
  logged, synced, put in preferences or sent anywhere.

## Design

### Keys

Each secret place keeps its own **data key**, which encrypts its records
(the wallet's vault file today). Data keys are never stored in the clear.

* **Lock off**: each data key is wrapped by the device key store without
  user authentication (today's wallet behavior).
* **Lock on**: each data key is wrapped by one **lock key** (32 random
  bytes, XChaCha20-Poly1305). The lock key is itself wrapped once per
  enabled method, in **slots**, as disk encryption does with key slots. Any
  slot unwraps the lock key; the lock key unwraps every place's data key.

Adding or removing a method adds or removes one slot. Turning the Lock off
re-wraps the data keys with the device key store and destroys the lock key.

### Slots

| Slot | What wraps the lock key | Bound to this device |
|---|---|---|
| Device authentication | An OS key that can only be used after the person authenticates: Android Keystore key with user authentication required (BiometricPrompt, strong biometric or device credential); iOS Keychain item with a `userPresence` or `biometryCurrentSet` access control; macOS Keychain with LocalAuthentication; Windows Hello key credential. | Yes: the OS key never leaves the device |
| PassPin, password | Argon2id of the PIN or password, combined with a second key from the device key store, so a copied file can't be attacked offline. | Yes, through the device key |
| Passkey | The WebAuthn PRF extension (hmac-secret) of a passkey created for this app on this device, through the platform's own passkey API. | Yes, when the passkey is device-bound (not synced) |
| Recovery key | 24 words (256 bits) from a fixed word list, shown once. | No: it is the way back |

Linux has no standard biometric API: there the Lock offers PassPin,
password and recovery key, and device authentication only where a tested
adapter exists.

### Sessions

Rust owns the unlocked lock key in memory, as the wallet owns its session
today (session generation, monotonic idle clock, background lock, process
exit drops the key). The frontend never sees a key, a PIN or a password
after submitting it. Biometric and passcode prompts are native.

### Code layout

* `www/src-tauri/src/lock/`: the lock key, slots, sessions and the
  attempt limiter; one module per slot kind; platform adapters beside their
  slot.
* The wallet's existing wrappers move onto the lock: `wallet/` keeps its
  vault file and asks `lock/` for its data key.
* `www/src/features/lock/`: the Settings screens, the unlock sheet, the
  recovery key screens, and the app lock overlay.

### Settings

Settings, Privacy and Security, Lock:

* **Lock** on or off, with the methods below it, each with its availability.
* **Unlock with**: Face ID or fingerprint or device passcode (whichever the
  device has), PassPin, password, passkey.
* **Lock the app when it opens**: off by default.
* **Lock after**: immediately, 1, 5 or 15 minutes (default 5).
* **Recovery key**: show a new one (old one stops working).

## Build plan

1. Rust `lock/` with lock key, slots in the header, PassPin and password
   slots, recovery key, attempt limiter, sessions; move the wallet onto it.
   Tests for every transition and failure (the wallet's test style).
2. Android device authentication slot (Kotlin Keystore adapter and
   BiometricPrompt), tested on the TECNO phone.
3. Settings screens, unlock sheet, recovery key flow, app lock overlay.
4. Passkey slot where the platform API offers PRF; iOS, macOS and Windows
   device adapters as each target is built and tested.

## Open questions

* Word list for the recovery key: the BIP-39 English list is widely known
  and checksummed; a translated list per language would be friendlier but
  risks mistakes when moving between languages.
* Whether notes marked as locked hide their titles in lists (Apple Notes
  shows the title of a locked note).
