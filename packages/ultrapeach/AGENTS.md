# UltraPeach

Our design language: what Liquid Glass is to Apple and Material 3 is to
Google. Built for Notables first and for later apps, so nothing in here
knows about notes, books or any one product. Read this before changing a
token, a style or a component, here or in an app.

The guiding question: what would Apple do in 2026? Then add our own touch.
From shadcn we take one idea: components are our own readable code, not a
black box.

## Packages

| Package | Folder | Holds |
|---|---|---|
| `@ultrapeach/tokens` | `tokens/` | Colors, accents, text styles, spacing, radii, motion. `theme.css` is generated from `src/`: run `bun run generate` there, never edit it by hand. |
| `@ultrapeach/ui` | `ui/` | Components, hooks, icons, `utilities.css` and `base.css`. |

An app imports `@ultrapeach/tokens/theme.css`, then `@ultrapeach/ui/utilities.css`
and `@ultrapeach/ui/base.css`, after Tailwind, and adds `@source` for `ui/src`.

## Rules

- **Tokens, never one-off values.** Feature code uses named roles, not hex
  colors, pixel font sizes or ad hoc shadows. If a value is missing, add a
  token here first. (Existing one-off values are being migrated; don't add
  new ones.)
- **Names come from SwiftUI** where SwiftUI has one: `Toggle`, `Picker`,
  `SegmentedControl`, `Sheet`, `Popover`, `TabBar`, text styles like
  `footnote`. Our own concepts keep plain English names.
- **One component, one folder:** `ui/src/components/<kebab-name>/<kebab-name>.tsx`,
  with its store, hooks and tests beside it. Export it from `ui/src/index.ts`.
- **Respect the system.** Light, dark, the app's text size, Reduce Motion
  (`MotionConfig reducedMotion="user"` in the app) and each platform's
  conventions through the platform variants below.
- **Every string comes from the app.** Components take labels as props;
  UltraPeach has no copy of its own, so apps translate everything.
- **Artwork SVGs carry `data-brand`**, or the two-tone icon style dims them.

## Color

Semantic roles, light and dark, in `tokens/src/color.ts`, as Tailwind
colors (`bg-paper`, `text-label-secondary`):

- Grounds: `background`, `sidebar`, `surface`, `paper`, `elevated`, `fill`, `separator`.
- Text: `label`, `label-secondary`, `label-tertiary`, `ink` (body text on paper).
- Accent: `accent`, `on-accent`, `accent-text`, `accent-soft`. Set by the
  chosen accent (`data-accent` on the root). **Blush**, the iPhone 15 pink,
  is the default.
- Status: `success`, `warning`, `danger`, `highlight`, `heart`, `inverse`, `on-inverse`.
- Materials: `glass-highlight`, `glass-rim`, `shadow-floating`, `shadow-menu`.

Every pairing is checked for WCAG AA contrast in `tokens/test`.

**Appearance for part of a screen.** Like SwiftUI's `colorScheme`
environment, `data-theme="dark"` or `"light"` works on any element, so a
surface can keep its own appearance whatever the app's: the recorder is
always dark (`features/recording/components/recorder-sheet.tsx`). Inside it,
use the same role names; never copy hex values from the dark palette.
`color-scheme` follows too, so native scrollbars and fields match.

## Text styles

Apple's Dynamic Type, named as SwiftUI names them. `text-<style>` sets the
size, `leading-<style>` the matching line height. All of them scale with
`--type-scale` (the app's text size setting), never below 11 px.

| Utility | Size | Use |
|---|---|---|
| `text-large-title` | 34 | Screen titles at the top of a scroll |
| `text-title`, `text-title2`, `text-title3` | 28, 22, 20 | Section and card titles |
| `text-headline` | 17 | Emphasized row text (pair with `font-semibold`) |
| `text-body` | 17 | Reading text in the interface |
| `text-callout` | 16 | Explanations beside controls |
| `text-subheadline` | 15 | Row text, buttons |
| `text-footnote` | 13 | Secondary details, section headers |
| `text-caption`, `text-caption2` | 12, 11 | Labels, timestamps, badges |

## Corner radii

`rounded-xs` 4, `sm` 6, `md` 8, `lg` 10, `xl` 12, `2xl` 14, `3xl` 16,
`4xl` 20, `5xl` 24, `sheet` 28, `full`. Steps of 2 px while small and 4 px
beyond. Keep nested shapes concentric: inner radius = outer radius minus
the padding between them.

## Materials

Glass in `ui/src/styles/utilities.css`, reading the material colors above,
so they follow the theme the person chose rather than only the system's:

- `glass`: floating controls, such as the tab bar and toolbars.
- `glass-bar`: bars attached to an edge, with content scrolling beneath.
- `glass-pane`: large panes such as the sidebar.
- `glass-menu`: menus and popovers, nearly opaque so nested text stays legible.

## CSS layers

Tailwind's order: `theme`, `base`, `components`, `utilities`. Element
defaults go in `base` (`ui/src/styles/base.css`); a feature's own
stylesheet (the editor, the book reader) goes in `components`, so utility
classes can still adjust it. Leave CSS unlayered only when it must beat
everything, and say why in a comment (printing in `www/src/styles/app.css`).

## Platform variants

`ios:`, `android:`, `macos:`, `windows:` and `linux:` apply where the root
has `data-os`. The app sets it before the first paint, so there is no flash
of another platform's look. Android keeps Material conventions people
expect (flush, solid bottom bar; solid top bars); Apple platforms get glass.

## Motion

Springs in `tokens/src/motion.ts`, used through `spring` in
`ui/src/motion/transitions.ts`: `smooth` for most transitions, `snappy` for
small feedback, `bouncy` for playful moments. Haptics go through `haptic()`.

## Components

| Component | Folder | Notes |
|---|---|---|
| `Button`, `IconButton` | `button/` | |
| `Chip` | `chip/` | |
| `LabeledContent` | `labeled-content/` | A row: label, description, trailing control; wide controls move under the label |
| Context menu | `context-menu/` | `useContextMenu`, `openContextMenu` |
| `confirmDialog` | `dialog/` | Host mounted once by the app |
| `Picker` | `picker/` | The pop-up button; never a native select |
| `Popover` | `popover/` | Keeps to `screenEdges()` |
| `SearchField` | `search-field/` | |
| `Section` | `section/` | A titled, inset group of rows with a footer, as in iOS Settings |
| `SegmentedControl` | `segmented-control/` | Turns into a `Picker` when its labels don't fit |
| `Sheet` | `sheet/` | |
| `Sidebar` | `sidebar/` | |
| `StatusIndicator` | `status-indicator/` | |
| `SwatchPicker` | `swatch-picker/` | |
| `TabBar` | `tab-bar/` | iOS 26 floating capsule, minimizes on scroll; flush on Android |
| `toast` | `toast/` | Host mounted once by the app |
| `Toggle` | `toggle/` | |
| Tooltip | `tooltip/` | `data-tooltip` on any element |
