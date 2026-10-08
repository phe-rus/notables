import { describe, expect, it } from "bun:test";
import * as Y from "yjs";
import { createUpdateLogPersistence, type UpdateLog } from "../../src/index";

function memoryLog() {
  const logs = new Map<string, Uint8Array[]>();
  const writes: string[] = [];
  const log: UpdateLog = {
    async load(name) {
      return [...(logs.get(name) ?? [])];
    },
    async append(name, update) {
      writes.push(`append:${name}`);
      logs.set(name, [...(logs.get(name) ?? []), update]);
    },
    async replace(name, state) {
      writes.push(`replace:${name}`);
      logs.set(name, [state]);
    },
    async remove(name) {
      logs.delete(name);
    },
  };
  return { log, logs, writes };
}

describe("createUpdateLogPersistence", () => {
  it("restores a document from its log", async () => {
    const { log } = memoryLog();
    const persistence = createUpdateLogPersistence(log, { flushDelayMs: 1 });

    const first = new Y.Doc();
    const binding = await persistence.bind("note:a", first);
    first.getText("t").insert(0, "Hello");
    first.getText("t").insert(5, ", world");
    await binding.flush?.();
    binding.destroy();

    const second = new Y.Doc();
    await persistence.bind("note:a", second);
    expect(second.getText("t").toString()).toBe("Hello, world");
  });

  it("merges a burst of edits into a single write", async () => {
    const { log, writes } = memoryLog();
    const persistence = createUpdateLogPersistence(log, { flushDelayMs: 1000 });
    const doc = new Y.Doc();
    const binding = await persistence.bind("note:b", doc);
    for (const letter of "typing") doc.getText("t").insert(doc.getText("t").length, letter);
    await binding.flush?.();
    expect(writes).toEqual(["replace:note:b", "append:note:b"]);
  });

  it("writes pending edits when it is destroyed", async () => {
    const { log, logs } = memoryLog();
    const persistence = createUpdateLogPersistence(log, { flushDelayMs: 60_000 });
    const doc = new Y.Doc();
    const binding = await persistence.bind("note:c", doc);
    doc.getText("t").insert(0, "last words");
    binding.destroy();
    await Bun.sleep(0);

    const restored = new Y.Doc();
    for (const update of logs.get("note:c") ?? []) Y.applyUpdate(restored, update);
    expect(restored.getText("t").toString()).toBe("last words");
  });

  it("does not store the updates it restores", async () => {
    const { log, writes } = memoryLog();
    const persistence = createUpdateLogPersistence(log, { flushDelayMs: 1 });
    const seed = new Y.Doc();
    seed.getText("t").insert(0, "saved");
    await log.append("note:d", Y.encodeStateAsUpdate(seed));
    writes.length = 0;

    const binding = await persistence.bind("note:d", new Y.Doc());
    await binding.flush?.();
    expect(writes).toEqual([]);
  });

  it("compacts long logs into one state", async () => {
    const { log, logs } = memoryLog();
    const source = new Y.Doc();
    source.on("update", (update: Uint8Array) => void log.append("note:e", update));
    for (let i = 0; i < 12; i++) source.getText("t").insert(0, String(i % 10));
    expect(logs.get("note:e")).toHaveLength(12);

    const doc = new Y.Doc();
    await createUpdateLogPersistence(log, { compactAfter: 10 }).bind("note:e", doc);
    expect(logs.get("note:e")).toHaveLength(1);
    expect(doc.getText("t").toString()).toBe(source.getText("t").toString());
  });
});
