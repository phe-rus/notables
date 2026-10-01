import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $insertNodeToNearestRoot, mergeRegister } from "@lexical/utils";
import { COMMAND_PRIORITY_EDITOR, createCommand, type LexicalCommand } from "lexical";
import { useEffect } from "react";
import { $createAudioClipNode, $createImageNode } from "../nodes";

export const INSERT_IMAGE_COMMAND: LexicalCommand<{ src: string; alt?: string; caption?: string }> =
  createCommand("INSERT_IMAGE_COMMAND");

export const INSERT_AUDIO_CLIP_COMMAND: LexicalCommand<{
  src: string;
  durationMs: number;
  transcript?: string;
}> = createCommand("INSERT_AUDIO_CLIP_COMMAND");

/** Inserts photos and recordings as top-level blocks at the caret. */
export function MediaPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(
    () =>
      mergeRegister(
        editor.registerCommand(
          INSERT_IMAGE_COMMAND,
          (payload) => {
            $insertNodeToNearestRoot($createImageNode(payload));
            return true;
          },
          COMMAND_PRIORITY_EDITOR,
        ),
        editor.registerCommand(
          INSERT_AUDIO_CLIP_COMMAND,
          (payload) => {
            $insertNodeToNearestRoot($createAudioClipNode(payload));
            return true;
          },
          COMMAND_PRIORITY_EDITOR,
        ),
      ),
    [editor],
  );

  return null;
}
