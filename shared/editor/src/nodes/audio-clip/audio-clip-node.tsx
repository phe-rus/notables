import {
  $applyNodeReplacement,
  DecoratorNode,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
} from "lexical";
import type { JSX } from "react";
import { AudioClip } from "./audio-clip-player";

export type SerializedAudioClipNode = Spread<
  { src: string; durationMs: number; transcript: string },
  SerializedLexicalNode
>;

/** A recording embedded in a note, with its transcript. */
export class AudioClipNode extends DecoratorNode<JSX.Element> {
  __src: string;
  __durationMs: number;
  __transcript: string;

  static override getType(): string {
    return "audio-clip";
  }

  static override clone(node: AudioClipNode): AudioClipNode {
    return new AudioClipNode(node.__src, node.__durationMs, node.__transcript, node.__key);
  }

  static override importJSON(json: SerializedAudioClipNode): AudioClipNode {
    return $createAudioClipNode(json);
  }

  constructor(src: string, durationMs: number, transcript = "", key?: NodeKey) {
    super(key);
    this.__src = src;
    this.__durationMs = durationMs;
    this.__transcript = transcript;
  }

  override exportJSON(): SerializedAudioClipNode {
    return {
      ...super.exportJSON(),
      type: "audio-clip",
      version: 1,
      src: this.__src,
      durationMs: this.__durationMs,
      transcript: this.__transcript,
    };
  }

  override createDOM(): HTMLElement {
    const el = document.createElement("div");
    el.className = "nt-audio-block";
    return el;
  }

  override updateDOM(): false {
    return false;
  }

  override isInline(): false {
    return false;
  }

  override getTextContent(): string {
    return this.__transcript;
  }

  setTranscript(transcript: string): this {
    const writable = this.getWritable();
    writable.__transcript = transcript;
    return writable;
  }

  override decorate(): JSX.Element {
    return (
      <AudioClip src={this.__src} durationMs={this.__durationMs} transcript={this.__transcript} />
    );
  }
}

export function $createAudioClipNode(input: {
  src: string;
  durationMs: number;
  transcript?: string;
}): AudioClipNode {
  return $applyNodeReplacement(new AudioClipNode(input.src, input.durationMs, input.transcript));
}

export function $isAudioClipNode(node: LexicalNode | null | undefined): node is AudioClipNode {
  return node instanceof AudioClipNode;
}
