import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getRoot } from "lexical";
import { useEffect, useRef } from "react";

/** Reports the document's plain text after edits (for titles, excerpts and search). */
export function TextChangePlugin({
  onChange,
  delayMs = 400,
}: {
  onChange: (text: string) => void;
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
          callback.current(editorState.read(() => $getRoot().getTextContent()));
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
