import { describe, expect, it } from "bun:test";
import { XMLValidator } from "fast-xml-parser";
import { strFromU8, unzipSync } from "fflate";
import { buildEpub } from "../../src/features/books/export/build-epub";
import type { BookEntry } from "../../src/features/books/store/book-store";

const book: BookEntry = {
  id: "0199b4a2-0000-7000-8000-000000000001",
  title: "The Lighthouse Keeper & Other Stories",
  subtitle: "Tales from the island",
  author: "Amara Okello",
  chapterIds: ["a", "b"],
  createdAt: 0,
  updatedAt: 0,
};

const PNG_PIXEL =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

const paragraph = (text: string) => ({
  type: "paragraph",
  children: [{ type: "text", text, format: 1 }],
});

const chapters = [
  {
    noteId: "a",
    title: "The fog came in at dusk",
    document: {
      root: {
        children: [
          {
            type: "heading",
            tag: "h1",
            children: [{ type: "text", text: "The fog came in at dusk", format: 0 }],
          },
          paragraph("Nobody remembered the last time the lamp had failed. “Never”, they said."),
          {
            type: "image",
            src: `data:image/png;base64,${PNG_PIXEL}`,
            alt: "Lighthouse",
            caption: "At dusk",
          },
          {
            type: "audio-clip",
            src: "media:clip-1",
            durationMs: 2000,
            transcript: "The sea keeps every promise.",
          },
          {
            type: "audio-clip",
            src: "media:clip-webm",
            durationMs: 1000,
            transcript: "Gulls overhead.",
          },
          { type: "linebreak" },
        ],
      },
    },
  },
  { noteId: "b", title: "Morning <after>", document: null },
];

async function build() {
  const bytes = await buildEpub({
    book,
    chapters,
    loadMedia: async (id) =>
      id === "clip-1"
        ? new Blob(["ftyp-audio"], { type: id === "clip-1" ? "audio/mp4" : "audio/webm" })
        : null,
    modifiedAt: new Date("2026-10-01T12:00:00Z"),
  });
  return { bytes, files: unzipSync(bytes) };
}

describe("buildEpub", () => {
  it("starts with an uncompressed mimetype entry", async () => {
    const { bytes, files } = await build();
    // Local file header: name at offset 30, compression method at offset 8 (0 = stored).
    expect(strFromU8(bytes.subarray(30, 38))).toBe("mimetype");
    expect(bytes[8]).toBe(0);
    expect(strFromU8(files.mimetype ?? new Uint8Array())).toBe("application/epub+zip");
  });

  it("produces well-formed XML for every document", async () => {
    const { files } = await build();
    const xmlFiles = Object.keys(files).filter((name) => /\.(xhtml|opf|xml|svg)$/.test(name));
    expect(xmlFiles.length).toBeGreaterThanOrEqual(7);
    for (const name of xmlFiles) {
      const result = XMLValidator.validate(strFromU8(files[name] ?? new Uint8Array()));
      expect({ name, result }).toEqual({ name, result: true });
    }
  });

  it("lists every packaged file in the manifest and orders the spine", async () => {
    const { files } = await build();
    const opf = strFromU8(files["OEBPS/content.opf"] ?? new Uint8Array());
    for (const name of Object.keys(files).filter(
      (n) => n.startsWith("OEBPS/") && !n.endsWith("content.opf"),
    )) {
      expect(opf).toContain(`href="${name.slice("OEBPS/".length)}"`);
    }
    expect(opf).toContain("<dc:title>The Lighthouse Keeper &amp; Other Stories</dc:title>");
    expect(opf).toContain('properties="nav"');
    expect(opf).toContain('properties="cover-image"');
    const spine = [...opf.matchAll(/<itemref idref="([^"]+)"/g)].map((m) => m[1]);
    expect(spine).toEqual(["cover", "title-page", "chapter-1", "chapter-2"]);
  });

  it("packages photos and recordings and links them from the chapter", async () => {
    const { files } = await build();
    const chapter = strFromU8(files["OEBPS/chapter-1.xhtml"] ?? new Uint8Array());
    expect(chapter).toContain('<img src="media/file-1.png" alt="Lighthouse"/>');
    expect(chapter).toContain('<audio controls="" src="media/file-2.m4a">');
    expect(chapter).toContain("The sea keeps every promise.");
    expect(files["OEBPS/media/file-2.m4a"]).toBeDefined();
    // Formats e-readers aren't required to play keep their transcript only.
    expect(chapter).toContain("Gulls overhead.");
    expect(chapter).toContain("A recording plays here in Notables.");
    expect(Object.keys(files).some((name) => name.endsWith(".webm"))).toBe(false);
    // The leading title heading is not repeated inside the chapter body.
    expect(chapter.match(/The fog came in at dusk/g)?.length).toBe(2); // <title> and <h1>
  });

  it("explains chapters that were missing on the exporting device", async () => {
    const { files } = await build();
    const chapter = strFromU8(files["OEBPS/chapter-2.xhtml"] ?? new Uint8Array());
    expect(chapter).toContain("Morning &lt;after&gt;");
    expect(chapter).toContain("wasn’t available");
  });
});
