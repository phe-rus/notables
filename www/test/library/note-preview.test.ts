import { expect, test } from "bun:test";
import { previewContent } from "../../src/features/library/lib/note-preview";

const text = (value: string) => ({ type: "text", text: value });
test("gallery keeps the opening writing, checklist, table and adjacent photos", () => {
  expect(
    previewContent({
      root: {
        children: [
          { type: "heading", tag: "h1", children: [text("Shopping")] },
          {
            type: "list",
            listType: "check",
            children: [{ type: "listitem", checked: true, children: [text("Milk")] }],
          },
          { type: "table", children: [{ children: [{ children: [text("Budget")] }] }] },
          { type: "image", src: "media://one", layout: { width: 50 } },
          { type: "image", src: "media://two", layout: { width: 50 } },
        ],
      },
    }),
  ).toEqual([
    { kind: "heading", text: "Shopping", level: 1 },
    { kind: "check", text: "Milk", checked: true },
    { kind: "table", rows: [["Budget"]] },
    { kind: "image", src: "media://one", width: 50 },
    { kind: "image", src: "media://two", width: 50 },
  ]);
});

test("gallery index bounds long and deeply nested content", () => {
  let nested: unknown = text("Hidden deeply");
  for (let i = 0; i < 100; i++) nested = { children: [nested] };
  const blocks = previewContent({
    root: {
      children: [
        { type: "paragraph", children: [nested] },
        ...Array.from({ length: 100 }, () => ({
          type: "paragraph",
          children: [text("a".repeat(1000))],
        })),
      ],
    },
  });
  expect(blocks).toHaveLength(8);
  expect(blocks.every((block) => "text" in block && block.text.length === 160)).toBe(true);
});
