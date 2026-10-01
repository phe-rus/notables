import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useMemo } from "react";
import {
  $appendContent,
  type AudioClipInput,
  type ComposedContent,
} from "../blocks/append-content";
import { INSERT_AUDIO_CLIP_COMMAND, INSERT_IMAGE_COMMAND } from "../plugins/media/media-plugin";

/** Editor actions for app-level controls rendered inside a NotesEditor. */
export function useEditorCommands() {
  const [editor] = useLexicalComposerContext();
  return useMemo(
    () => ({
      insertAudioClip: (clip: AudioClipInput) =>
        editor.dispatchCommand(INSERT_AUDIO_CLIP_COMMAND, clip),
      insertImage: (image: { src: string; alt?: string; caption?: string }) =>
        editor.dispatchCommand(INSERT_IMAGE_COMMAND, image),
      /** Appends content at the end of the note as one undoable edit. */
      appendContent: (content: ComposedContent) => editor.update(() => $appendContent(content)),
      focus: () => editor.focus(),
    }),
    [editor],
  );
}
