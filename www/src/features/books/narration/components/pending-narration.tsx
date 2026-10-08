import { useEditorCommands } from "@notables/pluraliti";
import { useEffect, useRef } from "react";
import { takeNarration } from "../lib/pending-narrations";

/**
 * Writes a queued narration into the chapter once its document is ready.
 * Render inside the chapter's NotesEditor.
 */
export function PendingNarration({ noteId, ready }: { noteId: string; ready: boolean }) {
  const { appendContent } = useEditorCommands();
  const applied = useRef(false);

  useEffect(() => {
    if (!ready || applied.current) return;
    applied.current = true;
    const narration = takeNarration(noteId);
    if (narration) appendContent(narration);
  }, [appendContent, noteId, ready]);

  return null;
}
