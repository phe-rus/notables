import { CodeNode } from "@lexical/code";
import { AutoLinkNode, LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import { HorizontalRuleNode } from "@lexical/react/LexicalHorizontalRuleNode";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import type { Klass, LexicalNode } from "lexical";
import { AudioClipNode } from "./audio-clip/audio-clip-node";
import { ImageNode } from "./image/image-node";
import { InkNode } from "./ink/ink-node";

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
  AudioClipNode,
  InkNode,
];
