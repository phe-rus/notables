# Hino release and Wallet form maintenance, 20 October 2026

## Delivered

Hino commit 68da167 releases UI 0.1.6. The trusted npm publication run
39460295694 succeeded and the public registry serves 0.1.6. The docs Worker
was deployed as a52da79d-5e8d-4eea-bea4-1f5d7ef9e284. HTTP checks of the home,
theming guide, popover page, sitemap, robots and preview returned 200; the
preview retained noindex/nofollow and same-origin frame policy. Requests using
Python's default user agent were denied, while browser-user-agent requests
succeeded. The first deployment encountered a network error; retry succeeded.

The app and Pluraliti pin the same published UI version. The upgrade carries
accent-tinted grounds, matte glass, slimmer focus rings and popup positioning.
No sibling source imports or package overrides were introduced.

ManualCardForm now delegates initial values and card-kind field configuration
to card-form-defaults.ts, payload construction to build-card-draft.ts and
appearance presentation to CardAppearanceSheet. model/types.ts owns these
contracts. The back-scan and appearance action rows use Hino Button. Compact
inline inputs retain their existing design pending an upstream inline control.

## Evidence

Hino checks passed: lint/format, CLI build, website build, typechecks, package
validation and 96 tests across UI, integrations, CLI and website.

Wallet draft regressions cover public edits preserving masked fields and custom
details, disabling stored security-code retention, stable IDs across preview
and save, and recognition provenance. A browser-only synthetic form verified
aligned action rows, appearance-sheet opening/closing and retained colour
selection. No native vault or personal card data was used or modified.

Notables checks passed: frozen install, lint, workspace typechecks and 390 tests,
web build, Worker smoke, native Linux frontend prerender, Rust format and Clippy,
and 56 Rust tests with two existing ignored tests. The first suite run hit a
Miniflare proxy hydration assertion in the mailbox pagination test; that test
passed alone and the full suite passed on retry without code changes.

## Remaining

Continue Wallet scanner lifecycle and native contracts, then the next unfinished
item in docs/MAINTENANCE.md. This pass does not establish physical iPhone OCR/NFC
accuracy, direct LAN-only sync or desktop runtime acceptance. Installed apps
need a new native build to receive the upgraded frontend.
