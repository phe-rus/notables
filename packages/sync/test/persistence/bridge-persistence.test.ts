import { describe, expect, it } from "bun:test";
import * as Y from "yjs";
import { bridgePersistence } from "../../src/persistence/bridge-persistence";
import { createMemoryPersistence } from "../../src/persistence/memory-persistence";

describe("bridge persistence", () => {
  it("keeps an editor's document and a session's document identical both ways", async () => {
    const session = new Y.Doc();
    session.getText("body").insert(0, "From a friend. ");
    const editor = new Y.Doc();
    const binding = await bridgePersistence(session, createMemoryPersistence()).bind(
      "note:x",
      editor,
    );

    expect(editor.getText("body").toString()).toBe("From a friend. ");
    editor.getText("body").insert(15, "Typed here.");
    expect(session.getText("body").toString()).toBe("From a friend. Typed here.");
    session.getText("body").insert(0, "Hi! ");
    expect(editor.getText("body").toString()).toBe("Hi! From a friend. Typed here.");

    binding.destroy();
    editor.getText("body").insert(0, "Gone. ");
    expect(session.getText("body").toString()).toBe("Hi! From a friend. Typed here.");
  });
});
