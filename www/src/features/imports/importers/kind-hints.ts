import { strFromU8, unzipSync } from "fflate";

/** What a file says about itself: right to left manga, a left to right comic, or nothing. */
export type KindHint = "manga" | "comic" | null;

/**
 * A comic archive's own word, from `ComicInfo.xml`: `YesAndRightToLeft` is
 * manga and `No` is a comic. `Yes`, `Unknown` or a malformed file say nothing.
 */
export function comicInfoHint(xml: string | null): KindHint {
  if (!xml) return null;
  const value = /<Manga>\s*([A-Za-z]+)\s*<\/Manga>/.exec(xml)?.[1];
  if (value === "YesAndRightToLeft") return "manga";
  if (value === "No") return "comic";
  return null;
}

/** Whether an EPUB package's spine turns pages right to left. */
export function spineIsRtl(opf: string | null): boolean {
  if (!opf) return false;
  const spine = /<(?:\w+:)?spine\b[^>]*>/.exec(opf)?.[0] ?? "";
  return /page-progression-direction\s*=\s*["']rtl["']/.test(spine);
}

const named = (suffix: string) => (file: { name: string }) =>
  file.name.toLowerCase().endsWith(suffix);

/** Reads only `ComicInfo.xml` out of an archive, for the import preview. */
export function archiveHint(bytes: Uint8Array): KindHint {
  try {
    const files = unzipSync(bytes, { filter: named("comicinfo.xml") });
    const entry = Object.values(files)[0];
    return comicInfoHint(entry ? strFromU8(entry) : null);
  } catch {
    return null;
  }
}
