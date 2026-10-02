import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $setSelection,
  type BaseSelection,
  type LexicalNode,
} from "lexical";
import { useMemo, useRef } from "react";

/** The text a writing helper works from: the selection if there is one, else the note. */
export interface WritingSource {
  selected: string;
  full: string;
}

/**
 * Lets tools outside the editor (such as an AI writing helper) read the
 * note and put text back where the person was. The selection is kept from
 * the moment the tool starts, since opening the tool moves focus away.
 */
export function useWritingBridge() {
  const [editor] = useLexicalComposerContext();
  const saved = useRef<BaseSelection | null>(null);

  return useMemo(() => {
    const paragraphs = (text: string) =>
      text
        .split(/\n{2,}/)
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => $createParagraphNode().append($createTextNode(part)));

    /** The top-level block the person was in, or the last one. */
    const $anchorBlock = (): LexicalNode | null => {
      const selection = saved.current ?? $getSelection();
      if ($isRangeSelection(selection)) {
        const node = selection.isBackward()
          ? selection.anchor.getNode()
          : selection.focus.getNode();
        return node.getTopLevelElement() ?? node;
      }
      return $getRoot().getLastChild();
    };

    return {
      read(): WritingSource {
        let source: WritingSource = { selected: "", full: "" };
        editor.getEditorState().read(() => {
          const selection = $getSelection();
          saved.current = selection ? selection.clone() : null;
          source = {
            selected: $isRangeSelection(selection) ? selection.getTextContent().trim() : "",
            full: $getRoot().getTextContent(),
          };
        });
        return source;
      },

      /** New paragraphs after the block the person was in. */
      insertBelow(text: string) {
        editor.update(() => {
          let after = $anchorBlock();
          for (const paragraph of paragraphs(text)) {
            if (after) after.insertAfter(paragraph);
            else $getRoot().append(paragraph);
            after = paragraph;
          }
        });
      },

      /** Swaps the selected words for new ones; with nothing selected, adds below. */
      replaceSelection(text: string) {
        editor.update(() => {
          const selection = saved.current;
          if ($isRangeSelection(selection) && !selection.isCollapsed()) {
            $setSelection(selection.clone());
            const live = $getSelection();
            if ($isRangeSelection(live)) {
              live.insertText(text.replace(/\n{2,}/g, "\n").trim());
              return;
            }
          }
          let after = $anchorBlock();
          for (const paragraph of paragraphs(text)) {
            if (after) after.insertAfter(paragraph);
            else $getRoot().append(paragraph);
            after = paragraph;
          }
        });
      },

      /** Rewrites the note's first line, its title. */
      setTitle(title: string) {
        editor.update(() => {
          const first = $getRoot().getFirstChild();
          const clean = title.replace(/^["“]|["”]$/g, "").trim();
          if ($isElementNode(first)) {
            first.clear();
            first.append($createTextNode(clean));
          } else {
            $getRoot().splice(0, 0, [$createParagraphNode().append($createTextNode(clean))]);
          }
        });
      },
    };
  }, [editor]);
}
