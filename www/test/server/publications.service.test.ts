import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { createId } from "@notables/core";
import { getPlatformProxy } from "wrangler";
import {
  createPublications,
  type Publications,
  type PublishInput,
} from "../../src/server/publications/publications.service";

let proxy: Awaited<ReturnType<typeof getPlatformProxy<Cloudflare.Env>>>;
let pubs: Publications;

beforeAll(async () => {
  proxy = await getPlatformProxy<Cloudflare.Env>({ persist: false });
  const dir = new URL("../../migrations/", import.meta.url);
  for (const file of readdirSync(dir).sort()) {
    const sql = readFileSync(new URL(file, dir), "utf8").replace(/--.*$/gm, "");
    for (const statement of sql
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean)) {
      await proxy.env.DB.prepare(statement).run();
    }
  }
  pubs = createPublications(proxy.env.DB, proxy.env.MEDIA);
}, 60_000);

afterAll(() => proxy?.dispose());

const doc = (text: string) => ({
  root: { children: [{ type: "paragraph", children: [{ type: "text", text, format: 0 }] }] },
});

const input = (overrides: Partial<PublishInput> = {}): PublishInput => ({
  noteId: createId(),
  kind: "story",
  title: "Night train to Kampala",
  excerpt: "The carriage smelled of oranges.",
  authorName: "Amara",
  readingMinutes: 6,
  document: doc("The carriage smelled of oranges."),
  ...overrides,
});

describe("publications", () => {
  it("publishes and serves the frozen document", async () => {
    const { publication, key } = await pubs.publish(input());
    expect(key.length).toBeGreaterThan(30);
    const fetched = await pubs.get(publication.id);
    expect(fetched.publication.title).toBe("Night train to Kampala");
    expect(JSON.parse(fetched.document)).toEqual(doc("The carriage smelled of oranges."));
  });

  it("updates in place with the key and rejects anyone without it", async () => {
    const base = input();
    const created = await pubs.publish(base);
    const updated = await pubs.publish({ ...base, title: "Revised", key: created.key });
    expect(updated.publication.id).toBe(created.publication.id);
    expect(updated.key).toBe(created.key);
    expect(updated.publication.title).toBe("Revised");

    await expect(pubs.publish({ ...base, key: "wrong" })).rejects.toMatchObject({ status: 403 });
    await expect(pubs.publish(base)).rejects.toMatchObject({ status: 403 });
  });

  it("counts reactions once per viewer", async () => {
    const { publication } = await pubs.publish(input());
    const [a, b] = [createId(), createId()];
    await pubs.react(publication.id, a, "heart", true);
    await pubs.react(publication.id, a, "heart", true);
    await pubs.react(publication.id, b, "heart", true);
    const stats = await pubs.react(publication.id, b, "heart", false);
    expect(stats.hearts).toBe(1);
    expect((await pubs.viewerState(publication.id, a)).reactions).toEqual(["heart"]);
  });

  it("averages ratings and lets viewers change theirs", async () => {
    const { publication } = await pubs.publish(input());
    const [a, b] = [createId(), createId()];
    await pubs.rate(publication.id, a, 5);
    await pubs.rate(publication.id, b, 2);
    const stats = await pubs.rate(publication.id, b, 4);
    expect(stats).toMatchObject({ rating: 4.5, ratings: 2 });
  });

  it("counts views and reads", async () => {
    const { publication } = await pubs.publish(input());
    await pubs.recordView(publication.id);
    await pubs.recordView(publication.id);
    await pubs.recordRead(publication.id);
    const { stats } = (await pubs.get(publication.id)).publication;
    expect(stats).toMatchObject({ views: 2, reads: 1 });
  });

  it("unpublishes only with the key, removing content and social data", async () => {
    const { publication, key } = await pubs.publish(input());
    await pubs.react(publication.id, createId(), "like", true);
    await expect(pubs.unpublish(publication.id, "nope")).rejects.toMatchObject({ status: 403 });
    await pubs.unpublish(publication.id, key);
    await expect(pubs.get(publication.id)).rejects.toMatchObject({ status: 404 });
    const left = await proxy.env.DB.prepare(
      "SELECT COUNT(*) AS n FROM reactions WHERE publication_id = ?",
    )
      .bind(publication.id)
      .first<{ n: number }>();
    expect(left?.n).toBe(0);
  });

  it("rejects oversized documents", async () => {
    const huge = doc("x".repeat(9 * 1024 * 1024));
    await expect(pubs.publish(input({ document: huge }))).rejects.toMatchObject({ status: 413 });
  });
});
