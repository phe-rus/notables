import { describe, expect, it } from "bun:test";
import { documentBlocks } from "../../../src/features/books/export/document-blocks";
import {
  blocksToMarkdown,
  blocksToText,
} from "../../../src/features/books/export/formats/to-markdown";

const text = (value: string, format = 0) => ({ type: "text", text: value, format });

const document = {
  root: {
    children: [
      { type: "heading", tag: "h2", children: [text("The harbour")] },
      {
        type: "paragraph",
        children: [
          text("Rain came "),
          text("sideways", 1),
          text(" off the "),
          { type: "link", url: "https://example.com", children: [text("water")] },
          text("."),
        ],
      },
      { type: "quote", children: [text("Hold the line.", 2)] },
      {
        type: "list",
        listType: "check",
        children: [
          { type: "listitem", checked: true, children: [text("Ropes")] },
          { type: "listitem", checked: false, children: [text("Lamp")] },
        ],
      },
      { type: "image", src: "media:abc", alt: "Boat", caption: "At dawn" },
      { type: "paragraph", children: [] },
    ],
  },
};

describe("document blocks", () => {
  it("keeps styles, links, lists and media, and drops trailing blank lines", () => {
    const blocks = documentBlocks(document);
    expect(blocks.map((block) => block.type)).toEqual([
      "heading",
      "paragraph",
      "quote",
      "list",
      "image",
    ]);
    const paragraph = blocks[1];
    expect(paragraph?.type === "paragraph" && paragraph.inlines[1]).toEqual({
      text: "sideways",
      bold: true,
    });
    expect(paragraph?.type === "paragraph" && paragraph.inlines[3]?.href).toBe(
      "https://example.com",
    );
  });

  it("writes Markdown with media paths and checklists", () => {
    const markdown = blocksToMarkdown(documentBlocks(document), (src) =>
      src === "media:abc" ? "media/001.jpg" : null,
    );
    expect(markdown).toContain("### The harbour");
    expect(markdown).toContain("Rain came **sideways** off the [water](https://example.com).");
    expect(markdown).toContain("> *Hold the line.*");
    expect(markdown).toContain("- [x] Ropes\n- [ ] Lamp");
    expect(markdown).toContain("![Boat](media/001.jpg)");
  });

  it("writes plain text without markup", () => {
    const plain = blocksToText(documentBlocks(document));
    expect(plain).toContain("THE HARBOUR");
    expect(plain).toContain("Rain came sideways off the water.");
    expect(plain).toContain("[x] Ropes");
  });
});
