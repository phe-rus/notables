import { $isCodeNode } from "@lexical/code";
import { $isLinkNode } from "@lexical/link";
import { $isListNode, ListNode } from "@lexical/list";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $isHeadingNode, $isQuoteNode } from "@lexical/rich-text";
import { $getNearestNodeOfType, mergeRegister } from "@lexical/utils";
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  SELECTION_CHANGE_COMMAND,
} from "lexical";
import { useEffect, useState } from "react";
import type { BlockType } from "./blocks";

export interface SelectionState {
  block: BlockType;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  highlight: boolean;
  code: boolean;
  link: string | null;
}

const initial: SelectionState = {
  block: "body",
  bold: false,
  italic: false,
  underline: false,
  strikethrough: false,
  highlight: false,
  code: false,
  link: null,
};

function $readSelectionState(): SelectionState | null {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return null;

  const anchor = selection.anchor.getNode();
  const element = anchor.getKey() === "root" ? anchor : anchor.getTopLevelElementOrThrow();

  let block: BlockType = "body";
  if ($isListNode(element)) {
    const list = $getNearestNodeOfType(anchor, ListNode) ?? element;
    const type = list.getListType();
    block = type === "check" ? "check" : type === "number" ? "number" : "bullet";
  } else if ($isHeadingNode(element)) {
    const tag = element.getTag();
    block = tag === "h1" ? "title" : tag === "h2" ? "heading" : "subheading";
  } else if ($isQuoteNode(element)) {
    block = "quote";
  } else if ($isCodeNode(element)) {
    block = "code";
  }

  const parent = anchor.getParent();
  const link = $isLinkNode(parent) ? parent : $isLinkNode(anchor) ? anchor : null;

  return {
    block,
    bold: selection.hasFormat("bold"),
    italic: selection.hasFormat("italic"),
    underline: selection.hasFormat("underline"),
    strikethrough: selection.hasFormat("strikethrough"),
    highlight: selection.hasFormat("highlight"),
    code: selection.hasFormat("code"),
    link: link ? link.getURL() : null,
  };
}

/** Live formatting state of the current selection, for toolbars. */
export function useSelectionState(): SelectionState {
  const [editor] = useLexicalComposerContext();
  const [state, setState] = useState(initial);

  useEffect(() => {
    const read = () => {
      const next = $readSelectionState();
      if (next) setState(next);
    };
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => editorState.read(read)),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          read();
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [editor]);

  return state;
}
