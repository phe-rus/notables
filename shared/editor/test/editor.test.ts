import { describe, expect, it } from "bun:test";
import { $convertFromMarkdownString, $convertToMarkdownString } from "@lexical/markdown";
import { $getRoot, createEditor, type LexicalEditor } from "lexical";
import { $createAudioClipNode, AudioClipNode, nodes } from "../src/nodes";
import { transformers } from "../src/plugins/markdown";

function headless(): LexicalEditor {
  return createEditor({
    namespace: "test",
    nodes,
    onError: (error) => {
      throw error;
    },
  });
}

describe("editor document model", () => {
  it("imports markdown shortcuts into rich blocks", () => {
    const editor = headless();
    editor.update(
      () =>
        $convertFromMarkdownString(
          "# Title\n\n- [ ] Record grandma\n- [x] Outline\n\n> quoted\n\nSome ==bright== text",
          transformers,
        ),
      { discrete: true },
    );

    const types = editor.getEditorState().read(() =>
      $getRoot()
        .getChildren()
        .map((node) => node.getType()),
    );
    expect(types).toEqual(["heading", "list", "quote", "paragraph"]);

    const markdown = editor.getEditorState().read(() => $convertToMarkdownString(transformers));
    expect(markdown).toContain("- [ ] Record grandma");
    expect(markdown).toContain("- [x] Outline");
    expect(markdown).toContain("==bright==");
  });

  it("round-trips audio clips through JSON with their transcript as text", () => {
    const editor = headless();
    editor.update(
      () => {
        $getRoot().append(
          $createAudioClipNode({
            src: "clip.m4a",
            durationMs: 2000,
            transcript: "the sea keeps every promise",
          }),
        );
      },
      { discrete: true },
    );

    const json = editor.getEditorState().toJSON();
    const restored = headless();
    restored.setEditorState(restored.parseEditorState(json));

    restored.getEditorState().read(() => {
      const [clip] = $getRoot().getChildren();
      expect(clip).toBeInstanceOf(AudioClipNode);
      expect($getRoot().getTextContent()).toContain("the sea keeps every promise");
    });
  });
});
