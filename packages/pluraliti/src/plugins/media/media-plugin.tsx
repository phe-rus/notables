import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $insertNodeToNearestRoot, mergeRegister } from "@lexical/utils";
import { COMMAND_PRIORITY_EDITOR, createCommand, type LexicalCommand } from "lexical";
import { useEffect } from "react";
import { markInkInserted } from "../../nodes/ink/ink-block";
import {
  $createAudioClipNode,
  $createImageNode,
  $createInkNode,
  type ImageInput,
} from "../../nodes/node-registry";

export const INSERT_IMAGE_COMMAND: LexicalCommand<ImageInput> =
  createCommand("INSERT_IMAGE_COMMAND");

export const INSERT_AUDIO_CLIP_COMMAND: LexicalCommand<{
  src: string;
  durationMs: number;
  transcript?: string;
}> = createCommand("INSERT_AUDIO_CLIP_COMMAND");

/** A handwriting area, ready for a pen, finger or mouse. */
export const INSERT_INK_COMMAND: LexicalCommand<void> = createCommand("INSERT_INK_COMMAND");

/** Inserts photos, recordings and handwriting as top-level blocks at the caret. */
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
          INSERT_INK_COMMAND,
          () => {
            markInkInserted();
            $insertNodeToNearestRoot($createInkNode());
            // On a touch screen the page is for the pen or finger: no keyboard over it.
            if (window.matchMedia("(pointer: coarse)").matches) {
              setTimeout(() => editor.blur(), 0);
            }
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
