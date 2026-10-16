import { describe, expect, it } from "bun:test";
import * as Y from "yjs";
import { RelayLink } from "../../src/engine/relay-link";
import { type SpaceDocs, SpacePeer } from "../../src/engine/space-peer";
import { newSecret } from "../../src/space/space-keys";

/** One device's storage: documents by name, with the library naming its notes. */
function device(docs: Record<string, Y.Doc> = {}) {
  const store: SpaceDocs = {
    open: async (name) => {
      docs[name] ??= new Y.Doc();
      return { doc: docs[name] as Y.Doc, release: () => {} };
    },
    remove: async (name) => {
      delete docs[name];
    },
    notes: async () => {
      const library = docs.library?.getMap("notes");
      return [...(library?.keys() ?? [])].map((id) => `note:${id}`);
    },
  };
  return { docs, store };
}

function library(docs: Record<string, Y.Doc>) {
  docs.library ??= new Y.Doc();
  return docs.library.getMap<{ title: string }>("notes");
}

function note(docs: Record<string, Y.Doc>, id: string, text: string) {
  library(docs).set(id, { title: text });
  docs[`note:${id}`] ??= new Y.Doc();
  docs[`note:${id}`]?.getText("body").insert(0, text);
}

const text = (docs: Record<string, Y.Doc>, id: string) =>
  docs[`note:${id}`]?.getText("body").toString();

const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

/** Two devices of one space, joined by a link that delivers frames at once. */
function pair(a: ReturnType<typeof device>, b: ReturnType<typeof device>) {
  const key = newSecret();
  const names: string[] = [];
  const peerA = new SpacePeer(key, a.store, { name: "Phone", platform: "android" }, (info) =>
    names.push(info.name),
  );
  const peerB = new SpacePeer(key, b.store, { name: "Laptop", platform: "linux" }, (info) =>
    names.push(info.name),
  );
  const connect = () => {
    peerA.attach({ send: (data) => peerB.receive(data) });
    peerB.attach({ send: (data) => peerA.receive(data) });
  };
  const disconnect = () => {
    peerA.detach();
    peerB.detach();
  };
  return { peerA, peerB, connect, disconnect, names };
}

describe("syncing two devices of a space", () => {
  it("brings the library and every note across, both ways", async () => {
    const a = device();
    const b = device();
    note(a.docs, "1", "Written on the phone");
    note(b.docs, "2", "Written on the laptop");
    const { connect, disconnect, names } = pair(a, b);
    connect();
    await settle();
    expect([...library(a.docs).keys()].sort()).toEqual(["1", "2"]);
    expect([...library(b.docs).keys()].sort()).toEqual(["1", "2"]);
    expect(text(b.docs, "1")).toBe("Written on the phone");
    expect(text(a.docs, "2")).toBe("Written on the laptop");
    expect(names.sort()).toEqual(["Laptop", "Phone"]);
    disconnect();
  });

  it("merges edits made apart when the devices meet again", async () => {
    const a = device();
    const b = device();
    note(a.docs, "1", "Hello");
    const { connect, disconnect } = pair(a, b);
    connect();
    await settle();
    disconnect();
    a.docs["note:1"]?.getText("body").insert(5, " from the phone");
    b.docs["note:1"]?.getText("body").insert(0, "Laptop says: ");
    connect();
    await settle();
    expect(text(a.docs, "1")).toBe("Laptop says: Hello from the phone");
    expect(text(b.docs, "1")).toBe(text(a.docs, "1"));
    disconnect();
  });

  it("keeps a note live while a screen holds it open", async () => {
    const a = device();
    const b = device();
    note(a.docs, "1", "Draft");
    const { peerA, connect, disconnect } = pair(a, b);
    connect();
    await settle();
    peerA.pin("note:1");
    await settle();
    a.docs["note:1"]?.getText("body").insert(5, ", typed live");
    await settle();
    expect(text(b.docs, "1")).toBe("Draft, typed live");
    disconnect();
  });

  it("never brings back a note this device erased", async () => {
    const a = device();
    const b = device();
    note(a.docs, "1", "Keep");
    note(a.docs, "2", "Erase me");
    const { connect, disconnect } = pair(a, b);
    connect();
    await settle();
    disconnect();
    // b erases note 2 for good: gone from its library and its storage.
    library(b.docs).delete("2");
    delete b.docs["note:2"];
    connect();
    await settle();
    expect(b.docs["note:2"]).toBeUndefined();
    disconnect();
  });
});

describe("relaying frames through the room", () => {
  it("splits a large frame into pieces and puts it back together", () => {
    const posted: string[] = [];
    const sender = new RelayLink((body) => posted.push(body));
    const receiver = new RelayLink(() => {});
    const frame = new Uint8Array(300 * 1024).map((_, index) => index % 251);
    sender.send(frame);
    expect(posted.length).toBe(4);
    const results = posted.map((body) => receiver.receive(body));
    expect(results.slice(0, 3)).toEqual([null, null, null]);
    expect(results[3]).toEqual(frame);
  });

  it("passes a small frame in one piece and ignores what isn't a piece", () => {
    const posted: string[] = [];
    const sender = new RelayLink((body) => posted.push(body));
    sender.send(new Uint8Array([1, 2, 3]));
    const receiver = new RelayLink(() => {});
    expect(receiver.receive(posted[0] as string)).toEqual(new Uint8Array([1, 2, 3]));
    expect(receiver.receive("not json")).toBeNull();
    expect(receiver.receive(JSON.stringify({ d: "AA", n: 2, i: 5, f: 0 }))).toBeNull();
  });
});
