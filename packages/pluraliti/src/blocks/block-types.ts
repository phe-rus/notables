import { $createCodeNode } from "@lexical/code";
import {
  INSERT_CHECK_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
} from "@lexical/list";
import { $createHeadingNode, $createQuoteNode } from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  type LexicalEditor,
} from "lexical";

export type BlockType =
  | "title"
  | "heading"
  | "subheading"
  | "body"
  | "quote"
  | "code"
  | "bullet"
  | "number"
  | "check";

export const blockLabels: Record<BlockType, string> = {
  title: "Title",
  heading: "Heading",
  subheading: "Subheading",
  body: "Body",
  quote: "Quote",
  code: "Monospaced",
  bullet: "Bulleted List",
  number: "Numbered List",
  check: "Checklist",
};

const listCommands = {
  bullet: INSERT_UNORDERED_LIST_COMMAND,
  number: INSERT_ORDERED_LIST_COMMAND,
  check: INSERT_CHECK_LIST_COMMAND,
} as const;

/** Turns the selected blocks into `type`; choosing the active list type removes the list. */
export function setBlockType(editor: LexicalEditor, type: BlockType, current?: BlockType): void {
  if (type === "bullet" || type === "number" || type === "check") {
    editor.dispatchCommand(current === type ? REMOVE_LIST_COMMAND : listCommands[type], undefined);
    return;
  }

  editor.update(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return;
    $setBlocksType(selection, () => {
      switch (type) {
        case "title":
          return $createHeadingNode("h1");
        case "heading":
          return $createHeadingNode("h2");
        case "subheading":
          return $createHeadingNode("h3");
        case "quote":
          return $createQuoteNode();
        case "code":
          return $createCodeNode();
        default:
          return $createParagraphNode();
      }
    });
  });
}
