/**
 * Reads the machine-readable zone (ICAO 9303) printed along the bottom of
 * passports (two lines of 44) and many identity cards (three lines of 30).
 * It is the reliable part of a scanned document: fixed positions, and check
 * digits that tell a correct reading from a misread one.
 */
export interface MrzReading {
  kind: "passport" | "national-id";
  /** Issuing state, as its three-letter code. */
  country: string;
  number: string;
  surname: string;
  givenNames: string;
  /** ISO date. */
  birthDate: string;
  /** ISO date. */
  expiry: string;
}

const WEIGHTS = [7, 3, 1] as const;

const value = (char: string) =>
  char === "<" ? 0 : /\d/.test(char) ? Number(char) : char.charCodeAt(0) - 55;

/** ICAO check digit: weights 7, 3, 1 over the field, modulo 10. */
export function checkDigit(field: string): number {
  let sum = 0;
  for (let i = 0; i < field.length; i++) sum += value(field[i] ?? "<") * (WEIGHTS[i % 3] ?? 1);
  return sum % 10;
}

// Letters text recognition often reads in place of digits.
const asDigits = (text: string) =>
  text
    .replace(/[OQD]/g, "0")
    .replace(/[IL]/g, "1")
    .replace(/Z/g, "2")
    .replace(/S/g, "5")
    .replace(/B/g, "8");

const valid = (field: string, digit: string) => checkDigit(field) === Number(asDigits(digit));

function date(yymmdd: string, future: boolean): string | null {
  const digits = asDigits(yymmdd);
  if (!/^\d{6}$/.test(digits)) return null;
  const yy = Number(digits.slice(0, 2));
  const thisYear = new Date().getFullYear() % 100;
  // Expiry dates are ahead of us; birth dates behind.
  const century = future ? 2000 : yy > thisYear ? 1900 : 2000;
  return `${century + yy}-${digits.slice(2, 4)}-${digits.slice(4, 6)}`;
}

function names(field: string) {
  const [surname = "", given = ""] = field.split("<<");
  const clean = (part: string) => part.replace(/<+/g, " ").trim();
  return { surname: clean(surname), givenNames: clean(given) };
}

/** Candidate MRZ lines: long runs of capitals, digits and filler. */
function mrzLines(text: string): string[] {
  return text
    .toUpperCase()
    .replace(/[«‹]/g, "<")
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ""))
    .filter((line) => line.length >= 28 && /^[A-Z0-9<]+$/.test(line) && line.includes("<"));
}

const fit = (line: string, length: number) => line.slice(0, length).padEnd(length, "<");

export function readMrz(text: string): MrzReading | null {
  const lines = mrzLines(text);
  for (let i = 0; i < lines.length; i++) {
    const a = lines[i] ?? "";
    const b = lines[i + 1];
    const c = lines[i + 2];
    // Passport: two lines of 44.
    if (b && a.startsWith("P") && a.length >= 40 && b.length >= 40) {
      const top = fit(a, 44);
      const bottom = fit(b, 44);
      const number = bottom.slice(0, 9);
      if (!valid(number, bottom[9] ?? "")) continue;
      const birth = date(bottom.slice(13, 19), false);
      const expiry = date(bottom.slice(21, 27), true);
      if (!birth || !expiry) continue;
      return {
        kind: "passport",
        country: top.slice(2, 5).replace(/</g, ""),
        number: number.replace(/</g, ""),
        ...names(top.slice(5)),
        birthDate: birth,
        expiry,
      };
    }
    // Identity card: three lines of 30.
    if (b && c && /^[IAC]/.test(a) && a.length >= 28 && b.length >= 28 && c.length >= 28) {
      const top = fit(a, 30);
      const middle = fit(b, 30);
      const number = top.slice(5, 14);
      if (!valid(number, top[14] ?? "")) continue;
      const birth = date(middle.slice(0, 6), false);
      const expiry = date(middle.slice(8, 14), true);
      if (!birth || !expiry) continue;
      return {
        kind: "national-id",
        country: top.slice(2, 5).replace(/</g, ""),
        number: number.replace(/</g, ""),
        ...names(fit(c, 30)),
        birthDate: birth,
        expiry,
      };
    }
  }
  return null;
}
