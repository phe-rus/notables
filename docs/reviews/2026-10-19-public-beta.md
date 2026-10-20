# Public beta checkpoint, 19 October 2026

## Completed

- The owner approved Google Play Open testing and external TestFlight testing,
  with production release left for later.
- Release v0.2.11 (10024), commit 3b37e26, compiled and uploaded successfully on
  both native CI jobs. Apple processed the build as VALID. Full local workspace
  and native checks passed before the code push.
- Google internal testing serves 0.2.11. Promoted that build to Open testing
  with release notes and submitted review. Track resumption is included in the
  same review, covering 30 countries, with 0.2.7 superseded. The only
  release validation warning is missing native debug symbols.
- Apple listing draft now has the current full description, promotional text,
  Pherus support/showcase URLs and beta review notes. Production release is manual.
- Generated fresh six-image iPhone and iPad sets with the existing store capture
  pipeline, uploaded them and verified six screenshots in each set. Removed only
  old version associations, retaining those images in Apple's Asset Library.
- Created external group Notables Public Beta with an unrestricted public link:
  https://testflight.apple.com/join/6CANqdbj . Build 10024 is attached and
  Waiting for Review. Public installation awaits Beta App Review approval.
- Saved TestFlight description, feedback email, review contact and review notes.
  TestFlight invitation screenshots come from the last approved production
  version; the new draft images are not automatically an invitation refresh.
- Web code is deployed as Worker 18d96e94-adbb-4b52-b8a0-86164cb14773.

## Confirmed actions and review status

With fresh owner confirmation, saved build 10024 export compliance: standard
encryption beyond Apple's OS and no France distribution. Added the external
group, provided What to Test and submitted Beta App Review. Apple shows Waiting
for Review. Sign-in required is unchecked. Public beta approval is pending.

Google's Data Safety deletion URL check initially returned 403 although normal
requests returned 200. Cloudflare's exact request log identified GooglePlayConsole from
Google's ASN, GET /legal/data-deletion, challenged by Bot Fight Mode. The existing
public legal-page Browser Integrity Check exception is active but cannot skip
Free-plan Bot Fight Mode. The owner explicitly approved disabling that zone-wide
setting. Verified the toggle is off, then Google's Next action passed the URL
check and reached Data types. No Data Safety answers were changed. Other
security settings remain intact. Play shows both the new Open testing release
and Resume track in Changes in review, with automatic quick checks running.
No unsubmitted changes remain. Public availability still depends on approval.

## Follow-up, 20 October

Google has published 0.2.11 (10024), released at 10:05 AM in the Console's local
timezone. Open testing is active for unlimited testers in 30 countries. The
verified public join URL is https://play.google.com/apps/testing/notables.pherus.org .
Added support@pherus.org as the previously blank beta feedback channel and sent
that metadata change for review. The existing binary remains published.

Apple's API still reports WAITING_FOR_BETA_REVIEW. The browser session expired;
the public beta is not yet approved. The current TestFlight invitation remains
https://testflight.apple.com/join/6CANqdbj .

## Update awareness

The owner requested detecting updates and requiring them after seven days.
Implemented after the store submission, targeting the next native release.
This is not in 0.2.11. See [the update handover](2026-10-19-app-updates.md) for
publication, withdrawal, cache behaviour and remaining physical verification.

Hardware acceptance remains pending for iPhone live card recognition/NFC and
native cross-device sync recovery. The owner's earlier Face ID confirmation
applies to 0.2.9. Do not treat successful CI as physical acceptance.
