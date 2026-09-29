import * as Y from "yjs";
import type { NoteKind, SurfaceKind, TranscriptSegment } from "./schemas";

/**
 * Layout of a note's Yjs document. Every client and the sync worker agree on
 * these top-level names; changing one is a breaking change to stored data.
 */
export const DocKeys = {
  meta: "meta",
  text: "text",
  canvas: "canvas",
  transcript: "transcript",
} as const;

export interface CanvasElement {
  id: string;
  type: "ink" | "shape" | "sticky" | "image" | "text" | "link";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  z: number;
  data: Record<string, unknown>;
}

export interface NoteDocInit {
  title: string;
  kind: NoteKind;
  surfaces: SurfaceKind[];
}

export function createNoteDoc(init: NoteDocInit): Y.Doc {
  const doc = new Y.Doc();
  doc.transact(() => {
    const meta = doc.getMap(DocKeys.meta);
    meta.set("title", init.title);
    meta.set("kind", init.kind);
    meta.set("surfaces", init.surfaces);
  });
  return doc;
}

export const noteDoc = {
  meta: (doc: Y.Doc) => doc.getMap<unknown>(DocKeys.meta),
  text: (doc: Y.Doc) => doc.getXmlFragment(DocKeys.text),
  canvas: (doc: Y.Doc) => doc.getMap<CanvasElement>(DocKeys.canvas),
  transcript: (doc: Y.Doc) => doc.getArray<TranscriptSegment>(DocKeys.transcript),

  title(doc: Y.Doc): string {
    const title = noteDoc.meta(doc).get("title");
    return typeof title === "string" ? title : "";
  },

  setTitle(doc: Y.Doc, title: string): void {
    noteDoc.meta(doc).set("title", title);
  },
};

/** Flattens the rich-text fragment (and transcript, if any) to plain text. */
export function toPlainText(doc: Y.Doc): string {
  const blocks: string[] = [];

  const walk = (node: Y.XmlElement | Y.XmlText | Y.XmlFragment): string => {
    if (node instanceof Y.XmlText) return node.toString().replace(/<[^>]+>/g, "");
    return node
      .toArray()
      .map((child) => walk(child as Y.XmlElement | Y.XmlText))
      .join("");
  };

  for (const child of noteDoc.text(doc).toArray()) {
    const text = walk(child as Y.XmlElement | Y.XmlText).trim();
    if (text) blocks.push(text);
  }

  const transcript = noteDoc
    .transcript(doc)
    .toArray()
    .map((s) => s.text.trim())
    .filter(Boolean)
    .join(" ");
  if (transcript) blocks.push(transcript);

  return blocks.join("\n\n");
}
