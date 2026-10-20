import { expect, test } from "bun:test";
import { externalDestination } from "@/platform/external-links";

test("native routing keeps internal links and hands external links to their handlers", () => {
  const origin = "http://tauri.localhost";
  expect(externalDestination("/settings", origin)).toBeNull();
  expect(externalDestination("#heading", origin)).toBeNull();
  expect(externalDestination("https://pherus.org/legal/privacy-policy", origin)).toBe(
    "https://pherus.org/legal/privacy-policy",
  );
  expect(externalDestination("mailto:support@pherus.org", origin)).toBe(
    "mailto:support@pherus.org",
  );
  expect(externalDestination("tel:+256700000000", origin)).toBe("tel:+256700000000");
  expect(externalDestination("javascript:alert(1)", origin)).toBeNull();
  expect(externalDestination("file:///etc/passwd", origin)).toBeNull();
});
