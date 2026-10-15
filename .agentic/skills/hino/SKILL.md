---
name: hino
description: Build React interfaces with Hino (@phe-rus/hino), Pherus's design system of native controls, tokens and themes. Use when writing or changing UI in an app that depends on @phe-rus/hino or @phe-rus/hino-tanstack.
---

# Hino

Hino (@phe-rus/hino) is Pherus's design system: native React controls, design tokens and themes, with names drawn from SwiftUI.

## Rules

- Use Hino's controls before writing your own; never add shadcn, Radix or Base UI primitives.
- Import each control from its own entry point, as listed below.
- Use the color roles and text styles, never hex values, pixel font sizes or one-off shadows.
- Every string comes from the app: pass labels as props, so the app can translate them.
- Props with fixed options are string unions; pass one of the listed values.
- Mount these once near the root when you use them: `<Toaster />`, `<ContextMenuHost />`, `<DialogHost />`, `<TooltipHost />`.
- Respect light and dark, the reader's text size, Reduce Motion and each platform's look (`ios:`, `android:`, `macos:`, `windows:`, `linux:` variants).

## Setup

Hino works with any React framework, requires React 19 and Tailwind CSS 4, and does not require TanStack. CLI init generates hino/styles.css, hino/providers.tsx and wiring instructions in hino/README.md. Follow those instructions to configure the app root and Tailwind pipeline. Add --integration tanstack only for the optional integration.

```sh
bunx @phe-rus/hino-cli init
# New projects: bunx @phe-rus/hino-cli create my-app --template vite|tanstack
# Manual alternative: bun add @phe-rus/hino
```

```css
/* once, in the root stylesheet; with @phe-rus/hino-tanstack, import "@phe-rus/hino-tanstack/styles.css" instead */
@import "@phe-rus/hino/styles.css";
```

## Tokens

- Grounds: `bg-background`, `bg-sidebar`, `bg-surface`, `bg-paper`, `bg-elevated`, `bg-fill`, `border-separator`.
- Text: `text-label`, `text-label-secondary`, `text-label-tertiary`, `text-ink`.
- Accent: `bg-accent`, `text-on-accent`, `text-accent-text`, `bg-accent-soft`. The accent follows `data-accent` on the root.
- Status: `text-success`, `text-warning`, `text-danger`.
- Text styles: `text-large-title`, `text-title`, `text-title2`, `text-title3`, `text-headline`, `text-body`, `text-callout`, `text-subheadline`, `text-footnote`, `text-caption`, `text-caption2`.
- Corners: `rounded-xs` 4, `sm` 6, `md` 8, `lg` 10, `xl` 12, `2xl` 14, `3xl` 16, `4xl` 20, `5xl` 24, `sheet` 28, `full`.
- Accents: Blush, Honey, Sage, Ocean, Lavender, Rose, Graphite.

## Components

### Actions

- `Button` from `@phe-rus/hino/button`: A pressable control for the actions people take most. Each variant has a little depth, like a well made physical key. Use a button to start an action: saving, sending, confirming or deleting. For moving to another page, style a link with buttonStyle instead.
- `IconButton` from `@phe-rus/hino/icon-button`: A round button that shows only an icon, for toolbars, players and tight rows. Use it where an icon alone is clear, like play, share or settings. Its label is required and becomes the accessible name and tooltip.
- `Chip` from `@phe-rus/hino`: A small label for status, sharing or categories, quiet enough to sit beside any text. Use a chip to tag something with a short word, like who it is shared with or whether it is a draft.

### Inputs

- `TextField` from `@phe-rus/hino/text-field`: A labelled single line input with room for a hint and error messages. Use it for short text people type: names, emails, links. The label is always visible.
- `SecureField` from `@phe-rus/hino/secure-field`: A password field with an optional Show and Hide button. Use it for passwords and other secrets. Give it revealLabels so people can check what they typed.
- `SearchField` from `@phe-rus/hino`: A compact search input with a magnifying glass, for filtering lists as people type. Use it above a list or in a toolbar. Filter results as people type rather than waiting for Enter.
- `Toggle` from `@phe-rus/hino/toggle`: An on and off control: a switch for settings that apply at once, or a checkbox for choices you confirm later. Use the switch when the change takes effect right away. Use the checkbox inside forms and lists of choices.
- `SegmentedControl` from `@phe-rus/hino`: A row of two to five options where exactly one is chosen, that turns into a Picker when it runs out of room. Use it to switch between views or modes of the same content, like Day, Week and Month.
- `Picker` from `@phe-rus/hino`: A pop-up button that shows the current choice and opens a menu of options, never a native select. Use it to choose one option from a list that is too long for a segmented control.
- `SwatchPicker` from `@phe-rus/hino`: A row of colour swatches with names, for choosing one colour. Use it for colour choices like an accent, a label or a notebook colour. Each swatch has a name under it.
- `DatePicker` from `@phe-rus/hino/date-picker`: Day, month and year fields for dates people already know, like a birthday, in the order their locale writes them. Use it for remembered dates such as birthdays, where typing is faster than paging through a calendar.
- `TextEditor` from `@phe-rus/hino/text-editor`: A multi-line text area that matches the look of Hino's text fields and grows when dragged. Use it for text that runs past one line: a bio, a message, a note. Give it a visible label.
- `SearchList` from `@phe-rus/hino/search-list`: A search field with a list of results that filters as you type and can be driven with the arrow keys. Use it to jump to one item in a known set: settings, people, commands. Each item matches on its value and keywords.

### Layout

- `Section` from `@phe-rus/hino`: A titled, inset group of rows with a footer note, as in iOS Settings. Use sections to group related settings or details, with LabeledContent rows inside.
- `LabeledContent` from `@phe-rus/hino`: A settings row: a label and description, with a control or value at the trailing edge. Use it inside a Section for each setting. Wide controls move under the label on their own when space runs out.
- `Table` from `@phe-rus/hino/table`: Styled parts for a plain HTML table: header, rows, cells, a footer and a caption, scrolling sideways when it's wider than the screen. Use it for small sets of rows you write out yourself. For sorting, filtering and pages of server data, use DataTable from @phe-rus/hino-tanstack, which is built on these parts.
- `ContentView` from `@phe-rus/hino/content-view`: A raised card with parts for its heading, rows, dividers and large figures. Use it for a tappable summary that leads somewhere, such as a security setting or a stat. Put a link inside that covers the card.
- `Conversation` from `@phe-rus/hino/conversation`: A thread of messages like Messages on iPhone, and a reply field with a round Send button. Use Conversation.Messages for a thread between the reader and someone else, such as a support request, and Conversation.Composer to reply.
- `Ambient` from `@phe-rus/hino/ambient`: Content with its image's colors glowing softly behind it, the way Apple lets a photo light its surroundings. Use it behind a hero image, such as a profile photo, album art or an app icon, to tie the page to the picture without a card or edge.

### Status

- `StatusIndicator` from `@phe-rus/hino`: A small dot and text that say whether something is saved, syncing or offline. Use it near the thing it describes, like a document or a device, to show its live state.
- `StatTile` from `@phe-rus/hino/stat-tile`: A number with a label and a quiet caption, for dashboards and summaries. Use tiles in a grid to show the numbers people check most. Give them onClick to act as filters.

### Overlays

- `Dialog` from `@phe-rus/hino/dialog`: A focused question or short form over the page, with a title, an optional description and a footer of actions. Use it when people must finish or cancel something before going on: renaming, confirming a sign out, adding an email. For a plain yes or no, await confirmDialog instead.
- `Sheet` from `@phe-rus/hino/sheet`: A modal card that rises from the bottom on phones and floats in the middle on larger screens, holding whatever you put in it. Use it for a self-contained task over the page, such as sharing or choosing a color. Dialog is a Sheet with a title, description and actions already laid out.
- `Popover` from `@phe-rus/hino/popover`: A glass panel that springs open from the control that opened it, and moves itself back inside the screen if it would cross an edge. Use it for a little extra detail or a short menu tied to one control, such as an account card or a More menu. Pair it with useDismiss so Escape and a click outside close it.
- `toast` from `@phe-rus/hino/toast`: A short message that drops from the top like an island to confirm, show progress or explain a failure, then leaves on its own. Call toast from anywhere, including outside React. Render one Toaster near the root of the app.
- `useContextMenu` from `@phe-rus/hino`: Actions for one thing, opened by right-clicking on a computer or pressing and holding on a touch screen. Spread useContextMenu's handlers onto the element, passing a function that returns its rows. Render one ContextMenuHost near the root of the app.
- `TooltipHost` from `@phe-rus/hino`: A small label that appears on hover for any element with data-tooltip, shown by one host for the whole app. Render one TooltipHost near the root of the app. Add data-tooltip to any element. IconButton adds its label as a tooltip by itself.
- `LocaleSwitcher` from `@phe-rus/hino/locale-switcher`: A small floating language button that opens into a list of languages, each in its own name, and can be dragged to any corner. Use it on public pages where people may arrive in the wrong language. It remembers the corner it was dragged to under storageKey.

### Navigation

- `TabView` from `@phe-rus/hino/tab-view`: A row of tabs that switches between panels of content on the same screen. Use it to split one screen into a few views of the same thing, such as a project's overview, activity and settings.
- `TabBar` from `@phe-rus/hino`: The app's main places in a floating glass capsule at the bottom of the screen, as iOS 26 draws it, with an optional Search button. Use it on phones for three to five top-level places. It works with any router: renderLink spreads the bar's props onto your own link.
- `SidebarSection` from `@phe-rus/hino/sidebar`: Titled groups of navigation rows for a sidebar, with an icon, a label and an optional count on each row. Use it for an app's places on larger screens. Rows are your router's links: give them sidebarItemClass and put SidebarItemContent inside.
- `ViewController` from `@phe-rus/hino/view-controller`: The frame of one screen: a large title with an optional description and action, then the screen's content. Use it as the outermost part of a screen, passing ViewController.Heading as the heading.

### Media

- `ProfileImage` from `@phe-rus/hino/profile-image`: A round photo of a person that falls back to their initials while it loads or if it fails. Use it wherever a person appears: account menus, member lists, comments. Size it with a class name.

Full docs for any component: https://hino.pherus.org/components/<name>. Index: https://hino.pherus.org/llms.txt
