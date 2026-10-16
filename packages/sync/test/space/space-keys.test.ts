import { describe, expect, it } from "bun:test";
import {
  deriveKey,
  fromBase64,
  newSecret,
  open,
  roomOf,
  seal,
  spaceCode,
  spaceIdOf,
  toBase64,
} from "../../src/space/space-keys";

describe("space keys", () => {
  const root = new Uint8Array(32).fill(7);

  it("shows a space id as twelve readable characters in three groups", () => {
    expect(spaceCode("00000000000000000000000000000000")).toBe("0000-0000-0000");
    expect(spaceCode("ffffffffffffffffffffffffffffffff")).toBe("ZZZZ-ZZZZ-ZZZZ");
    expect(spaceCode(spaceIdOf(root))).toMatch(
      /^[0-9A-HJKMNP-TV-Z]{4}(-[0-9A-HJKMNP-TV-Z]{4}){2}$/,
    );
    expect(spaceCode(spaceIdOf(root))).not.toBe(spaceCode(spaceIdOf(newSecret())));
  });

  it("derives the same names from the same secret, and different ones per purpose", () => {
    expect(spaceIdOf(root)).toBe(spaceIdOf(new Uint8Array(32).fill(7)));
    expect(spaceIdOf(root)).toHaveLength(32);
    expect(roomOf(root)).not.toBe(spaceIdOf(root));
    expect(deriveKey(root, "frames")).not.toEqual(deriveKey(root, "backup"));
  });

  it("opens what it sealed, and nothing sealed with another key", () => {
    const key = newSecret();
    const sealed = seal(key, new TextEncoder().encode("hello"));
    expect(new TextDecoder().decode(open(key, sealed) ?? new Uint8Array())).toBe("hello");
    expect(open(newSecret(), sealed)).toBeNull();
    const last = sealed.length - 1;
    sealed[last] = (sealed[last] ?? 0) ^ 1;
    expect(open(key, sealed)).toBeNull();
  });

  it("round trips base64, large inputs included", () => {
    const bytes = new Uint8Array(100_000).map((_, i) => i % 256);
    expect(fromBase64(toBase64(bytes))).toEqual(bytes);
  });
});
