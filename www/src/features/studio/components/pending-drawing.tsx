import { useDrawingStudio, useEditorCommands } from "@notables/editor";
import { useEffect, useRef } from "react";
import { takeDrawing } from "../lib/pending-drawing";

/**
 * Opens the studio for a chapter that asked for a new page, and adds the
 * page at the end. Render inside the chapter's NotesEditor.
 */
export function PendingDrawing({ noteId, ready }: { noteId: string; ready: boolean }) {
  const studio = useDrawingStudio();
  const { appendContent } = useEditorCommands();
  const started = useRef(false);

  useEffect(() => {
    if (!ready || !studio || started.current || !takeDrawing(noteId)) return;
    started.current = true;
    void studio.open(null).then((drawing) => {
      if (drawing) appendContent({ images: [drawing] });
    });
  }, [appendContent, noteId, ready, studio]);

  return null;
}
