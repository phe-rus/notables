import { describe, expect, it } from "bun:test";
import { $createHeadingNode } from "@lexical/rich-text";
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  createEditor,
  type LexicalEditor,
} from "lexical";
import { $appendContent } from "../../src/blocks/append-content";
import { editorNodes } from "../../src/nodes/node-registry";

function editorWith(setup: () => void): LexicalEditor {
  const editor = createEditor({
    namespace: "t",
    nodes: editorNodes,
    onError: (e) => {
      throw e;
    },
  });
  editor.update(setup, { discrete: true });
  return editor;
}

const types = (editor: LexicalEditor) =>
  editor.getEditorState().read(() =>
    $getRoot()
      .getChildren()
      .map((n) => `${n.getType()}:${n.getTextContent()}`),
  );

describe("$appendContent", () => {
  it("fills an empty title line and appends the clip and paragraphs", () => {
    const editor = editorWith(() => $getRoot().append($createHeadingNode("h1")));
    editor.update(
      () =>
        $appendContent({
          title: "Chapter 3",
          audioClip: { src: "media:a", durationMs: 1000, transcript: "Hello there" },
          paragraphs: ["Hello there.", "Second thought."],
        }),
      { discrete: true },
    );
    expect(types(editor)).toEqual([
      "heading:Chapter 3",
      "audio-clip:Hello there",
      "paragraph:Hello there.",
      "paragraph:Second thought.",
    ]);
  });

  it("never overwrites a note that already has content", () => {
    const editor = editorWith(() =>
      $getRoot().append($createHeadingNode("h1").append($createTextNode("Kept"))),
    );
    editor.update(() => $appendContent({ title: "Ignored", paragraphs: ["More"] }), {
      discrete: true,
    });
    expect(types(editor)).toEqual(["heading:Kept", "paragraph:More"]);
  });

  it("adds a title to an empty document", () => {
    const editor = editorWith(() => $getRoot().append($createParagraphNode()));
    editor.update(() => $appendContent({ title: "Fresh" }), { discrete: true });
    expect(types(editor)).toEqual(["heading:Fresh"]);
  });
});
