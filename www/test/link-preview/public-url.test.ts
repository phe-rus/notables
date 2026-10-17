import { expect, test } from "bun:test";
import { previewUrl, publicAddress } from "../../src/server/link-preview/public-url";

test("previews refuse local services, credentials and non-web protocols, including redirects", () => {
  for (const value of [
    "http://example.com",
    "https://localhost",
    "https://127.0.0.1",
    "https://2130706433",
    "https://[::1]",
    "https://router.local",
    "https://user:secret@example.com",
    "https://example.com:8443",
    "file:///etc/passwd",
    "javascript:alert(1)",
  ])
    expect(() => previewUrl(value)).toThrow();
  expect(() => previewUrl("//127.0.0.1/private", "https://example.com")).toThrow();
  expect(previewUrl("/about#title", "https://example.com").href).toBe("https://example.com/about");
});
test("DNS answers must be public addresses", () => {
  for (const address of [
    "127.0.0.1",
    "10.2.3.4",
    "172.16.0.1",
    "192.168.1.2",
    "169.254.169.254",
    "100.64.0.1",
    "::1",
    "fc00::1",
    "fe80::1",
    "::ffff:127.0.0.1",
    "2001:db8::1",
    "bad",
    "8..8.8",
  ])
    expect(publicAddress(address)).toBe(false);
  expect(publicAddress("8.8.8.8")).toBe(true);
  expect(publicAddress("2606:4700:4700::1111")).toBe(true);
});
