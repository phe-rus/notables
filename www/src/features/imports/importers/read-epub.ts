import { strFromU8, unzipSync } from "fflate";

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
}

export interface Epub {
  title: string;
  author: string;
  cover: EpubImage | null;
  chapters: EpubChapter[];
  images: Map<string, EpubImage>;
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

/** Chapter titles by file, from the EPUB 3 nav document or the EPUB 2 NCX. */
function tableOfContents(
  files: Record<string, Uint8Array>,
  nav: string | null,
  ncx: string | null,
) {
  const titles = new Map<string, string>();
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
  }
  return titles;
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
  const titles = tableOfContents(files, nav, ncx);

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
  for (const ref of byLocalName(opf, "itemref")) {
    if (ref.getAttribute("linear") === "no") continue;
    const item = manifest.get(ref.getAttribute("idref") ?? "");
    if (!item || item.path === nav || !/x?html/.test(item.type)) continue;
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
    });
  }

  return { title, author, cover, chapters, images };
}
