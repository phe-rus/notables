import { describe, expect, it } from "bun:test";
import * as Y from "yjs";
import { createSharedPersistence } from "../../src/persistence/shared-persistence";
import {
  createUpdateLogPersistence,
  type UpdateLog,
} from "../../src/persistence/update-log-persistence";

function memoryLog() {
  const logs = new Map<string, Uint8Array[]>();
  const log: UpdateLog = {
    load: async (name) => [...(logs.get(name) ?? [])],
    append: async (name, update) => void logs.set(name, [...(logs.get(name) ?? []), update]),
    replace: async (name, state) => void logs.set(name, [state]),
    remove: async (name) => void logs.delete(name),
  };
  return { logs, log };
}

describe("shared persistence", () => {
  it("keeps two open copies of a note in step and stores each edit once", async () => {
    const { logs, log } = memoryLog();
    const shared = createSharedPersistence(createUpdateLogPersistence(log, { flushDelayMs: 0 }));
    const editor = new Y.Doc();
    const browser = new Y.Doc();
    const a = await shared.bind("note:1", editor);
    const b = await shared.bind("note:1", browser);
    editor.getText("t").insert(0, "from the phone");
    expect(browser.getText("t").toString()).toBe("from the phone");
    browser.getText("t").insert(0, ">");
    expect(editor.getText("t").toString()).toBe(">from the phone");
    await a.flush?.();
    const stored = new Y.Doc();
    for (const update of logs.get("note:1") ?? []) Y.applyUpdate(stored, update);
    expect(stored.getText("t").toString()).toBe(">from the phone");
    // The initial state and the edits' batch: never one write per open copy.
    expect(logs.get("note:1")?.length).toBeLessThanOrEqual(2);
    a.destroy();
    b.destroy();
  });

  it("loads stored content into a copy opened later", async () => {
    const { log } = memoryLog();
    const shared = createSharedPersistence(createUpdateLogPersistence(log, { flushDelayMs: 0 }));
    const first = new Y.Doc();
    const binding = await shared.bind("library", first);
    first.getMap("m").set("k", 1);
    await binding.flush?.();
    binding.destroy();
    await new Promise((resolve) => setTimeout(resolve, 5));
    const later = new Y.Doc();
    await shared.bind("library", later);
    expect(later.getMap("m").get("k")).toBe(1);
  });
});

describe("binding the same copy twice", () => {
  it("stays linked until both bindings are destroyed", async () => {
    const { log } = memoryLog();
    const shared = createSharedPersistence(createUpdateLogPersistence(log, { flushDelayMs: 0 }));
    const editor = new Y.Doc();
    const other = new Y.Doc();
    const first = await shared.bind("note:1", editor);
    await shared.bind("note:1", editor);
    await shared.bind("note:1", other);
    first.destroy();
    editor.getText("t").insert(0, "linked");
    expect(other.getText("t").toString()).toBe("linked");
  });
});
