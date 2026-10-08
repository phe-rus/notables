import { describe, expect, it } from "bun:test";
import { checkDigit, readMrz } from "../../../src/features/wallet/lib/mrz";

// The specimen documents published in ICAO 9303.
const passport = [
  "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<",
  "L898902C36UTO7408122F1204159ZE184226B<<<<<10",
].join("\n");
const idCard = [
  "I<UTOD231458907<<<<<<<<<<<<<<<",
  "7408122F1204159UTO<<<<<<<<<<<6",
  "ERIKSSON<<ANNA<MARIA<<<<<<<<<<",
].join("\n");

describe("machine-readable zone", () => {
  it("computes ICAO check digits", () => {
    expect(checkDigit("L898902C3")).toBe(6);
    expect(checkDigit("740812")).toBe(2);
    expect(checkDigit("120415")).toBe(9);
  });

  it("reads a passport", () => {
    expect(readMrz(`Some header text\n${passport}\n`)).toEqual({
      kind: "passport",
      country: "UTO",
      number: "L898902C3",
      surname: "ERIKSSON",
      givenNames: "ANNA MARIA",
      birthDate: "1974-08-12",
      expiry: "2012-04-15",
    });
  });

  it("reads an identity card", () => {
    expect(readMrz(idCard)).toMatchObject({
      kind: "national-id",
      country: "UTO",
      number: "D23145890",
      givenNames: "ANNA MARIA",
    });
  });

  it("forgives spaces and a letter read in place of a digit", () => {
    // "7408122F" read as "740812ZF": the birth date's check digit 2 seen as Z.
    const misread = passport.replace("C36UTO", "C3 6UTO").replace("7408122F", "740812ZF");
    expect(readMrz(misread)).toMatchObject({ number: "L898902C3", birthDate: "1974-08-12" });
  });

  it("refuses a reading whose check digit doesn't match", () => {
    expect(readMrz(passport.replace("L898902C36", "L898902C46"))).toBeNull();
  });
});
