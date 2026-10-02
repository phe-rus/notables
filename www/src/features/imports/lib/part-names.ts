/**
 * Reading structure out of names: "Vol 2", "Book 3", "S01E04",
 * "Chapter 12", "012.jpg". Numbers come back as numbers; the rest is a
 * cleaned-up title.
 */
export interface NameParts {
  volume: number | null;
  chapter: number | null;
  title: string;
}

const VOLUME = /\b(?:vol(?:ume)?|book|tome|part|season|s)\.?\s*0*(\d{1,3})(?=\b|e\d)/i;
const EPISODE = /\bs\d{1,3}\s*e(?:p)?\s*0*(\d{1,4})\b/i;
const CHAPTER = /\b(?:ch(?:apter)?|ep(?:isode)?|e|track|chap)\.?\s*0*(\d{1,4})\b/i;
const LEADING_NUMBER = /^\s*0*(\d{1,4})(?:\s*[-_.)\s]\s*|$)/;

export function stripExtension(name: string): string {
  return name.replace(/\.[a-z0-9]{2,5}$/i, "");
}

export function parseName(raw: string): NameParts {
  const name = stripExtension(raw.split("/").pop() ?? raw).replace(/[_]+/g, " ");
  const volume = VOLUME.exec(name);
  const episode = EPISODE.exec(name);
  const chapter = episode ?? CHAPTER.exec(name);
  const leading = !chapter && !volume ? LEADING_NUMBER.exec(name) : null;
  const title = name
    .replace(EPISODE, " ")
    .replace(VOLUME, " ")
    .replace(CHAPTER, " ")
    .replace(LEADING_NUMBER, " ")
    .replace(/[[(][^\])]*[\])]/g, " ")
    .replace(/\s*[-\u2013\u2014:|]\s*$/g, "")
    .replace(/^\s*[-\u2013\u2014:|]\s*/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return {
    volume: volume ? Number(volume[1]) : null,
    chapter: chapter ? Number(chapter[1]) : leading ? Number(leading[1]) : null,
    title,
  };
}

/** Sorts "2" before "10", ignoring case and accents. */
export const naturalCompare = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
}).compare;
