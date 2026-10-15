import { describe, expect, it } from "bun:test";
import { planSweep } from "../../../src/features/trash/lib/media-sweep";

const DAY = 24 * 60 * 60 * 1000;

describe("planSweep", () => {
  it("never deletes a file the first time it's found unused", () => {
    const plan = planSweep(["photo-1"], new Set(), {}, 10 * DAY);
    expect(plan.remove).toEqual([]);
    expect(plan.unused).toEqual({ "photo-1": 10 * DAY });
  });

  it("deletes a file still unused a week after it was first found so", () => {
    const plan = planSweep(
      ["photo-1", "photo-2"],
      new Set(),
      { "photo-1": 0, "photo-2": 3 * DAY },
      7 * DAY,
    );
    expect(plan.remove).toEqual(["photo-1"]);
    expect(plan.unused).toEqual({ "photo-2": 3 * DAY });
  });

  it("keeps used files and forgets a file that's used again", () => {
    const plan = planSweep(
      ["photo-1", "cover-1"],
      new Set(["photo-1", "cover-1"]),
      { "photo-1": 0 },
      30 * DAY,
    );
    expect(plan.remove).toEqual([]);
    expect(plan.unused).toEqual({});
  });
});
