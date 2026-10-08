import { $generateNodesFromDOM } from "@lexical/html";
import { $convertFromMarkdownString } from "@lexical/markdown";
import { $createHeadingNode } from "@lexical/rich-text";
import { createBinding, type Provider, syncLexicalUpdateToYjs } from "@lexical/yjs";
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isDecoratorNode,
  $isElementNode,
  createEditor,
  type LexicalEditor,
  type SerializedEditorState,
} from "lexical";
import type * as Y from "yjs";
import { editorTheme } from "../editor/editor-theme";
import { editorNodes } from "../nodes/node-registry";
import { markdownTransformers } from "../plugins/markdown/markdown-transformers";

/** A provider that is never connected: composing happens on this device only. */
function offlineProvider(): Provider {
  const awareness = {
    getLocalState: () => null,
    getStates: () => new Map(),
    off: () => {},
    on: () => {},
    setLocalState: () => {},
    setLocalStateField: () => {},
  };
  return {
    awareness,
    connect: () => {},
    disconnect: () => {},
    off: () => {},
    on: () => {},
  } as unknown as Provider;
}

/**
 * Writes into an empty note document without an editor on screen, exactly
 * as the editor would store it, and returns the rendered document for
 * previews and search. `write` runs inside an editor update, so it can use
 * Lexical's `$` functions and the helpers below.
 */
export function composeDocument(
  doc: Y.Doc,
  write: (editor: LexicalEditor) => void,
): SerializedEditorState {
  const editor = createEditor({
    namespace: "notables:compose",
    theme: editorTheme,
    nodes: editorNodes,
    onError(error) {
      throw error;
    },
  });
  const provider = offlineProvider();
  const id = "compose";
  const binding = createBinding(editor, provider, id, doc, new Map([[id, doc]]));
  const stop = editor.registerUpdateListener(
    ({ prevEditorState, editorState, dirtyElements, dirtyLeaves, normalizedNodes, tags }) => {
      syncLexicalUpdateToYjs(
        binding,
        provider,
        prevEditorState,
        editorState,
        dirtyElements,
        dirtyLeaves,
        normalizedNodes,
        tags,
      );
    },
  );
  editor.update(() => write(editor), { discrete: true });
  stop();
  return editor.getEditorState().toJSON();
}

/** The first `# heading` becomes the title. */
export function composeDocumentFromMarkdown(doc: Y.Doc, markdown: string): SerializedEditorState {
  return composeDocument(doc, () => $convertFromMarkdownString(markdown, markdownTransformers));
}

/**
 * Converts HTML (an e-book chapter, say) into a note with `title` as its
 * title line. Needs a DOM, so runs in the app rather than on a server.
 */
export function composeDocumentFromHtml(
  doc: Y.Doc,
  html: string,
  title: string,
): SerializedEditorState {
  return composeDocument(doc, (editor) => {
    const dom = new DOMParser().parseFromString(html, "text/html");
    const root = $getRoot();
    root.clear();
    root.append($createHeadingNode("h1").append($createTextNode(title)));
    // Inline nodes at the top level (bare text, links) are gathered into paragraphs.
    let paragraph: ReturnType<typeof $createParagraphNode> | null = null;
    for (const node of $generateNodesFromDOM(editor, dom)) {
      if ($isElementNode(node) || $isDecoratorNode(node)) {
        if ($isElementNode(node) && node.isInline()) {
          paragraph ??= $createParagraphNode();
          paragraph.append(node);
          continue;
        }
        if (paragraph) root.append(paragraph);
        paragraph = null;
        root.append(node);
      } else if (node.getTextContent().trim()) {
        paragraph ??= $createParagraphNode();
        paragraph.append(node);
      }
    }
    if (paragraph) root.append(paragraph);
  });
}
