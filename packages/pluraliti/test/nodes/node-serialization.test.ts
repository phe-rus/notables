import { describe, expect, it } from "bun:test";
import { $convertFromMarkdownString, $convertToMarkdownString } from "@lexical/markdown";
import { $getRoot, createEditor, type LexicalEditor } from "lexical";
import { $createAudioClipNode, AudioClipNode, editorNodes } from "../../src/nodes/node-registry";
import { markdownTransformers } from "../../src/plugins/markdown/markdown-transformers";

function headless(): LexicalEditor {
  return createEditor({
    namespace: "test",
    nodes: editorNodes,
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
          markdownTransformers,
        ),
      { discrete: true },
    );

    const types = editor.getEditorState().read(() =>
      $getRoot()
        .getChildren()
        .map((node) => node.getType()),
    );
    expect(types).toEqual(["heading", "list", "quote", "paragraph"]);

    const markdown = editor
      .getEditorState()
      .read(() => $convertToMarkdownString(markdownTransformers));
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

it("preserves images, attachments, contents and editable tables through stored JSON", async () => {
  const { $createImageNode } = await import("../../src/nodes/image/image-node");
  const { $createAttachmentNode } = await import("../../src/nodes/attachment/attachment-node");
  const { $createContentsNode } = await import("../../src/nodes/contents/contents-node");
  const { $createTableNodeWithDimensions } = await import("@lexical/table");
  const editor = headless();
  editor.update(
    () => {
      $getRoot().append(
        $createImageNode({
          src: "media:photo",
          layout: { width: 50, aspect: "1 / 1", fit: "contain" },
        }),
        $createAttachmentNode({
          src: "media:file",
          name: "Budget.pdf",
          mime: "application/pdf",
          size: 123,
        }),
        $createContentsNode(),
        $createTableNodeWithDimensions(2, 3, true),
      );
    },
    { discrete: true },
  );
  const document = editor.getEditorState().toJSON();
  const restored = headless();
  restored.setEditorState(restored.parseEditorState(document));
  expect(restored.getEditorState().toJSON()).toEqual(document);
  expect(document.root.children.map((node) => node.type)).toEqual([
    "image",
    "attachment",
    "contents",
    "table",
  ]);
});
