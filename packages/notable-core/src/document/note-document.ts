import * as Y from "yjs";
import type { NoteKind, SurfaceKind, TranscriptSegment } from "../model";

/**
 * Layout of a note's Yjs document. Every client and the sync Durable Object
 * agree on these top-level names; changing one is a breaking change to
 * stored data.
 */
export const DocKeys = {
  meta: "meta",
  /** Lexical's rich-text tree, bound by `@lexical/yjs` (its default root name). */
  text: "root",
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
  text: (doc: Y.Doc) => doc.get(DocKeys.text, Y.XmlText) as Y.XmlText,
  canvas: (doc: Y.Doc) => doc.getMap<CanvasElement>(DocKeys.canvas),
  transcript: (doc: Y.Doc) => doc.getArray<TranscriptSegment>(DocKeys.transcript),

  title(doc: Y.Doc): string {
    const title = noteDoc.meta(doc).get("title");
    return typeof title === "string" ? title : "";
  },

  setTitle(doc: Y.Doc, title: string): void {
    noteDoc.meta(doc).set("title", title);
  },

  /** The transcript joined into prose, for search, excerpts and books. */
  transcriptText(doc: Y.Doc): string {
    return noteDoc
      .transcript(doc)
      .toArray()
      .map((s) => s.text.trim())
      .filter(Boolean)
      .join(" ");
  },
};
