import { CodeNode } from "@lexical/code";
import { AutoLinkNode, LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import { HorizontalRuleNode } from "@lexical/react/LexicalHorizontalRuleNode";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { TableCellNode, TableNode, TableRowNode } from "@lexical/table";
import type { Klass, LexicalNode } from "lexical";
import { AttachmentNode } from "./attachment/attachment-node";
import { AudioClipNode } from "./audio-clip/audio-clip-node";
import { ContentsNode } from "./contents/contents-node";
import { ImageNode } from "./image/image-node";
import { InkNode } from "./ink/ink-node";
import { LinkCardNode } from "./link-card/link-card-node";

export * from "./audio-clip/audio-clip-node";
export * from "./image/image-node";
export * from "./ink/ink-model";
export * from "./ink/ink-node";
export { InkView } from "./ink/ink-view";

/** Every node the Notables editor understands. Stored documents depend on these types. */
export const editorNodes: Array<Klass<LexicalNode>> = [
  HeadingNode,
  QuoteNode,
  ListNode,
  ListItemNode,
  CodeNode,
  LinkNode,
  AutoLinkNode,
  HorizontalRuleNode,
  ImageNode,
  AttachmentNode,
  ContentsNode,
  LinkCardNode,
  AudioClipNode,
  InkNode,
  TableNode,
  TableRowNode,
  TableCellNode,
];
