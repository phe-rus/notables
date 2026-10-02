import { describe, expect, it } from "bun:test";
import { locateQuote, quoteFor } from "../../../src/features/books/highlights/lib/text-quote";

const text = "The sea was calm. The sea was calm again at dawn, and the sea was loud by noon.";

describe("text quotes", () => {
  it("finds the same words again", () => {
    const start = text.indexOf("calm again");
    const quote = quoteFor(text, start, start + "calm again".length);
    expect(locateQuote(text, quote)).toEqual({ start, end: start + 10 });
  });

  it("picks the right one of repeated words by their surroundings", () => {
    const second = text.indexOf("The sea was calm", 5);
    const quote = quoteFor(text, second, second + "The sea was calm".length);
    expect(locateQuote(text, quote)?.start).toBe(second);
  });

  it("survives edits elsewhere in the chapter", () => {
    const start = text.indexOf("loud by noon");
    const quote = quoteFor(text, start, start + 12);
    const edited = `A new opening line. ${text}`;
    expect(locateQuote(edited, quote)?.start).toBe(edited.indexOf("loud by noon"));
  });

  it("gives up when the words are gone", () => {
    const quote = quoteFor(text, 0, 7);
    expect(locateQuote("Something else entirely.", quote)).toBeNull();
  });
});
