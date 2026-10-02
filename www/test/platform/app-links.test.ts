import { describe, expect, it } from "bun:test";
import { appLinkFor, routeForAppLink } from "../../src/platform/app-links";

describe("app links", () => {
  it("makes links for places in the app", () => {
    expect(appLinkFor("/notes/0193abcd-ef")).toBe("notables://notes/0193abcd-ef");
  });

  it("routes known places", () => {
    expect(routeForAppLink("notables://notes/0193abcd-ef")).toBe("/notes/0193abcd-ef");
    expect(routeForAppLink("notables://books/0193abcd-ef")).toBe("/books/0193abcd-ef");
    expect(routeForAppLink("notables://read/0193abcd-ef")).toBe("/read/0193abcd-ef");
    expect(routeForAppLink("notables://verify#seal=abc.def")).toBe("/verify#seal=abc.def");
    expect(routeForAppLink("notables://settings")).toBe("/settings");
    expect(routeForAppLink("notables://")).toBe("/");
  });

  it("ignores anything else", () => {
    expect(routeForAppLink("https://example.com/notes/1")).toBeNull();
    expect(routeForAppLink("notables://admin/delete")).toBeNull();
    expect(routeForAppLink("notables://notes/../../etc")).toBe("/notes");
    expect(routeForAppLink("not a url")).toBeNull();
  });
});
