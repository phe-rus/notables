import { $createHeadingNode, $isHeadingNode } from "@lexical/rich-text";
import { $createParagraphNode, $createTextNode, $getRoot } from "lexical";
import { $createAudioClipNode } from "../nodes/audio-clip/audio-clip-node";
import { $createImageNode, type ImageInput } from "../nodes/image/image-node";

export interface AudioClipInput {
  src: string;
  durationMs: number;
  transcript?: string;
}

/** Content to write into a note programmatically, e.g. a narrated chapter. */
export interface ComposedContent {
  /** Fills the title line if the note has no title yet. */
  title?: string;
  audioClip?: AudioClipInput;
  paragraphs?: string[];
  /** Photos or drawn pages, after any paragraphs. */
  images?: ImageInput[];
}

/** Appends content to the document. Call inside `editor.update`. */
export function $appendContent({
  title,
  audioClip,
  paragraphs = [],
  images = [],
}: ComposedContent): void {
  const root = $getRoot();
  if (title) {
    const first = root.getFirstChild();
    if ($isHeadingNode(first) && first.getTextContent().trim() === "") {
      first.append($createTextNode(title));
    } else if (root.getTextContent().trim() === "") {
      root.clear();
      root.append($createHeadingNode("h1").append($createTextNode(title)));
    }
  }
  if (audioClip) root.append($createAudioClipNode(audioClip));
  for (const text of paragraphs) {
    root.append($createParagraphNode().append($createTextNode(text)));
  }
  for (const image of images) root.append($createImageNode(image));
}
