# Capture and templates

## Summary

You review scanned details and turn them into a rendered card. The source photograph is a capture aid, never the finished card surface. You can change the layout, colors and details without altering other cards.

## Decision

Use TanStack Form for review and edit state and TanStack Store for transient navigation and progress. Use bundled Tesseract.js and ZXing WASM, with every asset URL local and CDN defaults replaced. No network OCR and no recognition cache on disk. (basis: the user choice and verified library documentation)

## Feature design

### Logical model

All records below live inside encrypted vault payloads. SQLite does not receive these fields in plaintext.

| Entity | Required fields | Optional fields and constraints |
|---|---|---|
| Card | UUID `id`, integer `revision`, `kind`, `displayName`, template ID and version, `sideState`, fields, codes, appearance, UTC created and updated times | Nullable issuer; maximum 1,000 cards |
| Field | UUID ID, card ID, key, label, string value, integer order, side, source | Predefined key unique within a card; custom keys use UUIDs; 100 fields; label 80 characters, value 4,096 characters |
| Code | UUID ID, card ID, side, exact format, payload bytes encoded as base64, optional text interpretation, render status | Four per side; payload at most 8 KiB; GS1 and ECI information retained when exposed by the decoder |
| Original | UUID ID, card ID, side, verified MIME, encrypted bytes | Zero or one image per side; explicit retention only |
| Template | UUID or fixed built in ID, immutable version, kind, name, dimensions, front and back element lists, default appearance | New edits create a new version; existing references keep their old version |
| Appearance | Form factor, palette token, optional uploaded logo reference, element overrides | Position values are bounded normalized coordinates in 0..1; no remote URL or executable markup |

The side state is `missing` or `available` for each side. A reviewed set of fields can make a side available without a photograph. Template elements are tagged `field`, `text`, `code` or `logo`, with ID, side, normalized x/y/width/height, alignment (`start`, `center`, `end`), and one of small, normal or large text styles. Field and code elements reference a key or code ID. Text elements contain bounded plain text. Logo elements reference encrypted raster data embedded in the card or template aggregate. Override IDs must reference existing elements. Text wraps within its box and never paints outside it; accessible details retain the full value. Template catalog and read are exposed by the wallet service. Logo import and removal are part of the save aggregate, with a 512 KiB decoded raster limit and a 512 pixel longest edge.

Card kind registry:

| Kind | Suggested fields |
|---|---|
| `bank` | holder, number, expiry, optional CVV or CVC, issuer |
| `national-id` | full name, ID number, date of birth, issue date, expiry, country |
| `electricity` | holder, meter number, account number, provider |
| `television` | holder, smartcard number, customer number, provider |
| `sim` | holder, phone number, ICCID, network; no PIN or PUK suggestion |
| `membership` | member name, member number, organization, expiry |
| `other` | title, identifier, issuer and custom fields |

Values are strings. Dates are reviewed ISO dates where valid, with a separate display label; expiry may use `MM/YY`. Invalid formats are flagged but identifiers are not reformatted. Bank number checks report likely mistakes without making manual entry impossible for uncommon issuers. Stored CVV is accepted only after the review retention choice; otherwise it is removed from the saved draft. Keeping a bank card original also requires an acknowledgment that all visible details, including printed security codes, remain in that image. Without this acknowledgment do not retain the original. Rust creates list summaries from an allowlist of display name, kind, issuer, palette, form factor and last four; it never returns CVV or full bank fields for list templates.

Card fields belong to one card. Codes and originals belong to one side of one card. Templates may be used by many cards. Save a custom template explicitly; never mutate a shared template while editing a card. Referenced template versions are included in backups. Original images and logos are bounded raster assets with EXIF removed, not HTML or SVG from an import.

### Capture and recognition

Capture uses a user selected file or camera stream where supported, with front and back slots. Provide crop, rotation, retake and manual field entry. A quadrilateral crop supports perspective correction; detection is a suggestion and editable. Preserve raw identifiers rather than stripping leading zeros. Limit input to PNG, JPEG or WebP decoded as a raster; reject SVG, oversized images and invalid headers. Downsample recognition work to a 2,400 pixel longest edge while original retained images remain bounded by the main limits.

Bundle English, French, Spanish, Portuguese, Swahili and Arabic OCR language data. Default to the app locale plus English for Latin identifiers. The user can change the recognition language. Bundle worker, core and models during build from pinned dependencies, with local asset paths and license notices. Worker cache is disabled. Start one job, cancel or terminate it on timeout, lock, background or user cancellation, and discard its results if the session generation changed. Confidence is the engine result, never a claim of authenticity.

Template suggestion uses reviewed language independent field patterns and optional OCR issuer text. A bank number is only a hint; no network issuer lookup. The user chooses kind and template before save. Built in template names describe card kind and form factor, not an endorsement by a bank or government. Provide landscape (85.6 by 54 units), portrait (54 by 85.6) and compact (70 by 40) templates with a rounded rectangle and normalized field positions. Keep physical proportions while screen size scales. Support palette choices from existing design tokens, custom field placement, optional user imported logo and a preview for each side.

### Code preservation

Use the intersection of ZXing readable and writable formats exposed by the pinned version. Begin with QR, Code128, Code39, EAN13, EAN8, UPCA, UPCE, ITF, PDF417, DataMatrix and Aztec only when both APIs pass fixture tests. Store original decoded bytes and format, never rebuild from OCR text. Numeric manual entry validates required lengths and checksums; other formats accept bounded text or explicit byte input. Treat decoder control information that the writer cannot reproduce, including unsupported ECI or GS1 semantics, as unsupported. Never silently normalize its bytes.

Write the symbol, decode the output and compare format and exact payload bytes. Accept only a successful match. Decoder text is a display aid, not the source of binary content. Display unsupported status rather than a substitute QR. Barcode artwork can be generated from decrypted data on demand and is not a plain persistent thumbnail. Preserve quiet zones, contrast and aspect ratio, and offer a full size code view. Render user fields as escaped text, not injected SVG or HTML.

### Screens and states

Wallet home: title, a simple Add control and an overlapping stack of rendered cards. Search, filters, sorting and administrative controls do not dominate the home. Empty state explains scanning and image import and offers Add; locked state replaces all card content; unavailable and corrupt states expose recovery options. List bank previews use masked numbers and omit CVV.

Add and edit: type and template selection, side capture controls, progress, editable field form, custom fields, code review, retain original choices, appearance preview and Save or Cancel. Persist only after explicit confirmation. If recognition fails, keep manual fields usable. Indicate code status and missing side. Never show a source photo as the presented card.

Card details: large rendered card, side switch, editable details, Present, Edit and Delete. Presentation uses an accessible modal, focus trapping, Escape, visible close, front and back buttons, reduced motion and safe areas. Keyboards, larger text and Arabic must not overlap fields. Optional haptics use the existing helper. No brightness change without user action.

### Build and checks

Main tasks 1 and 2 implement this child, satisfying AC-1 through AC-6 and AC-11, AC-12, AC-15 through AC-17. Test recognition using synthetic fixture images rather than real card data. Test template changes leaving other cards untouched, missing sides, leading zeros, binary codes and all supported writer formats. Verify no asset request uses a CDN and no image reaches server APIs.

## Rationale

The rendered template is the product you requested. Local WASM engines avoid separate OCR services and native C++ packaging for every target while keeping recognition offline. Native permissions and WebView capabilities still need target evidence. TanStack covers the app layer; it does not replace recognition engines.
