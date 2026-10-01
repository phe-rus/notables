import {
  $applyNodeReplacement,
  DecoratorNode,
  type DOMExportOutput,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
} from "lexical";
import type { JSX } from "react";
import { useMediaSource } from "../../media/media-source";

export type SerializedImageNode = Spread<
  { src: string; alt: string; caption: string },
  SerializedLexicalNode
>;

/** A photo in the flow of a note, journal or story. */
export class ImageNode extends DecoratorNode<JSX.Element> {
  __src: string;
  __alt: string;
  __caption: string;

  static override getType(): string {
    return "image";
  }

  static override clone(node: ImageNode): ImageNode {
    return new ImageNode(node.__src, node.__alt, node.__caption, node.__key);
  }

  static override importJSON(json: SerializedImageNode): ImageNode {
    return $createImageNode(json);
  }

  constructor(src: string, alt = "", caption = "", key?: NodeKey) {
    super(key);
    this.__src = src;
    this.__alt = alt;
    this.__caption = caption;
  }

  override exportJSON(): SerializedImageNode {
    return {
      ...super.exportJSON(),
      type: "image",
      version: 1,
      src: this.__src,
      alt: this.__alt,
      caption: this.__caption,
    };
  }

  override exportDOM(): DOMExportOutput {
    const img = document.createElement("img");
    img.src = this.__src;
    img.alt = this.__alt;
    return { element: img };
  }

  override createDOM(): HTMLElement {
    const el = document.createElement("figure");
    el.className = "nt-figure";
    return el;
  }

  override updateDOM(): false {
    return false;
  }

  override isInline(): false {
    return false;
  }

  override decorate(): JSX.Element {
    return (
      <>
        <ImageView src={this.__src} alt={this.__alt} />
        {this.__caption && <figcaption className="nt-caption">{this.__caption}</figcaption>}
      </>
    );
  }
}

export function $createImageNode(input: {
  src: string;
  alt?: string;
  caption?: string;
}): ImageNode {
  return $applyNodeReplacement(new ImageNode(input.src, input.alt, input.caption));
}

export function $isImageNode(node: LexicalNode | null | undefined): node is ImageNode {
  return node instanceof ImageNode;
}

function ImageView({ src, alt }: { src: string; alt: string }) {
  const playableSrc = useMediaSource(src);
  return playableSrc ? (
    <img className="nt-image" src={playableSrc} alt={alt} draggable={false} />
  ) : (
    <div className="nt-image nt-image-pending" role="img" aria-label={alt || "Photo"} />
  );
}
