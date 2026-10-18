# v0.2.6 release failures and v0.2.7 fix

## Confirmed failures

The production v0.2.6 package exited within seconds on the TECNO CI6
(192.168.1.2, ARM64) and the Chromebook Android runtime
(100.115.92.2, x86_64). A cold launch followed by a process check failed on
both. Crash logs named CardReaderPlugin construction. Inspection of the
installed optimized DEX and Play bundle showed the ML Kit registration classes
with no public constructors. Manifest discovery could not instantiate them,
so the text reader factory was absent and eager initialization raised an NPE
across the native plugin boundary.

The debug APK had worked because it does not run release optimization.
The iOS job separately failed while parsing Package.swift: its tools version
was 5.3, but iOS.v15 requires PackageDescription 5.5.

## Fix

The card reader library publishes a narrow consumer rule preserving the
classes and public constructors implementing Firebase ComponentRegistrar.
Release optimization remains enabled. Reader initialization is deferred until
a scan is requested; an initialization exception rejects that request instead
of failing plugin construction. Destroying an unused reader does not create it.
The Swift package now declares tools 5.5, keeping its existing iOS 15 target.

Before Play upload, CI now runs scripts/android/verify-card-reader.ts against
the actual optimized AAB. It requires all three ML Kit registration classes
and their public zero-argument constructors. The verifier failed on the
published v0.2.6 AAB and passed on the patched optimized APK. iOS CI validates
the Swift manifest before the full signed build.

## Physical verification

An optimized release APK was built with the changed Kotlin and consumer rule,
reusing the unchanged native libraries from the published v0.2.6 bundle for
both ABIs. A temporary Gradle init script isolated it under
notables.pherus.org.releasecheck with test signing. Its package ID was checked
before installation. Both devices launched it and retained a live process
beyond the same interval that killed v0.2.6. Package Manager confirmed ARM64
on the TECNO and x86_64 on ChromeOS. Both temporary test apps were removed.
The owner's production and debug apps and their data were untouched.

This verifies the reported startup failure through the optimized code path.
It does not establish a new OCR accuracy or biometric milestone. The v0.2.7 macOS job subsequently compiled the full iOS app successfully.

## Checks and next

Frozen install, lint (six existing warnings), workspace types and tests,
web build, native frontend prerender, Cargo format, Clippy and Rust tests pass.
The replacement store version is v0.2.7. Do not retag v0.2.6 or reuse its store
build number. Run 39133139435 attempt 1 built Android, passed the actual AAB verifier and
uploaded the bundle, but Google returned service unavailable at edit commit.
iOS compiled and archived, then automatic signing could not update the bundle
identifier or obtain a profile. Attempt 2 uploaded Android successfully to Google Play internal testing;
iOS is still running. The
new NFC entitlement requires checking the App ID capability if signing repeats;
Apple Developer Account Holder sign-in has been requested.

Play draft copy and artwork are now refreshed: feature graphic, six phone
shots and six shots in each tablet slot. Source: docs/store/listing.md.
Desktop screenshots, SDK disclosure corrections and external beta setup remain.
The full local check sequence passed again after the screenshot-copy changes.
