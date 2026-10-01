import { createNoteDoc, noteDoc } from "@notables/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as Y from "yjs";
import { ApiError, createApiClient, createMemoryPersistence, openNote } from "../src";

const config = {
  apiUrl: "https://api.test",
  syncHost: "sync.test",
  getToken: async () => null,
};

afterEach(() => vi.unstubAllGlobals());

describe("openNote", () => {
  it("works fully offline when signed out", async () => {
    const persistence = createMemoryPersistence();
    const first = await openNote(
      "n1",
      createNoteDoc({ title: "Offline", kind: "note", surfaces: ["text"] }),
      {
        config,
        persistence,
      },
    );
    expect(first.status).toBe("local");
    noteDoc.setTitle(first.doc, "Edited offline");
    first.destroy();

    const reopened = await openNote("n1", new Y.Doc(), { config, persistence });
    expect(noteDoc.title(reopened.doc)).toBe("Edited offline");
  });
});

describe("createApiClient", () => {
  it("publishes a base64 snapshot with the bearer token", async () => {
    const fetchMock = vi.fn(async (_url: URL, init: RequestInit) =>
      Response.json({ id: "p1", body: JSON.parse(String(init.body)) }, { status: 201 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const api = createApiClient({ ...config, getToken: async () => "tok" });
    const doc = createNoteDoc({ title: "Essay", kind: "article", surfaces: ["text"] });
    await api.publish("11111111-1111-7111-8111-111111111111", doc, "article");

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toBe("https://api.test/v1/publications");
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer tok");
    const body = JSON.parse(String(init?.body));
    expect(body.title).toBe("Essay");
    const restored = new Y.Doc();
    Y.applyUpdate(
      restored,
      Uint8Array.from(atob(body.state), (c) => c.charCodeAt(0)),
    );
    expect(noteDoc.title(restored)).toBe("Essay");
  });

  it("surfaces API errors", async () => {
    vi.stubGlobal("fetch", async () =>
      Response.json({ error: "sign in required" }, { status: 401 }),
    );
    const api = createApiClient(config);
    await expect(api.react("p1", "heart")).rejects.toEqual(new ApiError(401, "sign in required"));
  });
});
