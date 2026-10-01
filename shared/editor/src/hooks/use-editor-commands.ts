import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useMemo } from "react";
import { INSERT_AUDIO_CLIP_COMMAND, INSERT_IMAGE_COMMAND } from "../plugins/media/media-plugin";

/** Editor actions for app-level controls rendered inside a NotesEditor. */
export function useEditorCommands() {
  const [editor] = useLexicalComposerContext();
  return useMemo(
    () => ({
      insertAudioClip: (clip: { src: string; durationMs: number; transcript?: string }) =>
        editor.dispatchCommand(INSERT_AUDIO_CLIP_COMMAND, clip),
      insertImage: (image: { src: string; alt?: string; caption?: string }) =>
        editor.dispatchCommand(INSERT_IMAGE_COMMAND, image),
      focus: () => editor.focus(),
    }),
    [editor],
  );
}
