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
