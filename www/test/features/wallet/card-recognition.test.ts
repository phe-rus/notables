import { describe, expect, it } from "bun:test";
import { suggestCardFields } from "../../../src/features/wallet/lib/card-recognition";

describe("wallet recognition suggestions", () => {
  it("reads labeled membership and national identity numbers", () => {
    expect(suggestCardFields("LIBRARY\nMEMBERSHIP\nMember No: AB001234")).toMatchObject({
      kind: "membership",
      number: "AB001234",
    });
    expect(suggestCardFields("NATIONAL IDENTITY CARD\nNIN: CM00123456")).toMatchObject({
      kind: "national-id",
      number: "CM00123456",
    });
  });
  it("reads utility labels without punctuation and values on the next line", () => {
    const fields = suggestCardFields("UMEME\nMeter No 00123456789\nAccount Number\n0004567");
    expect(fields.meter).toBe("00123456789");
    expect(fields.account).toBe("0004567");
  });
  it("reads a printed bank holder and split Amex number", () => {
    const fields = suggestCardFields("TEST BANK\n3782 822463 10005\n12/29\nJANE EXAMPLE");
    expect(fields.kind).toBe("bank");
    expect(fields.number).toBe("3782 822463 10005");
    expect(fields.holder).toBe("JANE EXAMPLE");
  });
  it("recognizes Umeme as electricity and preserves meter and account zeros", () => {
    const fields = suggestCardFields("UMEME\nMETER NUMBER: 00123456789\nACCOUNT NUMBER: 0004567");
    expect(fields.kind).toBe("electricity");
    expect(fields.meter).toBe("00123456789");
    expect(fields.account).toBe("0004567");
    expect(fields.number).toBe("");
    expect(fields.issuer).toBe("Umeme");
  });
  it("keeps printed leading zeros and spacing, without treating expiry as part of the number", () => {
    const fields = suggestCardFields(
      "SYNTHETIC TEST CARD\n0012 3456 7890 5678 12/29\nCARDHOLDER: TEST PERSON",
    );
    expect(fields.number).toBe("0012 3456 7890 5678");
    expect(fields.expiry).toBe("12/29");
    expect(fields.holder).toBe("TEST PERSON");
  });
  it("does not invent a holder or identifier from unrecognized text", () => {
    const fields = suggestCardFields("MEMBERSHIP\nSOME ORGANIZATION\nNOT A BANK NUMBER");
    expect(fields.number).toBe("");
    expect(fields.holder).toBe("");
    expect(fields.expiry).toBe("");
  });
  it("reads a passport from its machine-readable zone", () => {
    const fields = suggestCardFields(
      "PASSPORT\nP<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<\nL898902C36UTO7408122F1204159ZE184226B<<<<<10",
    );
    expect(fields).toMatchObject({
      kind: "passport",
      number: "L898902C3",
      holder: "Anna Maria Eriksson",
      expiry: "2012-04-15",
      issuer: "UTO",
    });
  });
  it("recognizes a SIM card by its ICCID and keeps it whole", () => {
    const fields = suggestCardFields("SAMPLE NETWORK\n8925 6000 0000 0000 000");
    expect(fields.kind).toBe("sim");
    expect(fields.account).toBe("8925600000000000000");
    expect(fields.number).toBe("");
  });
});

describe("varied printed card layouts", () => {
  for (const [text, expected] of [
    [
      "UEDCL\nMeter No: 00012345678\nCustomer: 0009876",
      { kind: "electricity", meter: "00012345678", account: "0009876" },
    ],
    [
      "DStv\nSmartcard: 00123456789",
      { kind: "television", account: "00123456789", issuer: "DStv" },
    ],
    ["GOtv\nDecoder No: 0012345678", { kind: "television", account: "0012345678" }],
    [
      "MTN SIM CARD\nICCID: 8925600000000000000\nPUK: 00123456",
      { kind: "sim", account: "8925600000000000000", puk: "00123456" },
    ],
    [
      "PASSPORT\nDocument No: AB0123456\nSurname: EXAMPLE\nGiven names: JANE\nDate of expiry: 12/10/2030",
      { kind: "passport", number: "AB0123456", holder: "JANE EXAMPLE", expiry: "12/10/2030" },
    ],
    [
      "NATIONAL ID\nNIN\nCM001234567890\nExpiry: 12/30",
      { kind: "national-id", number: "CM001234567890" },
    ],
    [
      "MEMBERSHIP\nMember No: 0012345678901234\nExpires: 12/30",
      { kind: "membership", number: "0012345678901234" },
    ],
    ["Signature\nCVV: 123", { kind: "other", cvv: "123", number: "" }],
  ] as const) {
    it(`reads synthetic ${expected.kind} details`, () => {
      expect(suggestCardFields(text)).toMatchObject(expected);
    });
  }
});

it("reads bilingual passport labels without using birth dates as expiry", () => {
  expect(
    suggestCardFields(
      "PASSPORT\nPassport No. / No du passeport\nAB0123456\nSurname / Nom\nEXAMPLE\nGiven names / Prénoms\nJANE\nDate of birth\n12/10/1990\nDate of expiry / Date d’expiration\n15 APR 2030",
    ),
  ).toMatchObject({
    kind: "passport",
    number: "AB0123456",
    holder: "JANE EXAMPLE",
    expiry: "15 APR 2030",
  });
  expect(suggestCardFields("PASSPORT\nDate of birth\n12/10/1990").expiry).toBe("");
});
it("recognizes spaced utility logos and national identification authority labels", () => {
  expect(suggestCardFields("U M E M E\n00123456789")).toMatchObject({
    kind: "electricity",
    issuer: "Umeme",
    meter: "00123456789",
  });
  expect(
    suggestCardFields("NATIONAL IDENTIFICATION AND REGISTRATION AUTHORITY\nNIN: CM00123456").kind,
  ).toBe("national-id");
});

describe("imperfect bank scans", () => {
  it("keeps a Visa classification and expiry when OCR misses a digit", () => {
    expect(suggestCardFields("EXAMPLE\n111 1111 1111 1111\nVALID THRU\n12/29\nVISA")).toMatchObject(
      { kind: "bank", number: "111 1111 1111 1111", expiry: "12/29", numberUncertain: true },
    );
  });
  it("recognizes a bank card even when the number is unreadable", () => {
    expect(suggestCardFields("VISA\nVALID THRU\n12/29")).toMatchObject({
      kind: "bank",
      number: "",
      expiry: "12/29",
    });
  });
  it("does not mark a valid complete number uncertain", () => {
    expect(suggestCardFields("VISA\n4111 1111 1111 1111\n12/29").numberUncertain).toBe(false);
  });
});

it("reads bank number groups emitted as separate Vision text observations", () => {
  const fields = suggestCardFields("VISA\n4111\n1111\n1111\n1111\n12/29\nJANE EXAMPLE");
  expect(fields.kind).toBe("bank");
  expect(fields.number.replace(/\D/g, "")).toBe("4111111111111111");
  expect(fields.numberUncertain).toBe(false);
});

it("keeps expiry separate from a bank number split across lines", () => {
  const fields = suggestCardFields("AMERICAN EXPRESS\n3782\n822463\n10005\n12/29");
  expect(fields.number.replace(/\D/g, "")).toBe("378282246310005");
  expect(fields.expiry).toBe("12/29");
  expect(fields.numberUncertain).toBe(false);
});

it("does not replace a complete wrapped bank number with its first labeled group", () => {
  const fields = suggestCardFields("VISA\nCard No\n4111\n1111\n1111\n1111\n12/29");
  expect(fields.number.replace(/\D/g, "")).toBe("4111111111111111");
});
