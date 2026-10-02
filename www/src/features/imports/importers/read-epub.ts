import { strFromU8, unzipSync } from "fflate";
import { spineIsRtl } from "./kind-hints";

/**
 * Reads an EPUB (2 or 3): title, author, cover, and each chapter's HTML in
 * reading order, with the images it uses. Chapter titles come from the
 * table of contents when there is one, otherwise from the chapter's own
 * first heading.
 */

export interface EpubImage {
  bytes: Uint8Array;
  type: string;
}

export interface EpubChapter {
  title: string;
  /** Body HTML; image sources are archive paths, keys of `images`. */
  html: string;
  /** The file it came from inside the archive. */
  path: string;
}

/** A top level contents entry that holds others: a part, opening at a file. */
export interface EpubPart {
  title: string;
  firstChapterPath: string;
}

export interface Epub {
  title: string;
  author: string;
  /** The book's `dc:language` (BCP 47), when it declares one. */
  language: string | null;
  cover: EpubImage | null;
  chapters: EpubChapter[];
  images: Map<string, EpubImage>;
  /** Its spine turns pages right to left, as manga does. */
  rtl: boolean;
  parts: EpubPart[];
  /** Every reading order file, including ones that gave no chapter. */
  spine: string[];
}

const parser = () => new DOMParser();

/** Resolves `href` against the folder of `base`, both archive paths. */
export function resolvePath(base: string, href: string): string {
  const clean = decodeURIComponent(href.split("#")[0] ?? "");
  const parts = base.split("/").slice(0, -1);
  for (const part of clean.split("/")) {
    if (part === "..") parts.pop();
    else if (part && part !== ".") parts.push(part);
  }
  return parts.join("/");
}

function text(files: Record<string, Uint8Array>, path: string): string | null {
  const bytes = files[path];
  return bytes ? strFromU8(bytes) : null;
}

/** Elements by local name, whatever namespace prefix the file uses. */
const byLocalName = (
  root: { querySelectorAll(selectors: string): NodeListOf<Element> },
  name: string,
) => [...root.querySelectorAll("*")].filter((element) => element.localName === name);

/** Direct children of an element with a local name. */
const childrenNamed = (element: Element, name: string) =>
  [...element.children].filter((child) => child.localName === name);

/**
 * Parts from a nested contents list: a top level entry that holds entries
 * is a part, opening at its own file when it has one, else at its first
 * entry's. Top level entries without children are plain chapters.
 */
function partsOf<T>(
  top: T[],
  read: (entry: T) => { title: string; path: string | null; children: T[] },
): EpubPart[] {
  const parts: EpubPart[] = [];
  for (const entry of top) {
    const { title, path, children } = read(entry);
    if (children.length === 0 || !title) continue;
    const first = path ?? children.map((child) => read(child).path).find(Boolean) ?? null;
    if (first) parts.push({ title, firstChapterPath: first });
  }
  return parts;
}

/** Chapter titles by file, and parts, from the EPUB 3 nav document or the EPUB 2 NCX. */
function tableOfContents(
  files: Record<string, Uint8Array>,
  nav: string | null,
  ncx: string | null,
) {
  const titles = new Map<string, string>();
  let parts: EpubPart[] = [];
  if (nav) {
    const doc = parser().parseFromString(text(files, nav) ?? "", "application/xhtml+xml");
    const tocNav =
      byLocalName(doc, "nav").find((element) =>
        (element.getAttribute("epub:type") ?? element.getAttribute("type") ?? "").includes("toc"),
      ) ?? byLocalName(doc, "nav")[0];
    for (const link of tocNav ? byLocalName(tocNav, "a") : []) {
      const href = link.getAttribute("href");
      const label = link.textContent?.trim();
      if (href && label) {
        const path = resolvePath(nav, href);
        if (!titles.has(path)) titles.set(path, label);
      }
    }
    const list = tocNav ? byLocalName(tocNav, "ol")[0] : undefined;
    if (list) {
      parts = partsOf(childrenNamed(list, "li"), (item) => {
        const link = childrenNamed(item, "a")[0];
        const label = link ?? childrenNamed(item, "span")[0];
        const href = link?.getAttribute("href");
        const nested = childrenNamed(item, "ol")[0];
        return {
          title: label?.textContent?.trim() ?? "",
          path: href ? resolvePath(nav, href) : null,
          children: nested ? childrenNamed(nested, "li") : [],
        };
      });
    }
  }
  if (titles.size === 0 && ncx) {
    const doc = parser().parseFromString(text(files, ncx) ?? "", "application/xml");
    for (const point of byLocalName(doc, "navPoint")) {
      const label = byLocalName(point, "text")[0]?.textContent?.trim();
      const src = byLocalName(point, "content")[0]?.getAttribute("src");
      if (label && src) {
        const path = resolvePath(ncx, src);
        if (!titles.has(path)) titles.set(path, label);
      }
    }
    const map = byLocalName(doc, "navMap")[0];
    if (parts.length === 0 && map) {
      parts = partsOf(childrenNamed(map, "navPoint"), (point) => {
        const src = childrenNamed(point, "content")[0]?.getAttribute("src");
        return {
          title: byLocalName(point, "text")[0]?.textContent?.trim() ?? "",
          path: src ? resolvePath(ncx, src) : null,
          children: childrenNamed(point, "navPoint"),
        };
      });
    }
  }
  return { titles, parts };
}

const imageTypes: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
};

export function readEpub(bytes: Uint8Array): Epub {
  const files = unzipSync(bytes);
  const container = text(files, "META-INF/container.xml");
  if (!container) throw new Error("This file isn’t an EPUB.");
  const opfPath = parser()
    .parseFromString(container, "application/xml")
    .querySelector("rootfile")
    ?.getAttribute("full-path");
  const opfText = opfPath ? text(files, opfPath) : null;
  if (!opfPath || !opfText) throw new Error("This EPUB has no package document.");
  const opf = parser().parseFromString(opfText, "application/xml");

  const title = byLocalName(opf, "title")[0]?.textContent?.trim() || "Untitled";
  const author = byLocalName(opf, "creator")[0]?.textContent?.trim() ?? "";
  const language = byLocalName(opf, "language")[0]?.textContent?.trim() || null;
  const manifest = new Map<string, { path: string; type: string; properties: string }>();
  for (const item of byLocalName(opf, "item")) {
    const id = item.getAttribute("id");
    const href = item.getAttribute("href");
    if (!id || !href) continue;
    manifest.set(id, {
      path: resolvePath(opfPath, href),
      type: item.getAttribute("media-type") ?? "",
      properties: item.getAttribute("properties") ?? "",
    });
  }

  const nav = [...manifest.values()].find((item) => item.properties.includes("nav"))?.path ?? null;
  const ncxId = byLocalName(opf, "spine")[0]?.getAttribute("toc");
  const ncx =
    (ncxId && manifest.get(ncxId)?.path) ||
    [...manifest.values()].find((item) => item.type === "application/x-dtbncx+xml")?.path ||
    null;
  const { titles, parts } = tableOfContents(files, nav, ncx);

  const coverId =
    byLocalName(opf, "meta")
      .find((meta) => meta.getAttribute("name") === "cover")
      ?.getAttribute("content") ??
    [...manifest.entries()].find(([, item]) => item.properties.includes("cover-image"))?.[0];
  const coverItem = coverId ? manifest.get(coverId) : undefined;
  const coverBytes = coverItem ? files[coverItem.path] : undefined;
  const cover = coverItem && coverBytes ? { bytes: coverBytes, type: coverItem.type } : null;

  const images = new Map<string, EpubImage>();
  const chapters: EpubChapter[] = [];
  const spine: string[] = [];
  for (const ref of byLocalName(opf, "itemref")) {
    if (ref.getAttribute("linear") === "no") continue;
    const item = manifest.get(ref.getAttribute("idref") ?? "");
    if (!item || item.path === nav || !/x?html/.test(item.type)) continue;
    spine.push(item.path);
    const source = text(files, item.path);
    if (!source) continue;
    const doc = parser().parseFromString(source, "application/xhtml+xml");
    const body = doc.querySelector("body") ?? doc.documentElement;

    // Point images at archive paths and collect them.
    for (const image of [...body.querySelectorAll("img, image")]) {
      const href =
        image.getAttribute("src") ?? image.getAttribute("href") ?? image.getAttribute("xlink:href");
      if (!href) continue;
      const path = resolvePath(item.path, href);
      const file = files[path];
      if (!file) continue;
      const ext = path.split(".").pop()?.toLowerCase() ?? "";
      images.set(path, { bytes: file, type: imageTypes[ext] ?? "application/octet-stream" });
      if (image.localName === "image") {
        // SVG-wrapped cover pages: replace with a plain image.
        const img = doc.createElementNS("http://www.w3.org/1999/xhtml", "img");
        img.setAttribute("src", path);
        (image.closest("svg") ?? image).replaceWith(img);
      } else {
        image.setAttribute("src", path);
      }
    }

    const heading = body.querySelector("h1, h2, h3")?.textContent?.trim();
    const words = body.textContent?.trim() ?? "";
    // Skip near-empty pages (blank separators); keep image-only pages such as plates.
    if (!words && !body.querySelector("img")) continue;
    chapters.push({
      title: titles.get(item.path) || heading || `Chapter ${chapters.length + 1}`,
      html: body.innerHTML,
      path: item.path,
    });
  }

  return {
    title,
    author,
    language,
    cover,
    chapters,
    images,
    rtl: spineIsRtl(opfText),
    parts,
    spine,
  };
}

/**
 * Just enough of an EPUB for the import preview: its direction and its
 * part titles, read from the package and contents files only.
 */
export function readEpubOutline(bytes: Uint8Array): { rtl: boolean; parts: string[] } {
  try {
    const head = unzipSync(bytes, {
      filter: (file) => file.name === "META-INF/container.xml" || file.name.endsWith(".opf"),
    });
    const container = text(head, "META-INF/container.xml");
    const opfPath = container
      ? parser()
          .parseFromString(container, "application/xml")
          .querySelector("rootfile")
          ?.getAttribute("full-path")
      : null;
    const opfText = opfPath ? text(head, opfPath) : null;
    if (!opfPath || !opfText) return { rtl: false, parts: [] };
    const opf = parser().parseFromString(opfText, "application/xml");
    let nav: string | null = null;
    let ncx: string | null = null;
    for (const item of byLocalName(opf, "item")) {
      const href = item.getAttribute("href");
      if (!href) continue;
      if ((item.getAttribute("properties") ?? "").includes("nav")) nav = resolvePath(opfPath, href);
      if (item.getAttribute("media-type") === "application/x-dtbncx+xml") {
        ncx = resolvePath(opfPath, href);
      }
    }
    const wanted = new Set([nav, ncx].filter(Boolean));
    const toc = unzipSync(bytes, { filter: (file) => wanted.has(file.name) });
    const { parts } = tableOfContents(toc, nav, ncx);
    return { rtl: spineIsRtl(opfText), parts: parts.map((part) => part.title) };
  } catch {
    return { rtl: false, parts: [] };
  }
}
