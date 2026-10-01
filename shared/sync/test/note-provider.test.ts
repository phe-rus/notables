import { describe, expect, it } from "bun:test";
import * as Y from "yjs";
import { createMemoryPersistence, NoteProvider } from "../src";

describe("NoteProvider", () => {
  it("loads local state, then reports synced for device-only notes", async () => {
    const persistence = createMemoryPersistence();

    const first = new NoteProvider("n1", new Y.Doc(), { persistence });
    first.connect();
    await first.loaded();
    first.doc.getMap("meta").set("title", "Offline draft");
    first.destroy();

    const doc = new Y.Doc();
    const second = new NoteProvider("n1", doc, { persistence });
    const events: string[] = [];
    second.on("change", (status) => events.push(status));
    second.on("sync", (synced) => events.push(`sync:${synced}`));
    second.connect();
    await second.loaded();

    expect(doc.getMap("meta").get("title")).toBe("Offline draft");
    expect(second.status).toBe("local");
    expect(events).toEqual(["local", "sync:true"]);
  });

  it("can reconnect after a disconnect, as remounting editors do", async () => {
    const provider = new NoteProvider("n", new Y.Doc(), { persistence: createMemoryPersistence() });
    let syncs = 0;
    provider.on("sync", () => syncs++);
    provider.connect();
    await provider.loaded();
    provider.disconnect();
    expect(provider.status).toBe("loading");
    provider.connect();
    await provider.loaded();
    expect(provider.status).toBe("local");
    expect(syncs).toBe(2);
  });

  it("ignores a load that finishes after disconnect", async () => {
    const provider = new NoteProvider("n", new Y.Doc(), { persistence: createMemoryPersistence() });
    provider.connect();
    provider.disconnect();
    provider.connect();
    await provider.loaded();
    expect(provider.status).toBe("local");

    provider.disconnect();
    // Edits after disconnect are no longer persisted by either binding.
    provider.doc.getMap("meta").set("title", "after");
    const reopened = new NoteProvider("n", new Y.Doc(), {
      persistence: provider.options.persistence,
    });
    reopened.connect();
    await reopened.loaded();
    expect(reopened.doc.getMap("meta").get("title")).toBeUndefined();
  });

  it("keeps notes isolated by id", async () => {
    const persistence = createMemoryPersistence();
    const a = new NoteProvider("a", new Y.Doc(), { persistence });
    a.connect();
    await a.loaded();
    a.doc.getMap("meta").set("title", "A");

    const b = new NoteProvider("b", new Y.Doc(), { persistence });
    b.connect();
    await b.loaded();
    expect(b.doc.getMap("meta").get("title")).toBeUndefined();
  });

  it("exposes awareness for collaborative cursors", () => {
    const provider = new NoteProvider("n", new Y.Doc(), { persistence: createMemoryPersistence() });
    provider.awareness.setLocalStateField("name", "Amara");
    expect(provider.awareness.getLocalState()?.name).toBe("Amara");
  });
});
