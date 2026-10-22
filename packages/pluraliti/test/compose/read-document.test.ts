import { describe, expect, it } from "bun:test";
import * as Y from "yjs";
import { composeDocumentFromMarkdown, readDocument } from "../../src/index";

describe("readDocument", () => {
  it("renders a received chapter without changing its synced state", () => {
    const source = new Y.Doc();
    const expected = composeDocumentFromMarkdown(source, "# A chapter\n\nReceived **writing**.");
    const received = new Y.Doc();
    Y.applyUpdate(received, Y.encodeStateAsUpdate(source));
    const before = Y.encodeStateAsUpdate(received);
    const content = (value: unknown) =>
      JSON.parse(JSON.stringify(value, (key, field) => (key === "$" ? undefined : field)));
    expect(content(readDocument(received))).toEqual(content(expected));
    expect(Y.encodeStateAsUpdate(received)).toEqual(before);
    received.destroy();
    source.destroy();
  });

  it("leaves an empty document untouched while waiting for sync", () => {
    const source = new Y.Doc();
    const before = Y.encodeStateAsUpdate(source);
    expect(readDocument(source)).toBeNull();
    expect(Y.encodeStateAsUpdate(source)).toEqual(before);
    expect(source.share.size).toBe(0);
    source.destroy();
  });
});
