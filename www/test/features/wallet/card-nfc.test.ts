import { expect, it } from "bun:test";
import { cardNfcText } from "../../../src/features/wallet/lib/card-nfc";

it("decodes NDEF text without using the chip identifier as an account", () => {
  const payload = [2, 101, 110, ...new TextEncoder().encode("UMEME\nMETER NUMBER: 00123456789")];
  expect(
    cardNfcText({ id: [0, 1, 2], kind: [], records: [{ tnf: 1, kind: [84], id: [], payload }] }),
  ).toBe("UMEME\nMETER NUMBER: 00123456789");
  expect(cardNfcText({ id: [0, 1, 2], kind: [], records: [] })).toBe("");
});
it("rejects oversized or malformed NFC text and ignores URI records", () => {
  const tag = (payload: number[], kind = [84]) => ({
    id: [],
    kind: [],
    records: [{ tnf: 1, kind, id: [], payload }],
  });
  expect(() => cardNfcText(tag([63, 1]))).toThrow();
  expect(() => cardNfcText(tag(Array(20_001).fill(0)))).toThrow();
  expect(cardNfcText(tag([0, 104, 116, 116, 112], [85]))).toBe("");
});
