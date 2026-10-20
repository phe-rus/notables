# App update awareness, 19 October 2026

The owner requested update notices followed by mandatory updating after seven
days. This is implemented for packaged release builds carrying a build number.
Web pages already receive deployed code; debug and live development builds are
exempt. Existing binaries without this feature cannot gain it until updated once.

## Behaviour

The app checks on launch, returning to the foreground, restored connectivity and
hourly while visible. A known deadline is also checked each minute. Before the
deadline, a dismissible prompt offers Update and Later. About has a manual check
and an update action. After the deadline, a dedicated screen replaces the app
content. App services stop serving linked browsers and device document sync when
that content unmounts. Existing documents, browser approvals and Wallet cards
are retained. Retry and support remain available.

Each release receives seven days from its verified store availability timestamp.
Cached deadlines survive restarts and lost connectivity. A later release cannot
extend a previously learned deadline. Updating to the target build or beyond
removes the gate. A failed check with no known release allows normal use; a
failed check with a known expired release retains the gate. Explicit policy
withdrawal clears it. Malformed or incomplete responses cannot clear a known
gate. This is an application compatibility measure, not protection against
someone modifying their local app or clock.

## Distribution and release procedure

`/api/app-release` exposes public version metadata with CORS, no document data
and no credentials. Its source is `www/src/server/releases/policy.json`.
Each distribution is independent. iOS chooses TestFlight for a sandbox receipt
and the App Store for a production receipt. Unknown receipt environments leave
checks unavailable rather than sending someone to the wrong distribution.
Android includes ChromeOS Android apps. Desktop uses Pherus's product page;
enable its policy only once an installable package is actually available there.

All channels initially remain null. CI uploads do not publish update policy.
After verifying availability for the channel's intended users and regions,
prepare metadata, review the diff, and deploy the Worker:

```sh
bun scripts/releases/app-policy.ts android-play 0.2.13 10026 2026-10-26T12:00:00Z --available
```

The version, build and timestamp above are examples, not the current release.
Use `ios-testflight` or `ios-app-store` for the appropriate Apple distribution.
Do not enable the Android policy for an internal-only upload, a staged rollout
or a release unavailable in regions where existing users need it. The manifest
does not query Play eligibility separately for each installation. Do not claim
that a store approval or rollout is automatically detected. Verify this before
publication. TestFlight availability must cover the relevant tester groups.

To withdraw a problematic release, prepare an explicit null and deploy it:

```sh
bun scripts/releases/app-policy.ts android-play --withdraw
```

Previously informed offline apps can only learn that withdrawal after connecting.
The gate follows the owner's offline blocking requirement once the deadline is
known. This implementation does not download replacement executables or deliver
feature code outside the platform's store.

## Verification

Targeted tests cover numeric versions, rebuilds of the same version, the exact
seven day boundary, offline restart, clock rollback after expiry, corrupt cache,
withdrawal, invalid responses, future availability, updating, channel isolation,
the read only endpoint and deliberate publication. Physical store navigation
and iOS receipt detection still require the next signed native build.

On 20 October the exact staged source passed the full required sequence in an
isolated checkout: frozen install, lint (six existing warnings), type checking,
all package tests (250 app, 63 sync, 46 core, 19 editor), web build, native
prerender, Cargo format, Clippy and Rust tests (56 passed, two ignored). Separate
UI and configuration edits in the working directory were excluded. The native
release candidate is v0.2.12. All channel policies remain disabled.
