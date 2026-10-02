# Verify: natural voice on the device · spec 0001 · updated 2026-10-02
_Steps derived from spec 0001 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

Before you start: publish both packs (`bun run models:publish supertonic-3`, then `whisper-base`), deploy the Worker, and approve the bucket and database rename (AC-14). Linux desktop build unless noted.

## UI / manual
- [ ] Fresh install (no `models/` folder in the app data dir), launch online → Settings > Downloads shows "Natural voice" downloading with a rising percent, no prompt → AC-1
- [ ] When it finishes, Settings > Listening's voice list shows the natural voice styles (proper names, translated descriptor) → AC-1, AC-3
- [ ] Voice left on "Best available", open a note in English, press read aloud with networking off → the natural voice reads it; same for a French, Spanish, Portuguese and Arabic note (switch the app language) → AC-3
- [ ] Play a line of about 200 characters with the voice warm (read aloud surface already open) → time to first sound; note the machine. Later lines play with no gap → AC-4
- [ ] Import an EPUB whose `dc:language` is `sw` → read aloud uses a device voice and the narration bar's Voice menu has no natural voice → AC-5
- [ ] Same with a language no device voice speaks → the bar shows "No voice for this language" (translated) → AC-5
- [ ] Choose a device voice in Settings, then let the natural voice finish downloading or update → the chosen voice stays selected and is used → AC-6
- [ ] Kill the network halfway through a download, relaunch online → the percent resumes from where it stopped, not from zero → AC-7
- [ ] Corrupt one byte of a finished pack file (before `installed.json` lists it), retry → the file is discarded, downloaded again, and only then marked Ready → AC-7
- [ ] Settings > Downloads shows each pack with size and state; try Download, Delete (with confirmation), Retry, and the "Download over mobile data" switch → AC-8
- [ ] Delete the natural voice while a book is being read aloud → the download stops or the folder goes, and the next line continues with a device voice → AC-8
- [ ] Publish a newer `supertonic-3` version while a book plays → playback is not interrupted; the next session uses the new version; the old folder is gone after the next launch → AC-9
- [ ] With an existing `models/ggml-base.bin` from an older build, open transcription → it is adopted (moved into `models/whisper-base/<version>/`) without a new 148 MB download → AC-10
- [ ] Change the pace from 0.8× to 1.5× while reading with the natural voice → speed changes, pitch does not; 1.75× plays as 1.5× → AC-12
- [ ] In the web build (`bun run dev`, browser) → device voices only, no Downloads section, no request to `/models/` → AC-13
- [ ] Press the license button on the Natural voice row → before download it opens the hosted LICENSE; after download it shows the bundled text in a sheet → AC-15
- [ ] Switch the app to each of the six languages and open Settings > Downloads → every new string is translated → AC-16

## Value sourcing
- [ ] Phone build with mobile data off: the pack shows "Waiting for Wi-Fi"; turning the switch on starts it (`allowMetered` from narration settings; phones count as metered for now) → AC-2
- [ ] Only the voice pack downloads automatically; transcription waits for the first recording → AC-1
- [ ] Book language: an EPUB with `dc:language` `fr` reads in French while the app is in English; a book without it follows the app language → AC-3, AC-5
- [ ] The style used is the chosen voice id, else the manifest's `defaultStyle` (change it in the manifest and relaunch) → AC-3
- [ ] Offline after a fetch: Settings still shows sizes from the cached manifest; with no cached manifest it shows Retry and no size → AC-8
- [ ] The manifest is fetched at most once per launch and once per 24 hours (watch `/models/manifest.json` requests) → AC-9

## Commands
- [ ] `cd www && bun test test/server/model-files.test.ts` → ranges, suffix ranges, 416, HEAD, path escapes pass → AC-11
- [ ] `curl -sI https://notables.pherus.org/models/manifest.json` → `Cache-Control: public, max-age=300`; a versioned file → `immutable` → AC-11
- [ ] `curl -s -o /dev/null -w '%{http_code}' https://notables.pherus.org/models/%2e%2e/x` → 404 → AC-11
- [ ] `cd www/src-tauri && cargo test --lib models::` → resume and checksum tests pass → AC-7
- [ ] `NOTABLES_SUPERTONIC_DIR=<pack folder> cargo test --release --lib speaks -- --ignored --nocapture` → speech in en, fr, ar, with timings → AC-3, AC-4
- [ ] `grep -n bucket_name\|database_name www/wrangler.jsonc` → `notables-bucket`, `notables-database` → AC-14

## Acceptance-criteria coverage
- AC-1: first launch download, Settings progress · AC-2: mobile data switch · AC-3: offline natural reading, ranking test, style source · AC-4: timing step · AC-5: Swahili and no voice · AC-6: chosen voice kept · AC-7: resume, checksum, cargo tests · AC-8: Settings list, delete during playback · AC-9: update during playback, manifest freshness · AC-10: Whisper adoption · AC-11: route tests and curl · AC-12: pace · AC-13: web build · AC-14: wrangler names · AC-15: license · AC-16: six languages
