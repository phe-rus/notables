import { describe, expect, it } from "bun:test";
import { composeDocumentFromMarkdown } from "@notables/pluraliti";
import { createMemoryPersistence, createSharedPersistence } from "@notables/sync";
import * as Y from "yjs";
import { observeChapter } from "@/features/books/lib/observe-chapter";
import { memoryNoteContent } from "@/platform/storage/backends/memory/memory-backends";

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("received book chapters", () => {
  it("renders persisted text without an editor or a rendered cache", async () => {
    const persistence = createSharedPersistence(createMemoryPersistence());
    const source = new Y.Doc();
    const sourceBinding = await persistence.bind("received", source);
    composeDocumentFromMarkdown(source, "# Chapter\n\nArrived from another device.");
    const before = Y.encodeStateAsUpdate(source);
    expect(await memoryNoteContent.load("received")).toBeUndefined();
    let rendered: unknown;
    const release = await observeChapter("received", persistence, memoryNoteContent, (doc) => {
      rendered = doc;
    });
    expect(JSON.stringify(rendered)).toContain("Arrived from another device.");
    expect(Y.encodeStateAsUpdate(source)).toEqual(before);
    await settle();
    expect(JSON.stringify(await memoryNoteContent.load("received"))).toContain("Arrived");
    release();
    sourceBinding.destroy();
    source.destroy();
    await memoryNoteContent.remove("received");
  });

  it("replaces stale cache, follows late sync and stops when the reader leaves", async () => {
    const persistence = createSharedPersistence(createMemoryPersistence());
    const source = new Y.Doc();
    const sourceBinding = await persistence.bind("late", source);
    const cachedSource = new Y.Doc();
    const stale = composeDocumentFromMarkdown(cachedSource, "# Old cached copy");
    cachedSource.destroy();
    await memoryNoteContent.save("late", stale);
    const rendered: unknown[] = [];
    const release = await observeChapter("late", persistence, memoryNoteContent, (doc) => {
      rendered.push(doc);
    });
    expect(JSON.stringify(rendered.at(-1))).toContain("Old cached copy");
    composeDocumentFromMarkdown(source, "# Chapter\n\nText received after opening.");
    await settle();
    expect(JSON.stringify(rendered.at(-1))).toContain("Text received after opening.");
    release();
    const count = rendered.length;
    composeDocumentFromMarkdown(source, "# Chapter\n\nA later edit.");
    await settle();
    expect(rendered).toHaveLength(count);
    sourceBinding.destroy();
    source.destroy();
    await memoryNoteContent.remove("late");
  });
});
