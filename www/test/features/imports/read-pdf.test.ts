import { describe, expect, it } from "bun:test";
import { headingStarts, paragraphsFrom } from "@/features/imports/importers/read-pdf";

/** A line of text at (x, y), as wide as its characters. */
const line = (str: string, x: number, y: number) => ({
  str,
  transform: [1, 0, 0, 1, x, y],
  width: str.length * 5,
  height: 10,
});

const prose = "The harbour lights came on one by one as the tide went out again.".repeat(4);

describe("paragraphsFrom", () => {
  it("starts a paragraph at an indent even with even line spacing", () => {
    const items = [
      line("The boats were late that morning and the fog sat low on the", 50, 700),
      line("water, so nobody on the quay could see past the breakwater.", 50, 688),
      line("Mara waited by the lamp until the first hull showed through", 70, 676),
      line("the grey, then walked down to meet it with the rope ready.", 50, 664),
    ];
    expect(paragraphsFrom(items)).toHaveLength(2);
  });

  it("keeps each line of a contents list apart", () => {
    const items = [
      line("Contents", 50, 700),
      line("Chapter 1 Low Tide", 50, 688),
      line("Chapter 2 The Lantern", 50, 676),
      line(
        "The tide had turned before anyone noticed the boat was missing from its mooring.",
        50,
        664,
      ),
      line("Nobody spoke of it until the evening bell rang over the empty harbour wall.", 50, 652),
    ];
    const paragraphs = paragraphsFrom(items);
    expect(paragraphs.slice(0, 3)).toEqual([
      "Contents",
      "Chapter 1 Low Tide",
      "Chapter 2 The Lantern",
    ]);
  });
});

describe("headingStarts", () => {
  it("finds chapters followed by prose, not contents entries", () => {
    const pages = [
      ["Contents", "Chapter 1 Low Tide", "Chapter 2 The Lantern"],
      ["Chapter 1 Low Tide", prose, prose],
      ["Chapter 2 The Lantern", prose],
    ];
    expect(headingStarts(pages)).toEqual([
      { title: "Chapter 1 Low Tide", page: 1, at: 0 },
      { title: "Chapter 2 The Lantern", page: 2, at: 0 },
    ]);
  });
});
