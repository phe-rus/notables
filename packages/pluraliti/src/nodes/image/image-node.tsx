import {
  $applyNodeReplacement,
  DecoratorNode,
  type DOMConversionMap,
  type DOMConversionOutput,
  type DOMExportOutput,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
} from "lexical";
import type { JSX } from "react";
import { MediaImage } from "../../media/media-image";
import { RedrawButton } from "./redraw-button";

export type SerializedImageNode = Spread<
  {
    src: string;
    alt: string;
    caption: string;
    /** Set on drawn pages: the editable scene the image was rendered from. */
    scene?: string;
  },
  SerializedLexicalNode
>;

/** A photo in the flow of a note, journal or story, or a drawn page. */
export class ImageNode extends DecoratorNode<JSX.Element> {
  __src: string;
  __alt: string;
  __caption: string;
  __scene: string;

  static override getType(): string {
    return "image";
  }

  static override clone(node: ImageNode): ImageNode {
    return new ImageNode(node.__src, node.__alt, node.__caption, node.__scene, node.__key);
  }

  static override importJSON(json: SerializedImageNode): ImageNode {
    return $createImageNode(json);
  }

  /** Reads `<img>` and `<figure><img><figcaption>` from HTML, e.g. imported e-books. */
  static override importDOM(): DOMConversionMap {
    return {
      img: () => ({ conversion: convertImage, priority: 0 }),
      figure: (element: HTMLElement) =>
        element.querySelector("img") ? { conversion: convertFigure, priority: 1 } : null,
    };
  }

  constructor(src: string, alt = "", caption = "", scene = "", key?: NodeKey) {
    super(key);
    this.__src = src;
    this.__alt = alt;
    this.__caption = caption;
    this.__scene = scene;
  }

  /** Replaces a drawn page after it has been redrawn. */
  setDrawing(src: string, scene: string): void {
    const writable = this.getWritable();
    writable.__src = src;
    writable.__scene = scene;
  }

  override exportJSON(): SerializedImageNode {
    return {
      ...super.exportJSON(),
      type: "image",
      version: 1,
      src: this.__src,
      alt: this.__alt,
      caption: this.__caption,
      ...(this.__scene ? { scene: this.__scene } : {}),
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
        <MediaImage src={this.__src} alt={this.__alt} />
        {this.__scene && <RedrawButton nodeKey={this.__key} scene={this.__scene} />}
        {this.__caption && <figcaption className="nt-caption">{this.__caption}</figcaption>}
      </>
    );
  }
}

export interface ImageInput {
  src: string;
  alt?: string;
  caption?: string;
  scene?: string;
}

export function $createImageNode(input: ImageInput): ImageNode {
  return $applyNodeReplacement(new ImageNode(input.src, input.alt, input.caption, input.scene));
}

export function $isImageNode(node: LexicalNode | null | undefined): node is ImageNode {
  return node instanceof ImageNode;
}

function convertImage(element: HTMLElement): DOMConversionOutput {
  const img = element as HTMLImageElement;
  const src = img.getAttribute("src") ?? "";
  return {
    node: src ? $createImageNode({ src, alt: img.getAttribute("alt") ?? "", caption: "" }) : null,
  };
}

function convertFigure(element: HTMLElement): DOMConversionOutput {
  const img = element.querySelector("img");
  const src = img?.getAttribute("src") ?? "";
  const caption = element.querySelector("figcaption")?.textContent?.trim() ?? "";
  return {
    node: src ? $createImageNode({ src, alt: img?.getAttribute("alt") ?? "", caption }) : null,
    // The figure's children (the image and caption) are handled here.
    forChild: () => null,
  };
}
