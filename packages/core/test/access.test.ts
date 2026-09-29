import { describe, expect, it } from "vitest";
import { can, resolveRole, type Viewer } from "../src/access";
import { createId } from "../src/id";

const owner = createId();
const friend = createId();
const stranger = createId();
const family = createId();

const viewer = (accountId: string | null, circleIds: string[] = []): Viewer => ({
  accountId,
  circleIds,
});

describe("resolveRole", () => {
  it("gives owners editor access regardless of visibility", () => {
    expect(resolveRole(owner, { visibility: "private" }, viewer(owner))).toBe("editor");
  });

  it("hides private notes from everyone else", () => {
    expect(resolveRole(owner, { visibility: "private" }, viewer(friend))).toBeNull();
    expect(resolveRole(owner, { visibility: "private" }, viewer(null))).toBeNull();
  });

  it("grants explicit people their assigned role only", () => {
    const access = {
      visibility: "people" as const,
      grants: [{ accountId: friend, role: "commenter" as const }],
    };
    expect(resolveRole(owner, access, viewer(friend))).toBe("commenter");
    expect(resolveRole(owner, access, viewer(stranger))).toBeNull();
  });

  it("grants circle members the circle role", () => {
    const access = { visibility: "circle" as const, circleId: family, role: "viewer" as const };
    expect(resolveRole(owner, access, viewer(friend, [family]))).toBe("viewer");
    expect(resolveRole(owner, access, viewer(stranger))).toBeNull();
  });

  it("lets signed-in readers comment on public notes, visitors only read", () => {
    const access = { visibility: "public" as const, publicationId: createId() };
    expect(resolveRole(owner, access, viewer(stranger))).toBe("commenter");
    expect(resolveRole(owner, access, viewer(null))).toBe("viewer");
  });
});

describe("can", () => {
  it("ranks roles viewer < commenter < editor", () => {
    expect(can("editor", "commenter")).toBe(true);
    expect(can("commenter", "editor")).toBe(false);
    expect(can(null, "viewer")).toBe(false);
  });
});
