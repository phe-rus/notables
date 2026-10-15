import { describe, expect, it } from "bun:test";
import * as Y from "yjs";
import { MEDIA_CHUNK_BYTES, MediaExchange, type PeerMedia } from "../../src/peer/media-exchange";
import { mediaReferences } from "../../src/peer/media-references";

/** A device's media folder in memory. */
function folder(files: Record<string, Blob> = {}) {
  const stored = new Map(Object.entries(files));
  const media: PeerMedia = {
    has: async (id) => stored.has(id),
    read: async (id) => stored.get(id) ?? null,
    write: async (id, file) => void stored.set(id, file),
  };
  return { stored, media };
}

/** Two devices whose exchanges pass frames straight to each other. */
function pair(owner: Record<string, Blob>, referenced: string[]) {
  const a = folder(owner);
  const b = folder();
  const arrived: string[] = [];
  const devices: Record<string, MediaExchange> = {};
  const route = (to: string, from: string) => (_peer: string, data: Uint8Array) =>
    devices[to]?.receive(from, data, [from]);
  devices.a = new MediaExchange(a.media, () => referenced, route("b", "a"));
  devices.b = new MediaExchange(
    b.media,
    () => referenced,
    route("a", "b"),
    (id) => arrived.push(id),
  );
  return { a, b, devices, arrived };
}

describe("MediaExchange", () => {
  it("brings over a referenced file, in pieces, under the same id", async () => {
    const bytes = new Uint8Array(MEDIA_CHUNK_BYTES * 2 + 123).map((_, index) => index % 251);
    const { b, devices, arrived } = pair({ "photo-1": new Blob([bytes], { type: "image/png" }) }, [
      "photo-1",
    ]);
    await devices.b?.fetchMissing(["a"]);
    const copy = b.stored.get("photo-1");
    expect(copy?.type).toBe("image/png");
    expect(new Uint8Array(await (copy as Blob).arrayBuffer())).toEqual(bytes);
    expect(arrived).toEqual(["photo-1"]);
  });

  it("never sends a file the document doesn't refer to", async () => {
    const { b, devices } = pair({ "private-1": new Blob(["secret"], { type: "image/png" }) }, []);
    // b asks anyway, as a misbehaving device could.
    const asking = new MediaExchange(
      b.media,
      () => ["private-1"],
      (_peer, data) => devices.a?.receive("b", data, ["b"]),
    );
    await asking.fetchMissing(["a"]);
    expect(b.stored.has("private-1")).toBe(false);
  });

  it("refuses kinds of file a note can't hold", async () => {
    const { b, devices } = pair({ "file-1": new Blob(["x"], { type: "text/html" }) }, ["file-1"]);
    await devices.b?.fetchMissing(["a"]);
    expect(b.stored.has("file-1")).toBe(false);
  });
});

describe("mediaReferences", () => {
  it("finds media in attributes and in embedded nodes, as Lexical stores them", () => {
    const doc = new Y.Doc();
    const root = doc.get("root", Y.XmlText);
    const image = new Y.XmlElement("image");
    image.setAttribute("__src", "media:drawing-1");
    image.setAttribute("__scene", "media:scene-1");
    root.insert(0, "Before the photo ");
    root.insertEmbed(17, image);
    const meta = doc.getMap("meta");
    meta.set("cover", "media:cover-1");
    meta.set("link", "https://example.com/media:not-local");
    expect(mediaReferences(doc).sort()).toEqual(["cover-1", "drawing-1", "scene-1"]);
  });
});
