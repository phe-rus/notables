import { describe, expect, it } from "bun:test";
import { documentText } from "../../src/features/search/lib/document-text";
import { search, terms } from "../../src/features/search/lib/rank";

const now = Date.UTC(2026, 9, 2);
const note = (id: string, title: string, body: string, daysAgo = 0) => ({
  id,
  title,
  body,
  updatedAt: now - daysAgo * 86_400_000,
});

describe("search", () => {
  it("splits queries into folded terms", () => {
    expect(terms("  Café, CAFÉ  lighthouse ")).toEqual(["cafe", "lighthouse"]);
  });

  it("needs every term and ranks title matches first", () => {
    const hits = search(
      [
        note("body", "Morning pages", "The lighthouse keeper story needs an ending."),
        note("title", "The lighthouse keeper", "Chapter one."),
        note("partial", "Lighthouse", "No keeper here? No."),
        note("missing", "Groceries", "Milk and bread."),
      ],
      "lighthouse keeper",
      now,
    );
    expect(hits.map((hit) => hit.item.id)).toEqual(["title", "partial", "body"]);
  });

  it("prefers whole-word matches and recent notes on ties", () => {
    const hits = search(
      [note("old", "Plan", "rain in the plains", 40), note("new", "Plan", "rain in the plains", 0)],
      "rain",
      now,
    );
    expect(hits.map((hit) => hit.item.id)).toEqual(["new", "old"]);
  });

  it("matches accents loosely and highlights the right characters", () => {
    const body = `${"Earlier words fill the opening of this note so the snippet starts later. ".repeat(2)}We met at the café near the lighthouse.`;
    const [hit] = search([note("a", "Notes", body)], "cafe lighthouse", now);
    const snippet = hit?.snippet;
    expect(snippet?.text.startsWith("…")).toBe(true);
    const marked = snippet?.matches.map(([start, end]) => snippet.text.slice(start, end));
    expect(marked).toEqual(["café", "lighthouse"]);
  });
});

describe("documentText", () => {
  it("reads blocks, captions and transcripts", () => {
    const document = {
      root: {
        children: [
          { type: "heading", children: [{ type: "text", text: "Title" }] },
          {
            type: "paragraph",
            children: [
              { type: "text", text: "Hello " },
              { type: "text", text: "world" },
            ],
          },
          {
            type: "list",
            children: [
              { type: "listitem", children: [{ type: "text", text: "Milk" }] },
              { type: "listitem", children: [{ type: "text", text: "Bread" }] },
            ],
          },
          { type: "image", src: "media:1", caption: "Sunset" },
          { type: "audio-clip", src: "media:2", transcript: "spoken words" },
        ],
      },
    };
    expect(documentText(document)).toBe("Title\nHello world\nMilk\nBread\nSunset\nspoken words");
  });
});
