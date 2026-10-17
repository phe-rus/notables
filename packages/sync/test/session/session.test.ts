import { describe, expect, it } from "bun:test";
import * as Y from "yjs";
import { SessionClient } from "../../src/session/session-client";
import { decodeFrame, encodeFrame, FrameKind } from "../../src/session/session-frames";
import { type DocSource, SessionHost } from "../../src/session/session-host";
import { newSecret } from "../../src/space/space-keys";

/** The phone's storage: documents by name, opened and released. */
function phoneStore(docs: Record<string, Y.Doc>) {
  const opened: string[] = [];
  const released: string[] = [];
  const removed: string[] = [];
  const source: DocSource = {
    open: async (name) => {
      opened.push(name);
      docs[name] ??= new Y.Doc();
      return { doc: docs[name] as Y.Doc, release: () => released.push(name) };
    },
    remove: async (name) => {
      removed.push(name);
      delete docs[name];
    },
  };
  return { source, opened, released, removed };
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 5));

/** A browser and phone joined by a link that delivers frames at once. */
function session(docs: Record<string, Y.Doc>) {
  const key = newSecret();
  const store = phoneStore(docs);
  const host = new SessionHost(key, store.source);
  const client = new SessionClient(key);
  const connect = () => {
    host.attach({ send: (data) => client.receive(data) });
    client.attach({ send: (data) => host.receive(data) });
  };
  const disconnect = () => {
    host.detach();
    client.detach();
  };
  return { host, client, store, connect, disconnect, key };
}

describe("session frames", () => {
  it("round trips, and refuses frames sealed with another key", () => {
    const key = newSecret();
    const frame = { kind: FrameKind.sync, doc: "note:1", body: new Uint8Array([1, 2, 3]) };
    expect(decodeFrame(key, encodeFrame(key, frame))).toEqual(frame);
    expect(decodeFrame(newSecret(), encodeFrame(key, frame))).toBeNull();
  });
});

describe("a browser session", () => {
  it("fills a memory document from the phone, then keeps both in step", async () => {
    const phoneLibrary = new Y.Doc();
    phoneLibrary.getMap("notes").set("a", "First note");
    const { client, connect } = session({ library: phoneLibrary });
    connect();
    const browserLibrary = new Y.Doc();
    const loaded = client.open("library", browserLibrary);
    await tick();
    await loaded;
    expect(browserLibrary.getMap("notes").get("a")).toBe("First note");

    browserLibrary.getMap("notes").set("b", "Typed in the browser");
    await tick();
    expect(phoneLibrary.getMap("notes").get("b")).toBe("Typed in the browser");

    phoneLibrary.getMap("notes").set("c", "Typed on the phone");
    await tick();
    expect(browserLibrary.getMap("notes").get("c")).toBe("Typed on the phone");
  });

  it("opens notes on demand and lets them go when closed", async () => {
    const note = new Y.Doc();
    note.getText("body").insert(0, "Hello");
    const { client, store, connect } = session({ "note:1": note });
    connect();
    const copy = new Y.Doc();
    void client.open("note:1", copy);
    await tick();
    expect(copy.getText("body").toString()).toBe("Hello");
    expect(store.opened).toEqual(["note:1"]);
    client.close("note:1");
    await tick();
    expect(store.released).toEqual(["note:1"]);
  });

  it("keeps edits made while the phone was away and sends them on reconnect", async () => {
    const note = new Y.Doc();
    note.getText("body").insert(0, "Start");
    const { client, connect, disconnect } = session({ "note:1": note });
    connect();
    const copy = new Y.Doc();
    void client.open("note:1", copy);
    await tick();
    disconnect();
    copy.getText("body").insert(5, " offline");
    note.getText("body").insert(0, ">");
    await tick();
    expect(note.getText("body").toString()).toBe(">Start");
    connect();
    await tick();
    expect(note.getText("body").toString()).toBe(">Start offline");
    expect(copy.getText("body").toString()).toBe(">Start offline");
  });

  it("erases a document on the phone when the browser removes it", async () => {
    const { client, store, connect } = session({ "note:1": new Y.Doc() });
    connect();
    void client.open("note:1", new Y.Doc());
    await tick();
    client.remove("note:1");
    await tick();
    expect(store.removed).toEqual(["note:1"]);
  });

  it("ignores frames that were not sealed with the session's key", async () => {
    const phoneLibrary = new Y.Doc();
    const { host, store } = session({ library: phoneLibrary });
    host.receive(
      encodeFrame(newSecret(), {
        kind: FrameKind.sync,
        doc: "library",
        body: new Uint8Array([0, 0]),
      }),
    );
    await tick();
    expect(store.opened).toEqual([]);
  });
});

describe("an editor that mounts twice", () => {
  it("keeps the document open until its last holder closes it", async () => {
    const note = new Y.Doc();
    const { client, store, connect } = session({ "note:1": note });
    connect();
    const copy = new Y.Doc();
    void client.open("note:1", copy);
    void client.open("note:1", copy);
    // The first mount's late cleanup.
    client.close("note:1");
    await tick();
    copy.getText("t").insert(0, "still synced");
    await tick();
    expect(note.getText("t").toString()).toBe("still synced");
    expect(store.released).toEqual([]);
    client.close("note:1");
    await tick();
    expect(store.released).toEqual(["note:1"]);
  });
});

describe("direct session media", () => {
  it("moves referenced files in both directions and leaves unrelated files private", async () => {
    const library = new Y.Doc();
    library.getMap("notes").set("image", { src: "media:photo" });
    const files = new Map<string, Blob>([
      ["photo", new Blob([new Uint8Array(40000).fill(7)], { type: "image/png" })],
      ["private", new Blob(["private"], { type: "text/plain" })],
    ]);
    const memory = new Map<string, Blob>();
    const { host, client, connect, disconnect } = session({ library });
    host.shareMedia({
      has: async (id) => files.has(id),
      read: async (id) => files.get(id) ?? null,
      write: async (id, file) => {
        files.set(id, file);
      },
    });
    client.shareMedia({
      has: async (id) => memory.has(id),
      read: async (id) => memory.get(id) ?? null,
      write: async (id, file) => {
        memory.set(id, file);
      },
    });
    connect();
    const copy = new Y.Doc();
    await client.open("library", copy);
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(memory.get("photo")?.size).toBe(40000);
    expect(memory.has("private")).toBe(false);
    memory.set("file", new Blob(["budget"], { type: "application/pdf" }));
    copy.getMap("notes").set("attachment", { src: "media:file" });
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(await files.get("file")?.text()).toBe("budget");
    disconnect();
  });
  it("does not put media onto the relay", async () => {
    const library = new Y.Doc();
    library.getMap("notes").set("a", { src: "media:photo" });
    const { host, client, key, disconnect } = session({ library });
    let mediaFrames = 0;
    host.shareMedia({
      has: async () => true,
      read: async () => new Blob(["photo"], { type: "image/png" }),
      write: async () => {},
    });
    client.shareMedia({ has: async () => false, read: async () => null, write: async () => {} });
    host.attach({
      media: false,
      send: (data) => {
        if (decodeFrame(key, data)?.kind === FrameKind.media) mediaFrames++;
        client.receive(data);
      },
    });
    client.attach({
      media: false,
      send: (data) => {
        if (decodeFrame(key, data)?.kind === FrameKind.media) mediaFrames++;
        host.receive(data);
      },
    });
    await client.open("library", new Y.Doc());
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(mediaFrames).toBe(0);
    disconnect();
  });
});

it("routes approved browser actions to the phone and rejects actions after disconnect", async () => {
  const { host, client, connect, disconnect } = session({});
  host.handleRequests(async (method, input) => {
    if (method !== "echo") throw new Error("unsupported");
    return input;
  });
  connect();
  expect(await client.request("echo", { noteId: "one" })).toEqual({ noteId: "one" });
  await expect(client.request("unknown", null)).rejects.toThrow("Phone could not complete");
  disconnect();
  await expect(client.request("echo", null)).rejects.toThrow("Phone disconnected");
});
