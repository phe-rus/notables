import {
  $applyNodeReplacement,
  DecoratorNode,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
} from "lexical";
import type { JSX } from "react";
import { InkBlock } from "./ink-block";
import { INK_DEFAULT_HEIGHT, type InkStroke } from "./ink-model";

export type SerializedInkNode = Spread<
  { strokes: InkStroke[]; height: number },
  SerializedLexicalNode
>;

/** Handwriting or a sketch, drawn with a pen, finger or mouse. */
export class InkNode extends DecoratorNode<JSX.Element> {
  __strokes: InkStroke[];
  __height: number;

  static override getType(): string {
    return "ink";
  }

  static override clone(node: InkNode): InkNode {
    return new InkNode(node.__strokes, node.__height, node.__key);
  }

  static override importJSON(json: SerializedInkNode): InkNode {
    return $createInkNode(json);
  }

  constructor(strokes: InkStroke[] = [], height = INK_DEFAULT_HEIGHT, key?: NodeKey) {
    super(key);
    this.__strokes = strokes;
    this.__height = height;
  }

  override exportJSON(): SerializedInkNode {
    return {
      ...super.exportJSON(),
      type: "ink",
      version: 1,
      strokes: this.__strokes,
      height: this.__height,
    };
  }

  override createDOM(): HTMLElement {
    const el = document.createElement("div");
    el.className = "nt-ink-block";
    return el;
  }

  override updateDOM(): false {
    return false;
  }

  override isInline(): false {
    return false;
  }

  override getTextContent(): string {
    return "";
  }

  setInk(strokes: InkStroke[], height: number): this {
    const writable = this.getWritable();
    writable.__strokes = strokes;
    writable.__height = height;
    return writable;
  }

  override decorate(): JSX.Element {
    return <InkBlock nodeKey={this.getKey()} strokes={this.__strokes} height={this.__height} />;
  }
}

export function $createInkNode(input: { strokes?: InkStroke[]; height?: number } = {}): InkNode {
  return $applyNodeReplacement(new InkNode(input.strokes ?? [], input.height));
}

export function $isInkNode(node: LexicalNode | null | undefined): node is InkNode {
  return node instanceof InkNode;
}
