import { compareVersions } from "@/features/updates/lib/compare-versions";
import { createUpdateMonitor } from "@/features/updates/lib/create-update-monitor";
import { readReleasePolicy } from "@/features/updates/lib/read-release-policy";
import { GRACE_MS } from "@/features/updates/model/constants";
import { appReleaseRequest } from "@/server/releases/release-policy.http";

const availableAt = "2026-10-19T12:00:00.000Z";
const start = Date.parse(availableAt);
const release = { version: "0.2.13", build: 10026, availableAt };
const manifest = { schema: 1, channels: { "android-play": release, "ios-testflight": null } };

function fixture() {
  let now = start;
  let cache: string | null = null;
  let response: unknown = manifest;
  let failing = false;
  const deps = {
    installed: { version: "0.2.12", build: 10025, channel: "android-play" as const },
    now: () => now,
    read: () => cache,
    write: (value: string) => {
      cache = value;
    },
    load: async () => {
      if (failing) throw new Error("offline");
      return response;
    },
  };
  return {
    create: () => createUpdateMonitor(deps),
    time: (value: number) => {
      now = value;
    },
    response: (value: unknown) => {
      response = value;
    },
    fail: () => {
      failing = true;
    },
    cache: (value: string) => {
      cache = value;
    },
    installed: deps.installed,
  };
}

describe("release policy", () => {
  test("compares version components numerically and rejects unsupported formats", () => {
    expect(compareVersions("0.2.12", "0.2.9")).toBe(1);
    expect(compareVersions("1.0.0", "0.99.99")).toBe(1);
    expect(compareVersions("0.2.12", "0.2.12")).toBe(0);
    expect(compareVersions("garbage", "0.2.12")).toBeNull();
  });
  test("does not borrow another distribution's release", () => {
    expect(readReleasePolicy(manifest, "ios-testflight")).toBeNull();
    expect(() => readReleasePolicy(manifest, "ios-app-store")).toThrow();
    expect(() => readReleasePolicy({ ...manifest, schema: 2 }, "android-play")).toThrow();
    expect(() =>
      readReleasePolicy(
        { schema: 1, channels: { "android-play": { ...release, availableAt: "bad" } } },
        "android-play",
      ),
    ).toThrow();
  });
  test("warns first and blocks at exactly seven days", async () => {
    const f = fixture();
    const monitor = f.create();
    await monitor.check();
    expect(monitor.getState().release).toEqual(release);
    expect(monitor.getState().required).toBe(false);
    f.time(start + GRACE_MS - 1);
    monitor.tick();
    expect(monitor.getState().required).toBe(false);
    f.time(start + GRACE_MS);
    monitor.tick();
    expect(monitor.getState().required).toBe(true);
  });
  test("keeps a known deadline across offline restarts and clock rollback", async () => {
    const f = fixture();
    await f.create().check();
    f.time(start + GRACE_MS);
    const expired = f.create();
    expect(expired.getState().required).toBe(true);
    f.fail();
    await expired.check();
    expect(expired.getState().required).toBe(true);
    f.time(start);
    const restarted = f.create();
    expect(restarted.getState().required).toBe(true);
  });
  test("does not block a first offline launch or corrupt cache", async () => {
    const f = fixture();
    f.fail();
    f.cache("broken-json");
    const monitor = f.create();
    await monitor.check();
    expect(monitor.getState().failed).toBe(true);
    expect(monitor.getState().required).toBe(false);
  });
  test("a newer release does not extend an existing deadline", async () => {
    const f = fixture();
    const monitor = f.create();
    await monitor.check();
    f.time(start + GRACE_MS);
    f.response({
      schema: 1,
      channels: {
        "android-play": {
          ...release,
          version: "0.2.14",
          build: 10027,
          availableAt: new Date(start + GRACE_MS).toISOString(),
        },
      },
    });
    await monitor.check();
    expect(monitor.getState().required).toBe(true);
    expect(monitor.getState().deadline).toBe(start + GRACE_MS);
    expect(monitor.getState().release?.version).toBe("0.2.14");
  });
  test("explicit withdrawal clears a gate, malformed responses do not", async () => {
    const f = fixture();
    f.time(start + GRACE_MS);
    const monitor = f.create();
    await monitor.check();
    expect(monitor.getState().required).toBe(true);
    f.response({ schema: 1, channels: {} });
    await monitor.check();
    expect(monitor.getState().required).toBe(true);
    f.response({ schema: 1, channels: { "android-play": null } });
    await monitor.check();
    expect(monitor.getState().required).toBe(false);
    expect(f.create().getState().release).toBeNull();
  });
  test("updating or installing a newer build clears the old cached gate", async () => {
    const f = fixture();
    f.time(start + GRACE_MS);
    await f.create().check();
    f.installed.version = "0.2.13";
    f.installed.build = 10026;
    expect(f.create().getState().required).toBe(false);
    f.installed.build = 10027;
    expect(f.create().getState().release).toBeNull();
  });
  test("future availability never prompts early and same-version newer builds count", async () => {
    const f = fixture();
    f.time(start - 1);
    const monitor = f.create();
    await monitor.check();
    expect(monitor.getState().release).toBeNull();
    f.installed.version = "0.2.13";
    f.time(start);
    await monitor.check();
    expect(monitor.getState().release?.build).toBe(10026);
  });
  test("future-dated metadata cannot reopen an expired app", async () => {
    const f = fixture();
    f.time(start + GRACE_MS);
    const monitor = f.create();
    await monitor.check();
    f.response({
      schema: 1,
      channels: {
        "android-play": {
          ...release,
          version: "0.2.14",
          build: 10027,
          availableAt: new Date(start + GRACE_MS * 2).toISOString(),
        },
      },
    });
    await monitor.check();
    expect(monitor.getState().required).toBe(true);
    expect(monitor.getState().release).toEqual(release);
    expect(monitor.getState().failed).toBe(true);
  });
  test("the public endpoint is read only and serves a valid channel policy", async () => {
    const response = appReleaseRequest(new Request("https://example.test/api/app-release"));
    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    const value = await response.json();
    expect(() => readReleasePolicy(value, "android-play")).not.toThrow();
    expect(() => readReleasePolicy(value, "ios-testflight")).not.toThrow();
    expect(appReleaseRequest(new Request("https://example.test", { method: "POST" })).status).toBe(
      405,
    );
    expect(
      await appReleaseRequest(new Request("https://example.test", { method: "HEAD" })).text(),
    ).toBe("");
  });
  test("publishing requires explicit availability and can withdraw one channel", () => {
    const policy = {
      schema: 1 as const,
      channels: { "android-play": null, "ios-testflight": null },
    };
    expect(() =>
      changeReleasePolicy(policy, "android-play", ["0.2.13", "10026", availableAt], start),
    ).toThrow();
    expect(() =>
      changeReleasePolicy(
        policy,
        "android-play",
        ["0.2.13", "10026", availableAt, "--available"],
        start - 1,
      ),
    ).toThrow();
    const next = changeReleasePolicy(
      policy,
      "android-play",
      ["0.2.13", "10026", availableAt, "--available"],
      start,
    );
    expect(next.channels["android-play"]).toEqual(release);
    expect(next.channels["ios-testflight"]).toBeNull();
    expect(
      changeReleasePolicy(next, "android-play", ["--withdraw"]).channels["android-play"],
    ).toBeNull();
  });
});

import { describe, expect, test } from "bun:test";
import { changeReleasePolicy } from "../../../scripts/releases/app-policy";
