import {
  CHECK_LIST,
  type TextFormatTransformer,
  TRANSFORMERS,
  type Transformer,
} from "@lexical/markdown";

/** `==text==` highlights, matching the editor's highlighter. */
export const HIGHLIGHT: TextFormatTransformer = {
  format: ["highlight"],
  tag: "==",
  type: "text-format",
};

/** Markdown shortcuts typed inline: `#`, `>`, `-`, `1.`, `[ ]`, `**`, `==`, ``` and more. */
export const transformers: Transformer[] = [CHECK_LIST, HIGHLIGHT, ...TRANSFORMERS];
