# iOS Wallet Face ID return, 19 October 2026

The owner reports Face ID appears but Wallet remains locked and displays a
password message. No custom Wallet password is required by the current flow.

The installed Tao 0.37.1 iOS scene adapter emits Suspended on resign-active,
Focused(true) on become-active, and Resumed only on enter-foreground. A system
Face ID overlay can therefore suspend Wallet without the Resumed event that
Wallet previously required. Native authenticate then exhausts its foreground
wait and returns Locked. The UI displayed the obsolete wallet password hint.

## Reproduction and repair

`cargo test --lib ios_face_id_return -- --nocapture` failed with
`Face ID success must open Wallet: Locked` before the repair. The test runs the
real session and native focus routing, simulating suspend followed by active
without enter-foreground. The repair restores iOS foreground state when its
window becomes active. Desktop focus handling and Android Activity/JNI handling
retain their existing behavior. Authentication success remains required before
unlock_device is called. Becoming active by itself does not unlock Wallet.

The test verifies the outer grant, separately locked sensitive fields and
returning within the same grant without extending it. An Android regression
ensures focus cannot substitute for Activity resume. The old password message
is replaced with device authentication guidance in seven languages.

## Verification boundary

This reproduces the native lifecycle defect on Linux using the iOS event
sequence documented by the installed framework. It is not evidence of physical
Face ID success on an iPhone. The next TestFlight build must be checked for
successful unlock, cancellation, sensitive-field reauthentication and return
within the configured access period. Existing Wallet data and keys are untouched.

## Completed local checks

Frozen install, workspace lint (six existing warnings), all four workspace type
checks, all workspace tests (219 app tests), web build and Linux native
prerender passed. One initial publication test exceeded its existing five-second
timeout during concurrent native compilation; the unchanged full suite passed
on rerun. Cargo format and Clippy passed. Native tests: 55 passed, two ignored.
