import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useMemo } from "react";
import {
  $appendContent,
  type AudioClipInput,
  type ComposedContent,
} from "../blocks/append-content";
import type { AttachmentInput } from "../nodes/attachment/attachment-node";
import type { ImageInput } from "../nodes/image/image-node";
import type { LinkCardInput } from "../nodes/link-card/link-card-node";
import {
  INSERT_ATTACHMENT_COMMAND,
  INSERT_AUDIO_CLIP_COMMAND,
  INSERT_IMAGE_COMMAND,
  INSERT_LINK_CARD_COMMAND,
} from "../plugins/media/media-plugin";

/** Editor actions for app-level controls rendered inside a NotesEditor. */
export function useEditorCommands() {
  const [editor] = useLexicalComposerContext();
  return useMemo(
    () => ({
      insertLinkCard: (input: LinkCardInput) =>
        editor.dispatchCommand(INSERT_LINK_CARD_COMMAND, input),
      insertAttachment: (input: AttachmentInput) =>
        editor.dispatchCommand(INSERT_ATTACHMENT_COMMAND, input),
      insertAudioClip: (clip: AudioClipInput) =>
        editor.dispatchCommand(INSERT_AUDIO_CLIP_COMMAND, clip),
      insertImage: (image: ImageInput) => editor.dispatchCommand(INSERT_IMAGE_COMMAND, image),
      /** Appends content at the end of the note as one undoable edit. */
      appendContent: (content: ComposedContent) => editor.update(() => $appendContent(content)),
      focus: () => editor.focus(),
    }),
    [editor],
  );
}
