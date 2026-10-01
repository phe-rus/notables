import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getRoot, type SerializedEditorState } from "lexical";
import { useCallback } from "react";

export interface DocumentSnapshot {
  /** Lexical's serialized document; render it with `DocumentView`. */
  document: SerializedEditorState;
  /** Plain text, for excerpts, search and reading time. */
  text: string;
}

/** Returns a function that captures the current document (e.g. to publish it). */
export function useDocumentSnapshot(): () => DocumentSnapshot {
  const [editor] = useLexicalComposerContext();
  return useCallback(() => {
    const state = editor.getEditorState();
    return {
      document: state.toJSON(),
      text: state.read(() => $getRoot().getTextContent()),
    };
  }, [editor]);
}
