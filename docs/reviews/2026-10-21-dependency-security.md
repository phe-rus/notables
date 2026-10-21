# Dependency security checkpoint

GitHub Dependabot listed four open alerts on 21 October 2026.

## Vite

Alerts 2, 3 and 4 cover launch-editor argument handling and Windows path checks.
The direct development dependency moves from Vite 8.3.2 to the reported patched
version 8.3.3, with the lockfile regenerated. Validate the frozen install, both
frontend builds, types, tests and Worker smoke before pushing. GitHub closes the
alerts after scanning the updated default branch; do not claim closure beforehand.

## Sharp follow-up

The full npm audit also found [GHSA-wq5f-xc86-pv6w](https://github.com/advisories/GHSA-wq5f-xc86-pv6w)
in Sharp 0.35.4, pinned by Miniflare beneath Wrangler and the Cloudflare Vite
plugin. A root override selects the patched 0.35.5 without changing their other
APIs. The regenerated lockfile and `bun audit --json` report no npm advisories.
This correction follows v0.2.15. Remove the override when the parent toolchain
resolves a patched release itself. Hino's separate npm audit reports no advisories.

## GLib

Alert 1 is [RUSTSEC-2024-0429](https://rustsec.org/advisories/RUSTSEC-2024-0429.html).
The local locked dependency tree resolves GLib 0.18.5 through GTK 0.18.2 and
Tauri 2.12.1's Linux WebKit/GTK integration. RustSec marks versions 0.20 and
later patched. The vulnerable code passes an immutable pointer reference as a
mutable C variadic output argument, which can cause undefined behavior and a
null-pointer crash during optimized string-variant iteration.

An unrelated direct GLib 0.20 dependency does not replace Tauri's 0.18 dependency.
Keep the alert open until a compatible upstream dependency or reviewed backport
is available. No claim of non-reachability has been established. The app does not
directly use VariantStrIter, but its GTK dependency can still use GLib internally.
This constraint concerns Linux packaging; it is not resolved by excluding macOS.
