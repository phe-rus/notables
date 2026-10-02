import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { getPlatformProxy } from "wrangler";
import { createSignals, SIGNAL_TTL_MS } from "../../src/server/signals/signals.service";

let proxy: Awaited<ReturnType<typeof getPlatformProxy<Cloudflare.Env>>>;
let clock = 1_000_000;
let signals: ReturnType<typeof createSignals>;
const room = "a".repeat(64);

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
  signals = createSignals(proxy.env.DB, () => clock);
}, 60_000);

afterAll(() => proxy?.dispose());

describe("signalling mailbox", () => {
  it("delivers broadcasts and direct messages, never a device's own", async () => {
    await signals.post(room, "peer-aaaa", null, "hello everyone");
    await signals.post(room, "peer-bbbb", "peer-aaaa", "just for a");
    await signals.post(room, "peer-bbbb", "peer-cccc", "just for c");

    const forA = await signals.poll(room, "peer-aaaa", 0);
    expect(forA.signals.map((s) => s.payload)).toEqual(["just for a"]);
    const forC = await signals.poll(room, "peer-cccc", 0);
    expect(forC.signals.map((s) => s.payload)).toEqual(["hello everyone", "just for c"]);

    // Asking again from the cursor returns only what's new.
    expect((await signals.poll(room, "peer-cccc", forC.cursor)).signals).toEqual([]);
  });

  it("forgets introductions after a couple of minutes", async () => {
    clock += SIGNAL_TTL_MS + 1;
    expect((await signals.poll(room, "peer-cccc", 0)).signals).toEqual([]);
    await signals.post(room, "peer-dddd", null, "fresh");
    const { results } = await proxy.env.DB.prepare("SELECT payload FROM signals").all<{
      payload: string;
    }>();
    expect(results.map((row) => row.payload)).toEqual(["fresh"]);
  });
});
