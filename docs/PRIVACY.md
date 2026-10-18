# Privacy policy

**Notables, by Pherus.** Last updated 18 October 2026. The official policy is
at [pherus.org/legal/privacy-policy](https://pherus.org/legal/privacy-policy);
this page explains the app in more detail.

Notables is built to keep what you write on your own devices. This policy
explains, plainly, what stays with you and the few cases where something
leaves your device because you asked it to.

## The short version

- No account. Notables works fully without signing up.
- No ads or advertising trackers. Android card recognition uses Google ML Kit,
  which collects SDK diagnostics and usage analytics as described below.
- Your notes, books, recordings, calendar, wallet and invoices are stored
  on your device. We cannot see them.
- Publishing, linking, sharing, optional AI and model downloads use network
  services. Android ML Kit also sends SDK diagnostics.

## What stays on your device

Everything you create: notes, journals, books, comics and audiobooks,
handwriting and drawings, recordings and their transcripts, calendar plans
and reminders, invoices and your business profile, and the wallet. Wallet
cards are encrypted on the device. Transcription runs on your device. Read aloud uses local voices or, if you
choose it, an online voice provider. Card scanning, text recognition and barcode reading happen on
your device; camera images are not uploaded.

Your name, if you give one, stays on your device and appears only on what
you publish or share.

## When something leaves your device

**Publishing.** When you publish a note, its public copy (title, text,
excerpt, the name you chose, reading time, dates and any images or audio in
it) is stored on our server so anyone with the link can read it. Readers'
likes, hearts and star ratings are stored with an anonymous identifier, not
an account. You can update or take down a published note at any time, which
removes it from the server.

**Linking and sharing.** Devices use encrypted connections to sync and
share notes. Direct connections are used where available; the device room
can pass encrypted sync messages between linked apps. To
help two devices find each other, our server briefly relays encrypted
introduction messages, kept for a couple of minutes. The server cannot read
them or tell which note is shared.

**AI, only if you turn it on.** AI help is off by default. If you add your
own key for Claude (Anthropic), Gemini (Google) or OpenRouter, the text you
ask about is sent from your device to that provider under its own privacy
policy. We never receive it, and your key stays on your device.

**Android card recognition diagnostics.** Notables uses Google's bundled
ML Kit text recognizer. Card images and recognized text are processed on
your device. The SDK collects device and app information, per-installation
identifiers, performance metrics, API configuration, input/output sizes,
feature versions, event types and error codes for diagnostics and usage
analytics. Notables does not provide a switch to disable this SDK telemetry.
Google documents HTTPS encryption in transit and no onward sharing with
third parties. See [Google's ML Kit disclosure](https://developers.google.com/ml-kit/android-data-disclosure)
and [Google's privacy policy](https://policies.google.com/privacy).

**Model packs.** Optional downloads (voices and transcription models) come
from our server. The request contains only which pack you asked for.

**Server logs.** Our server runs on Cloudflare. Like any website, requests
to it (opening a published note, publishing, sharing introductions, model
downloads) are logged briefly for security and reliability, including IP
address and time.

## Permissions

Notables asks for a permission only when you use the feature that needs it:
the camera to scan cards and documents, the microphone to record,
notifications for reminders, and NFC to read a card where the device has
it. You can turn any of them off in your system settings.

## Children

Notables is not directed at children under 13 and does not knowingly
collect information from them.

## Your choices

Delete anything in the app; deleted items stay in Recently Deleted for 7
days and are then removed. Removing the app removes its data from the
device. To remove something you published, take it down in the app, or
contact us.

## Contact

Pherus, Kampala, Uganda. Email [pherus@pherus.org](mailto:pherus@pherus.org)
or open an issue at
[github.com/phe-rus/notables](https://github.com/phe-rus/notables/issues).

If this policy changes, the new version will be published here with a new
date.
