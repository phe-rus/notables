import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getRoot, COLLABORATION_TAG } from "lexical";
import { useEffect, useRef } from "react";
import type { DocumentSnapshot } from "../../hooks/use-document-snapshot";

export interface DocumentChange extends DocumentSnapshot {
  /**
   * `local` when the person changed it here (typing, pasting, undo);
   * `document` when it arrived from the shared document: loading it, or a
   * collaborator's edit. Only local changes, or document changes after the
   * first, mean the note was edited.
   */
  origin: "local" | "document";
}

/**
 * Reports the serialized document and its plain text after edits,
 * debounced, for titles, excerpts, search and assembling books.
 */
export function DocumentChangePlugin({
  onChange,
  delayMs = 400,
}: {
  onChange: (change: DocumentChange) => void;
  delayMs?: number;
}) {
  const [editor] = useLexicalComposerContext();
  const callback = useRef(onChange);
  callback.current = onChange;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    // One debounced report covers several updates; any local one makes it local.
    let local = false;
    const unregister = editor.registerUpdateListener(
      ({ editorState, dirtyElements, dirtyLeaves, tags }) => {
        if (dirtyElements.size === 0 && dirtyLeaves.size === 0) return;
        if (!tags.has(COLLABORATION_TAG)) local = true;
        clearTimeout(timer);
        timer = setTimeout(() => {
          const origin = local ? "local" : "document";
          local = false;
          callback.current({
            document: editorState.toJSON(),
            text: editorState.read(() => $getRoot().getTextContent()),
            origin,
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
