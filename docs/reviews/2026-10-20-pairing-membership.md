# Pairing membership, 20 October 2026

## Report and reproduction

The owner reports pairing success without a device row or content transfer for
iPhone, TECNO Android and ChromeOS Android in either direction. Both Android
runtimes have 0.2.12 (10025). TECNO is reachable at 192.168.1.2:5555. During
pairing from the iPhone, the owner saw the approval toast. A physical UI dump
then confirmed "No other devices linked yet" on TECNO, also after relaunch.
No private content or keys were extracted.

## Reproduced code defect and change

The former global removedHere set blocked an installation ID in every space.
The platform regression test passed for a fresh device but failed when the same
device was removed in one space and then joined a different one. Historical
handover records also restored unrelated exclusions on every launch.

Removal guards now belong to a space. Startup only applies the handovers for
that space. Explicitly approved pairing persists membership and permits that
device again, without lifting unrelated removals. The encrypted saved receipt
can carry the joining device's name, platform and public key. Older peers remain
compatible. Device membership, online transport status and the React subscription
now have separate modules and owned types.

Tests cover fresh connection, a different space, a still-removed device, explicit
reapproval surviving a restart, and a saved receipt carrying authenticated
metadata. These findings are real defects, but do not yet prove that every
reported native transport failure has the same cause. Updated physical pairing
and bidirectional content transfer are still required.

## Network addresses and permissions

LocalLink already gathers local interface addresses through WebRTC ICE. It does
not connect peers to a fixed loopback address. The Rust 127.0.0.1 media server is
an internal WebView service with a random port and token; exposing that service
on 0.0.0.0 would expose device-only media unnecessarily. Development localhost
uses adb reverse and is distinct from packaged-app peer connections.

The Android app targets SDK 37. Android 17 requires ACCESS_LOCAL_NETWORK, in
addition to INTERNET, for LAN communication. The manifest and pairing action
now request it; granting it resumes connection discovery. The user's TECNO and
ChromeOS devices run older Android, so this is a compatibility correction, not
a claimed explanation of their current failure. WKWebView network traffic is
exempt from Apple's local network permission according to TN3179.

Same-network links still use the room for introductions. Cold-start LAN discovery
without internet remains unfinished; do not advertise it as implemented.

Sources: [Android local network permission](https://developer.android.com/privacy-and-security/local-network-permission),
[Apple local network privacy](https://developer.apple.com/documentation/technotes/tn3179-understanding-local-network-privacy).
