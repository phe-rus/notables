# Beta release checkpoint, 18 October 2026

## Delivered and saved

- Android v0.2.7, build 10020, passed the optimized bundle registration gate
  and uploaded to Play internal testing in run 39133139435, attempt 2.
  The optimized startup repair was tested on TECNO ARM64 and ChromeOS x86_64.
- Play listing draft: Notables by Pherus, revised short/full descriptions,
  current feature graphic, six phone screenshots and six screenshots in each
  tablet slot. The owner inspected the images and approved continuing.
- Data safety draft adds App interactions, Diagnostics and Device or other
  IDs for SDK analytics. These are collected, not shared, not ephemeral,
  required because the app provides no telemetry opt-out. Existing content
  categories remain. See docs/store/listing.md and docs/PRIVACY.md.
- Open-testing release draft: 0.2.7 Beta (10020), with the actual bundle
  selected from Play's library and beta feedback notes saved.
- Apple API verified NFC_TAG_READING was absent from bundle ID
  notables.pherus.org. It was enabled and verified through the existing
  Admin CI key. iOS attempt 3 exported and uploaded to TestFlight successfully.
- Production v0.2.7 build 10020 cold-launches on TECNO ARM64 and ChromeOS
  x86_64. Play open testing has 30 first-wave regions selected. The release
  preview now has only the native debug symbols warning. No public rollout
  or review submission has been performed.
- The owner identifies pherus.org as the official product, showcase and legal
  authority. Store copy now points to pherus.org/showcase/notables.
- The owner reports an iPhone Wallet Face ID return failure. The native
  lifecycle regression and repair are recorded in 2026-10-19-ios-wallet-resume.md.

## Before external testers

1. Ship and physically verify the iOS Wallet Face ID repair. Compilation and
   upload success for v0.2.7 did not prove its authentication lifecycle works.
2. Deploy the central privacy and data deletion pages from ~/pherus/pherus/www
   and rerun Google's URL check. Robots already allowed public crawling;
   explicit Google groups alone do not resolve an edge HTTP 403.
3. Review the 30 selected Play regions and save the beta draft. Mainland
   China awaits separate filing review; Hong Kong and Taiwan are selected.
   Final store declarations and app setup still need review/submission.
4. Play warns that native debug symbols are missing. The R8 mapping file
   exists, but it does not replace native symbols. Improve native crash
   symbol delivery in a subsequent build; it is currently a warning.
5. Complete the independent beta readiness items from the 16 October review:
   public-content reporting/moderation, explicit optional AI data consent,
   current privacy/age answers and accessibility verification. A permissive
   release preview is not evidence these product obligations are complete.
6. Capture ChromeOS screenshots from the updated Android runtime. The
   desktop listing slot is empty; tablet captures have not been presented
   as ChromeOS window captures.
7. Apple external TestFlight needs a beta-review build/group and public link.
   An internal upload alone does not open the beta to outside testers.

## Honest test boundaries

Bank-card classification and uncertain-number review are tested, but the
owner's bank photo still loses one OCR digit. No invented digit is inserted.
Physical NFC and iPhone Vision still need device verification. Wallet stays
native and per device; optional source-approved LAN Wallet transfer is not
implemented. App, note, folder and book locks are separate unfinished work.

## License boundary

The official licence and showcase information belongs on pherus.org. The
application package declares MIT. The Supertonic 3 model pack is OpenRAIL-M,
not MIT; scripts/models/packs.ts pins its upstream revision and includes the
license in the download. Whisper's MIT license is also bundled. This is
source evidence, not a completed dependency/license compliance audit. Verify
model restrictions, SDK terms and shipped third-party notices before stating
that the full distribution has been cleared.

## 19 October follow-up

Pherus central legal deployment is live, revision
1b9feec7-5505-4d91-b027-48ea72f3170e, source commit c3b3b11 in the Pherus
workspace. English, French and Chinese deletion pages, policy, robots and
sitemap were verified. Play saved the dedicated deletion URL, but its actual
URL checker still returns 403. A matching Python client receives Cloudflare
error 1010, identifying Browser Integrity Check rather than robots. The normal
browser and curl can read the page. The deployment credential lacks zone
security write scope; a targeted edge configuration exception is still owed.
Both store description drafts now use the official Pherus showcase. Apple
metadata persistence was verified after reload. The beta release draft is saved
in Publishing overview; nothing was sent for public review.

## Cloudflare access resolved, 19 October

The owner approved activating the prepared public-page exception. Configuration
rule 9b1e54df555f4faeb634437abfaba76f is active. Its expression requires apex
pherus.org, GET or HEAD, and public legal paths in the three site languages,
robots.txt or sitemap.xml. Only Browser Integrity Check is set to off.
Play's actual Next/Checking URLs step now advances to Data types without the
403 warning. The saved deletion URL remains pherus.org/legal/data-deletion.
A matching Python client reads all six probed public URLs with HTTP 200;
the homepage still returns 403. No account, API or other subdomain is included.

v0.2.8 CI run 39223134018 completed successfully for both stores. Apple API
confirms 0.2.8 build 10021 is VALID, not expired, with export compliance
unanswered. Apple browser session expired; sign-in requested. No public beta
review submission or production rollout was performed.

## Apple internal testing available, 19 October

With explicit owner confirmation, submitted standard encryption beyond Apple OS
and no France distribution for v0.2.8 (10021). Missing Compliance cleared.
The existing Pherus developers group lists 0.2.8 (10021) as Testing. No new
testers were added and no external group was created. Physical Wallet unlock
verification is now possible through TestFlight and remains owed.

Play Publishing overview now reports 0.2.7 Beta (10020), its 30-region rollout,
listing and declarations in review. This is a later observed state, not a
review submission made by this session. The open-testing track was shown
paused. No track was resumed or release replaced during this follow-up.

## iOS Face ID follow-up, 19 October

v0.2.8 still failed on the owner's iPhone. Two reproduced paths are repaired:
legacy Tao iOS lifecycle has no become-active notification after Face ID, so
Wallet now queries UIApplication state on the main thread; the frontend also
keeps its authentication guard through status application and first card load,
so a late authentication blur cannot erase that result. Subsequent blur still
clears cards. Foreground activity never grants authentication by itself.

All required workspace and native Linux checks passed: 220 app tests and
56 Rust tests, with two expected ignored tests. The UIKit adapter requires
macOS CI compilation and physical Face ID verification in ios-v0.2.9.
Do not describe the physical iPhone issue as resolved before that check.

## Listing submission and Finance ledger, 19 October

The previous Play submission has published. The newer listing assets and copy
were still a saved draft, confirmed by comparing Console with the public Play
page. Completed listing Review/Save and sent all seven listing changes for
review. Console shows Changes in review with automated quick checks running.
No app binary, track or country selection was changed by this submission.

Finance now has receipt image enlargement, removal from a draft before saving,
and ledger entry deletion with a destructive confirmation. Generated invoice,
receipt and quotation rows retain their document links. Imported SMS text stays
with its reviewed entry. Conversation pastes produce a save-or-skip review queue.
MTN parsing handles currency before or after amount, fees, dates and references;
ignores approvals, balances and URL previews; distinguishes borrowing, repayment
and transfer from ordinary income/expense; and avoids discarding different
components with the same reference. A missing financing reference is inferred
only from one payment with the exact same timestamp. Original gallery photos
are not deleted. No pasted private message data is stored in test fixtures.

All required checks passed: 223 app tests, workspace type checks/tests/build,
native frontend prerender, Cargo format/Clippy and 56 Rust tests with two ignored.
Physical Finance control verification remains pending. The new TECNO address
192.168.1.4 identifies TECNO CI6; the previous 192.168.1.2 identifies ChromeOS.
