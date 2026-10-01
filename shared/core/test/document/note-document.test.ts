import { describe, expect, it } from "bun:test";
import * as Y from "yjs";
import { createNoteDoc, DocKeys, noteDoc } from "../../src/document/note-document";
import {
  createPublicationSnapshot,
  excerpt,
  readingMinutes,
} from "../../src/publishing/publication-snapshot";

describe("note documents", () => {
  it("stores metadata under the shared layout", () => {
    const doc = createNoteDoc({ title: "Morning pages", kind: "journal", surfaces: ["text"] });
    expect(noteDoc.title(doc)).toBe("Morning pages");
    expect(noteDoc.meta(doc).get("kind")).toBe("journal");
  });

  it("uses Lexical's default Yjs root for rich text", () => {
    const doc = createNoteDoc({ title: "", kind: "note", surfaces: ["text"] });
    expect(DocKeys.text).toBe("root");
    expect(noteDoc.text(doc)).toBeInstanceOf(Y.XmlText);
  });

  it("merges concurrent edits from two devices", () => {
    const phone = createNoteDoc({ title: "Draft", kind: "story", surfaces: ["text"] });
    const laptop = new Y.Doc();
    Y.applyUpdate(laptop, Y.encodeStateAsUpdate(phone));

    noteDoc.transcript(phone).push([{ startMs: 0, endMs: 900, text: "Once upon a time" }]);
    noteDoc.setTitle(laptop, "The Lighthouse");

    Y.applyUpdate(phone, Y.encodeStateAsUpdate(laptop));
    Y.applyUpdate(laptop, Y.encodeStateAsUpdate(phone));

    expect(noteDoc.title(phone)).toBe("The Lighthouse");
    expect(noteDoc.transcriptText(laptop)).toBe("Once upon a time");
  });
});

describe("publishing", () => {
  it("snapshots without mutating the private document", () => {
    const doc = createNoteDoc({ title: "Essay", kind: "article", surfaces: ["text", "audio"] });
    noteDoc.transcript(doc).push([{ startMs: 0, endMs: 1200, text: "Recorded aside." }]);
    const before = Y.encodeStateVector(doc);

    const document = { root: { children: [] } };
    const snapshot = createPublicationSnapshot(doc, {
      kind: "article",
      text: "First paragraph.",
      document,
    });

    expect(snapshot.title).toBe("Essay");
    expect(snapshot.excerpt).toBe("First paragraph. Recorded aside.");
    expect(snapshot.document).toBe(document);
    expect(Y.encodeStateVector(doc)).toEqual(before);
  });

  it("falls back to Untitled", () => {
    const doc = createNoteDoc({ title: "  ", kind: "note", surfaces: ["text"] });
    expect(createPublicationSnapshot(doc, { kind: "note", text: "", document: null }).title).toBe(
      "Untitled",
    );
  });

  it("truncates excerpts on a word boundary", () => {
    const result = excerpt("word ".repeat(100), 50);
    expect(result.length).toBeLessThanOrEqual(50);
    expect(result.endsWith("word…")).toBe(true);
  });

  it("estimates reading time", () => {
    expect(readingMinutes("")).toBe(1);
    expect(readingMinutes("word ".repeat(690))).toBe(3);
  });
});
