/** Previews are web pages, never local services, credentials or arbitrary protocols. */
export function previewUrl(input: string, base?: string): URL {
  const url = new URL(input, base);
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443") ||
    !/^(?:[a-z\d-]+\.)+[a-z][a-z\d-]{1,62}$/i.test(host) ||
    /(?:^|\.)(?:localhost|local|internal|lan|home|test|invalid|onion)$/.test(host)
  )
    throw new Error("unsupported-link");
  url.hostname = host;
  url.hash = "";
  return url;
}
export function publicAddress(value: string): boolean {
  if (value.includes(":"))
    return /^[23][\da-f]{0,3}:/i.test(value) && !/^2001:(?:0:|db8:)/i.test(value);
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(value)) return false;
  const bytes = value.split(".").map(Number);
  if (bytes.length !== 4 || bytes.some((byte) => !Number.isInteger(byte) || byte < 0 || byte > 255))
    return false;
  const [a = 0, b = 0, c = 0] = bytes;
  return (
    a !== 0 &&
    a !== 10 &&
    a !== 127 &&
    a < 224 &&
    !(a === 100 && b >= 64 && b <= 127) &&
    !(a === 169 && b === 254) &&
    !(a === 172 && b >= 16 && b <= 31) &&
    !(a === 192 && (b === 168 || (b === 0 && (c === 0 || c === 2)))) &&
    !(a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) &&
    !(a === 203 && b === 0 && c === 113)
  );
}
