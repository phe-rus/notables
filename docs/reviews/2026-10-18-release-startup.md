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
It does not establish a new OCR accuracy or biometric milestone. The full iOS
compile remains dependent on the macOS release job.

## Checks and next

Frozen install, lint (six existing warnings), workspace types and tests,
web build, native frontend prerender, Cargo format, Clippy and Rust tests pass.
The replacement store version is v0.2.7. Do not retag v0.2.6 or reuse its store
build number. After both signed builds pass, resume Play listing, screenshot
and disclosure review. The draft copy remains in /tmp/notables-play-description.txt;
it has not been applied in Console. Existing uploaded v5 artwork is saved.
