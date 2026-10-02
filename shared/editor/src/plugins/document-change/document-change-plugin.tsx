import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getRoot } from "lexical";
import { useEffect, useRef } from "react";
import type { DocumentSnapshot } from "../../hooks/use-document-snapshot";

/**
 * Reports the serialized document and its plain text after edits,
 * debounced, for titles, excerpts, search and assembling books.
 */
export function DocumentChangePlugin({
  onChange,
  delayMs = 400,
}: {
  onChange: (snapshot: DocumentSnapshot) => void;
  delayMs?: number;
}) {
  const [editor] = useLexicalComposerContext();
  const callback = useRef(onChange);
  callback.current = onChange;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unregister = editor.registerUpdateListener(
      ({ editorState, dirtyElements, dirtyLeaves }) => {
        if (dirtyElements.size === 0 && dirtyLeaves.size === 0) return;
        clearTimeout(timer);
        timer = setTimeout(() => {
          callback.current({
            document: editorState.toJSON(),
            text: editorState.read(() => $getRoot().getTextContent()),
          });
        }, delayMs);
      },
    );
    return () => {
      clearTimeout(timer);
      unregister();
    };
  }, [editor, delayMs]);

  return null;
}
