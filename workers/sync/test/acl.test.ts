import { describe, expect, it } from "vitest";
import { roleFor } from "../src/acl";

describe("roleFor", () => {
  const acl = {
    ownerId: "owner",
    grants: [
      { accountId: "editor", role: "editor" as const },
      { accountId: "reader", role: "viewer" as const },
    ],
  };

  it("lets the first connection claim an unowned document", () => {
    expect(roleFor(null, "anyone")).toBe("editor");
  });

  it("resolves owner and granted roles", () => {
    expect(roleFor(acl, "owner")).toBe("editor");
    expect(roleFor(acl, "editor")).toBe("editor");
    expect(roleFor(acl, "reader")).toBe("viewer");
  });

  it("denies everyone else", () => {
    expect(roleFor(acl, "stranger")).toBeNull();
  });
});
