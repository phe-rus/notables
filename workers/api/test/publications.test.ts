import { readdirSync, readFileSync } from "node:fs";
import { createId } from "@notables/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getPlatformProxy } from "wrangler";
import type { Bindings } from "../src/env";
import { app } from "../src/index";

let proxy: Awaited<ReturnType<typeof getPlatformProxy<Bindings>>>;

beforeAll(async () => {
  proxy = await getPlatformProxy<Bindings>({ environment: "dev", persist: false });
  const dir = new URL("../migrations/", import.meta.url);
  for (const file of readdirSync(dir).sort()) {
    const sql = readFileSync(new URL(file, dir), "utf8").replace(/--.*$/gm, "");
    for (const statement of sql
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean)) {
      await proxy.env.DB.prepare(statement).run();
    }
  }
});

afterAll(() => proxy?.dispose());

const as = (account?: string, body?: unknown, method = body ? "POST" : "GET"): RequestInit => ({
  method,
  headers: {
    ...(account ? { Authorization: `Bearer dev.${account}` } : {}),
    ...(body ? { "Content-Type": "application/json" } : {}),
  },
  ...(body ? { body: JSON.stringify(body) } : {}),
});

const call = (path: string, init?: RequestInit) => app.request(path, init, proxy.env);

const publishBody = (noteId: string, title = "The Lighthouse") => ({
  noteId,
  kind: "story",
  title,
  excerpt: "Once upon a time…",
  state: btoa("yjs-state"),
});

async function publish(account: string, noteId = createId()) {
  const res = await call("/v1/publications", as(account, publishBody(noteId)));
  expect(res.status).toBe(201);
  return (await res.json()) as { id: string; stats: Record<string, number | null> };
}

describe("publications API", () => {
  it("requires sign-in to publish", async () => {
    const res = await call("/v1/publications", as(undefined, publishBody(createId())));
    expect(res.status).toBe(401);
  });

  it("publishes, serves content and counts views", async () => {
    const pub = await publish("alice");

    const content = await call(`/v1/publications/${pub.id}/content`);
    expect(await content.text()).toBe("yjs-state");

    await call(`/v1/publications/${pub.id}`);
    const res = await call(`/v1/publications/${pub.id}`);
    const body = (await res.json()) as { stats: { views: number } };
    expect(body.stats.views).toBe(2);
  });

  it("re-publishing keeps the id and only the author may do it", async () => {
    const noteId = createId();
    const first = await publish("alice", noteId);

    const again = await call("/v1/publications", as("alice", publishBody(noteId, "Revised")));
    expect(again.status).toBe(200);
    expect(((await again.json()) as { id: string }).id).toBe(first.id);

    const hijack = await call("/v1/publications", as("mallory", publishBody(noteId)));
    expect(hijack.status).toBe(403);
  });

  it("keeps reaction counts idempotent per account", async () => {
    const pub = await publish("alice");
    const put = (who: string) =>
      call(`/v1/publications/${pub.id}/reactions/heart`, as(who, undefined, "PUT"));

    await put("bob");
    await put("bob");
    await put("carol");
    await call(`/v1/publications/${pub.id}/reactions/heart`, as("carol", undefined, "DELETE"));

    const res = await call(`/v1/publications/${pub.id}`);
    expect(((await res.json()) as { stats: { hearts: number } }).stats.hearts).toBe(1);
  });

  it("averages ratings and lets readers change their rating", async () => {
    const pub = await publish("alice");
    const rate = (who: string, stars: number) =>
      call(`/v1/publications/${pub.id}/rating`, { ...as(who, { stars }), method: "PUT" });

    expect((await rate("bob", 6)).status).toBe(400);
    await rate("bob", 5);
    await rate("carol", 2);
    await rate("carol", 4);

    const res = await call(`/v1/publications/${pub.id}`);
    const { stats } = (await res.json()) as { stats: { rating: number; ratings: number } };
    expect(stats).toMatchObject({ rating: 4.5, ratings: 2 });
  });

  it("adds comments and read completions", async () => {
    const pub = await publish("alice");
    const created = await call(
      `/v1/publications/${pub.id}/comments`,
      as("bob", { body: "Loved it" }),
    );
    expect(created.status).toBe(201);
    await call(`/v1/publications/${pub.id}/reads`, { method: "POST" });

    const comments = await call(`/v1/publications/${pub.id}/comments`);
    expect(((await comments.json()) as { items: unknown[] }).items).toHaveLength(1);

    const res = await call(`/v1/publications/${pub.id}`);
    expect(((await res.json()) as { stats: object }).stats).toMatchObject({
      comments: 1,
      reads: 1,
    });
  });

  it("unpublishing removes the publication and its snapshot", async () => {
    const pub = await publish("alice");
    expect((await call(`/v1/publications/${pub.id}`, as("bob", undefined, "DELETE"))).status).toBe(
      403,
    );
    expect(
      (await call(`/v1/publications/${pub.id}`, as("alice", undefined, "DELETE"))).status,
    ).toBe(204);
    expect((await call(`/v1/publications/${pub.id}`)).status).toBe(404);
    expect((await call(`/v1/publications/${pub.id}/content`)).status).toBe(404);
  });
});
