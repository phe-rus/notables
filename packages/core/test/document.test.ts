import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { createNoteDoc, noteDoc, toPlainText } from "../src/document";
import { createPublicationSnapshot, excerpt, readingMinutes } from "../src/publish";

function paragraph(text: string): Y.XmlElement {
  const p = new Y.XmlElement("paragraph");
  p.insert(0, [new Y.XmlText(text)]);
  return p;
}

describe("note documents", () => {
  it("stores metadata under the shared layout", () => {
    const doc = createNoteDoc({ title: "Morning pages", kind: "journal", surfaces: ["text"] });
    expect(noteDoc.title(doc)).toBe("Morning pages");
    expect(noteDoc.meta(doc).get("kind")).toBe("journal");
  });

  it("merges concurrent edits from two devices", () => {
    const phone = createNoteDoc({ title: "Draft", kind: "story", surfaces: ["text"] });
    const laptop = new Y.Doc();
    Y.applyUpdate(laptop, Y.encodeStateAsUpdate(phone));

    noteDoc.text(phone).push([paragraph("Once upon a time")]);
    noteDoc.setTitle(laptop, "The Lighthouse");

    Y.applyUpdate(phone, Y.encodeStateAsUpdate(laptop));
    Y.applyUpdate(laptop, Y.encodeStateAsUpdate(phone));

    expect(noteDoc.title(phone)).toBe("The Lighthouse");
    expect(toPlainText(laptop)).toBe("Once upon a time");
  });

  it("includes transcripts in plain text", () => {
    const doc = createNoteDoc({ title: "Voice memo", kind: "story", surfaces: ["audio"] });
    noteDoc.transcript(doc).push([
      { startMs: 0, endMs: 1200, text: "Hello" },
      { startMs: 1200, endMs: 2000, text: "world." },
    ]);
    expect(toPlainText(doc)).toBe("Hello world.");
  });
});

describe("publishing", () => {
  it("snapshots without mutating the private document", () => {
    const doc = createNoteDoc({ title: "Essay", kind: "article", surfaces: ["text"] });
    noteDoc.text(doc).push([paragraph("First paragraph."), paragraph("Second.")]);
    const before = Y.encodeStateVector(doc);

    const snapshot = createPublicationSnapshot(doc, "article");

    expect(snapshot.title).toBe("Essay");
    expect(snapshot.excerpt).toBe("First paragraph. Second.");
    expect(Y.encodeStateVector(doc)).toEqual(before);

    const restored = new Y.Doc();
    Y.applyUpdate(restored, snapshot.state);
    expect(toPlainText(restored)).toBe("First paragraph.\n\nSecond.");
  });

  it("falls back to Untitled", () => {
    const doc = createNoteDoc({ title: "", kind: "note", surfaces: ["text"] });
    expect(createPublicationSnapshot(doc, "note").title).toBe("Untitled");
  });

  it("truncates excerpts on a word boundary", () => {
    const text = "word ".repeat(100);
    const result = excerpt(text, 50);
    expect(result.length).toBeLessThanOrEqual(50);
    expect(result.endsWith("word…")).toBe(true);
  });

  it("estimates reading time", () => {
    expect(readingMinutes("")).toBe(1);
    expect(readingMinutes("word ".repeat(690))).toBe(3);
  });
});
