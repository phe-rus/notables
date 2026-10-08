# Verify: digital card wallet, spec 0003

Updated 2026-10-08. These checks require synthetic cards. No real bank or ID data is needed for verification. Boxes remain unticked until evidence exists.

## User flows

* [ ] Add with camera, image and manual entry; deny camera permission; confirm browser unavailable, AC-1.
* [ ] Disconnect network, scan each supported language, review and correct the fields and template, AC-2, AC-3.
* [ ] Change one card appearance, save a custom template and verify another card is unchanged, AC-4.
* [ ] Present and flip both sides, missing side, Escape, focus return and reduced motion, AC-5.
* [ ] Render supported numeric and binary codes and compare decoded bytes; reject unsupported semantics, AC-6.
* [ ] Search card contents only inside an accessible wallet; global search and widgets reveal nothing, AC-7.
* [ ] Fresh launch requires no wallet unlock; OS key store unavailable has no plain key fallback, AC-8.
* [ ] Enable protection through Settings, Account, test supported native Passcode, Face ID or Fingerprint, cancellation and unavailable methods, then change and disable protection, AC-9.
* [ ] Background, idle and OS lock; ensure direct content invokes fail and delayed jobs cannot restore data, AC-10.
* [ ] Save a bank card with and without CVV retention; verify safe list and full accessible detail, AC-11.
* [ ] Cancel capture, retain one original, delete the card and verify live records disappear together, AC-12.
* [ ] After the native recovery design is approved, export and restore, rejected authentication, modified bytes and source template collision, AC-13, AC-14.
* [ ] Modify the vault after preview; retry an operation; fail a write and relaunch, AC-15.
* [ ] Six languages, RTL, large text, keyboard, screen reader names and optional haptics, AC-16.
* [ ] Record camera, OCR, codes, key storage, protection and backup evidence for each release target, AC-17.
* [ ] Inspect audit records and global logs for absence of seeded values, AC-18.

## Value sourcing probes

* [ ] Scan identifiers starting with zeros and confirm stored values follow reviewed input.
* [ ] Select a different template and language, then confirm presentation and recognition use those choices.
* [ ] Change app locale without changing a saved card, confirm the pinned layout remains stable.
* [ ] Change source bytes but keep similar text, confirm code rendering follows decoded payload bytes.
* [ ] Change card kind, filter and sort; page with 25 then 50 items and confirm no skipped or repeated IDs.
* [ ] Retain just the back image and confirm only that side is included in a backup.
* [ ] Lock while an image or restore result is pending, confirm session generation rejects it.
* [ ] Vary conflict choices and confirm import counts come from actual committed records.
* [ ] Inspect protection mode after a failed wrapper transition; the previous policy remains authoritative.

## Commands

* [ ] Frozen lockfile install, lint, typecheck and all package tests pass.
* [ ] Web build and native frontend build pass.
* [ ] Rust format, clippy and vault tests pass.
* [ ] Android debug build and real device flows pass.
* [ ] Available desktop and iOS target builds pass, unavailable target evidence is reported explicitly.
