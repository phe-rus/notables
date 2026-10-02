import { $convertFromMarkdownString } from "@lexical/markdown";
import { createBinding, type Provider, syncLexicalUpdateToYjs } from "@lexical/yjs";
import { createEditor, type SerializedEditorState } from "lexical";
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
 * Writes Markdown into an empty note document without an editor on screen,
 * exactly as the editor would store it, and returns the rendered document
 * for previews and search. The first `# heading` becomes the title.
 */
export function composeDocumentFromMarkdown(doc: Y.Doc, markdown: string): SerializedEditorState {
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
  editor.update(() => $convertFromMarkdownString(markdown, markdownTransformers), {
    discrete: true,
  });
  stop();
  return editor.getEditorState().toJSON();
}
