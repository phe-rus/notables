import type { NoteKind } from "@notables/core";

/**
 * The notes a first-time visitor finds in an empty library: a short guide,
 * and a few examples of what Notables is for. Written in Markdown; the
 * first heading becomes each note's title.
 */
export interface WelcomeNote {
  key: string;
  kind: NoteKind;
  pinned?: boolean;
  /** How long ago the note was last edited, so the list feels lived in. */
  hoursAgo: number;
  markdown: string;
}

export interface WelcomeBook {
  title: string;
  subtitle: string;
  author: string;
  /** Keys of the chapter notes, in reading order. */
  chapters: string[];
}

export const welcomeNotes: WelcomeNote[] = [
  {
    key: "welcome",
    kind: "note",
    pinned: true,
    hoursAgo: 0,
    markdown: `# Welcome to Notables

A quiet place for notes, journals, stories and books. Everything you write stays **on this device** — no account needed.

## Try a few things

- [ ] Press **⌘N** (or Ctrl N) to start a new note
- [ ] Press **⌘K** (or Ctrl K) to search everything you have written
- [ ] Tap the microphone to record — Notables writes down what you say
- [ ] Open **Books** to read the sample story with real page turns
- [ ] Choose an accent colour in **Settings**
- [ ] Hover **Library** in the sidebar and press **Edit** to make it yours

## Writing

Start a line with \`#\` for a heading, \`-\` for a list, \`[ ]\` for a checklist or \`>\` for a quote. Select text for **bold**, *italic* and ==highlights==.

## Sharing

Publish a note to give it a public link where readers can heart and rate it. Unpublish whenever you like. Sharing directly with family and friends, device to device, is on its way.

> These examples are yours to keep, change or delete.`,
  },
  {
    key: "journal",
    kind: "journal",
    hoursAgo: 20,
    markdown: `# A slow Sunday

Woke before the alarm. Rain on the iron roof, the kettle, the radio low. I read three chapters before anyone else was up.

Walked to the market when it cleared — mangoes, a blue kitenge, a notebook with a cracked spine that I could not leave behind.

## Small good things

- The smell of wet earth
- A long call with Grandma
- Finishing the crossword without help

Tomorrow: start the second chapter.`,
  },
  {
    key: "chapter-1",
    kind: "story",
    hoursAgo: 50,
    markdown: `# The fog came in at dusk

Nobody on the island remembered the last time the lamp had failed. Amara climbed the hundred and twelve steps the way her father had taught her, counting them aloud so the dark would know she was coming.

At the top the glass was cold and wet. Somewhere below, a ship's horn answered a question she had not asked.

She lit the wick by hand and wrote the hour in the log, the way it had always been written.`,
  },
  {
    key: "chapter-2",
    kind: "story",
    hoursAgo: 49,
    markdown: `# The keeper's log

The log went back ninety years. Storms, births, a whale that beached in 1958. Her father's handwriting began halfway through, small and slanted, as if he were apologising for taking up room.

On the last page someone had written a single line she did not recognise:

> When the fog comes twice in one night, follow the second light.

She closed the book and listened. Out on the water, a second light was moving.`,
  },
  {
    key: "chapter-3",
    kind: "story",
    hoursAgo: 48,
    markdown: `# Morning

When the fog lifted the sea was flat and silver. The boats came home one by one, and every captain lifted a hand toward the tower.

Amara wrote the hour in the log. Then, beneath it, in her own hand: *Followed the second light. Everyone came home.*`,
  },
  {
    key: "plan",
    kind: "plan",
    hoursAgo: 30,
    markdown: `# Weekend in Jinja

## Before we go

- [x] Book the early bus
- [ ] Charge the camera
- [ ] Pack rain jackets
- [ ] Download offline maps

## Saturday

- Source of the Nile at sunrise
- Lunch by the water
- Kayaking if the river is calm

## Sunday

- Market, then the long way home`,
  },
  {
    key: "lesson",
    kind: "lesson",
    hoursAgo: 75,
    markdown: `# How plants make food

Plants make their own food through **photosynthesis**: they turn light, water and carbon dioxide into sugar, and release oxygen.

## What goes in

- Sunlight, caught by **chlorophyll** in the leaves
- Water, drawn up from the roots
- Carbon dioxide, taken in through tiny pores called stomata

## What comes out

- Glucose, the plant's food
- Oxygen, which we breathe

> Light + water + carbon dioxide → sugar + oxygen

## Check yourself

- [ ] Why are most leaves green?
- [ ] Where does the oxygen come from?`,
  },
];

export const welcomeBook: WelcomeBook = {
  title: "The Lighthouse Keeper",
  subtitle: "A sample story",
  author: "Notables",
  chapters: ["chapter-1", "chapter-2", "chapter-3"],
};
