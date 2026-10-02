import { DocumentView } from "@notables/editor";
import { strToU8, type Zippable, zipSync } from "fflate";
import { renderToStaticMarkup } from "react-dom/server";
import { stripLeadingTitle } from "../../../lib/documents/strip-leading-title";
import type { BookChapter } from "../reader/use-book-content";
import type { BookEntry, Part } from "../store/book-store";
import { contentsList } from "./contents-list";
import { type LoadMedia, packageDocumentMedia } from "./epub-assets";
import { epubStylesheet } from "./epub-stylesheet";
import { escapeXml } from "./xml";

interface ManifestItem {
  id: string;
  href: string;
  mediaType: string;
  properties?: string;
}

const XHTML = "application/xhtml+xml";

function xhtmlDocument(title: string, language: string, body: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="${language}" xml:lang="${language}">
<head>
<meta charset="utf-8"/>
<title>${escapeXml(title)}</title>
<link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
${body}
</body>
</html>`;
}

/** Wraps a title into at most four lines of roughly `width` characters. */
function wrapTitle(title: string, width = 15): string[] {
  const lines: string[] = [];
  for (const word of title.split(/\s+/)) {
    const last = lines.at(-1);
    if (last !== undefined && `${last} ${word}`.length <= width)
      lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  return lines.length > 4
    ? [
        ...lines.slice(0, 3),
        `${lines
          .slice(3)
          .join(" ")
          .slice(0, width - 1)}…`,
      ]
    : lines;
}

/** The cover as plain SVG shapes and text, which every e-reader can draw. */
function coverSvg(title: string, author: string): string {
  const lines = wrapTitle(title)
    .map((line, index) => `<tspan x="190" dy="${index === 0 ? 0 : 128}">${escapeXml(line)}</tspan>`)
    .join("");
  return `<?xml version="1.0" encoding="utf-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1600" width="1200" height="1600">
<rect width="1200" height="1600" fill="#2a3a44"/>
<rect width="84" height="1600" fill="#1f2c34"/>
<text x="190" y="330" font-family="Georgia, serif" font-size="112" font-weight="600" fill="#ffffff">${lines}</text>
<text x="190" y="1440" font-family="Helvetica, Arial, sans-serif" font-size="44" letter-spacing="6" fill="#ffffff" fill-opacity="0.75">${escapeXml(author.toUpperCase())}</text>
</svg>`;
}

/** React 19 hoists `<link rel="preload">` hints for images; e-books don't need them. */
const PRELOAD_HINT = /<link rel="preload"[^>]*\/>/g;

/** Plain, reader-friendly media for e-books: no scripts or custom controls. */
export function renderChapterBody(document: unknown): string {
  return renderToStaticMarkup(
    <DocumentView
      document={document}
      media={{
        image: ({ src, alt, caption }) =>
          src ? (
            <figure>
              <img src={src} alt={alt} />
              {caption && <figcaption>{caption}</figcaption>}
            </figure>
          ) : null,
        audioClip: ({ src, transcript }) => (
          <figure className="audio">
            {src ? (
              // biome-ignore lint/a11y/useMediaCaption: the transcript below is the caption
              <audio controls src={src} />
            ) : (
              <p className="audio-note">A recording plays here in Notables.</p>
            )}
            {transcript && <figcaption>{transcript}</figcaption>}
          </figure>
        ),
      }}
    />,
  ).replace(PRELOAD_HINT, "");
}

export interface BuildEpubOptions {
  book: BookEntry;
  /** In reading order; a chapter that opens a part carries it, for the nested contents. */
  chapters: Array<BookChapter & { part?: Part }>;
  loadMedia: LoadMedia;
  language?: string;
  /** For reproducible output in tests. */
  modifiedAt?: Date;
}

/** Builds an EPUB 3 package for a book. */
export async function buildEpub({
  book,
  chapters,
  loadMedia,
  language = "en",
  modifiedAt = new Date(),
}: BuildEpubOptions): Promise<Uint8Array> {
  const title = book.title.trim() || "Untitled";
  const author = book.author.trim() || "Notables";
  const { documents, assets } = await packageDocumentMedia(
    chapters.map((chapter) =>
      chapter.document ? stripLeadingTitle(chapter.document, chapter.title) : null,
    ),
    loadMedia,
  );

  const files: Record<string, string | Uint8Array> = {};
  const manifest: ManifestItem[] = [];
  const spine: string[] = [];

  const add = (item: ManifestItem, content: string | Uint8Array, inSpine = false) => {
    files[`OEBPS/${item.href}`] = content;
    manifest.push(item);
    if (inSpine) spine.push(item.id);
  };

  add({ id: "css", href: "styles.css", mediaType: "text/css" }, epubStylesheet);
  add(
    { id: "cover-image", href: "cover.svg", mediaType: "image/svg+xml", properties: "cover-image" },
    coverSvg(title, author),
  );
  add(
    { id: "cover", href: "cover.xhtml", mediaType: XHTML },
    xhtmlDocument(
      title,
      language,
      `<section epub:type="cover" class="cover"><img src="cover.svg" alt="${escapeXml(title)}"/></section>`,
    ),
    true,
  );
  add(
    { id: "title-page", href: "title.xhtml", mediaType: XHTML },
    xhtmlDocument(
      title,
      language,
      `<section epub:type="titlepage" class="title-page"><h1>${escapeXml(title)}</h1>${
        book.subtitle ? `<p class="subtitle">${escapeXml(book.subtitle)}</p>` : ""
      }<p class="author">${escapeXml(author)}</p></section>`,
    ),
    true,
  );

  chapters.forEach((chapter, index) => {
    const href = `chapter-${index + 1}.xhtml`;
    const packaged = documents[index];
    const body = packaged?.document
      ? renderChapterBody(packaged.document)
      : `<p class="missing">This chapter wasn’t available on the exporting device.</p>`;
    add(
      {
        id: `chapter-${index + 1}`,
        href,
        mediaType: XHTML,
        ...(packaged?.usesRemoteResources ? { properties: "remote-resources" } : {}),
      },
      xhtmlDocument(
        chapter.title,
        language,
        `<section epub:type="chapter" class="chapter"><p class="chapter-number">Chapter ${index + 1}</p><h1>${escapeXml(chapter.title)}</h1>${body}</section>`,
      ),
      true,
    );
  });

  add(
    { id: "nav", href: "nav.xhtml", mediaType: XHTML, properties: "nav" },
    xhtmlDocument(
      "Contents",
      language,
      `<nav epub:type="toc" id="toc"><h1>Contents</h1>${contentsList(chapters, (index) => `chapter-${index + 1}.xhtml`)}</nav>`,
    ),
  );
  assets.forEach((asset, index) => {
    add({ id: `media-${index + 1}`, href: asset.path, mediaType: asset.mediaType }, asset.bytes);
  });

  const modified = `${modifiedAt.toISOString().slice(0, 19)}Z`;
  const opf = `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id" xml:lang="${language}">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:identifier id="book-id">urn:uuid:${book.id}</dc:identifier>
<dc:title>${escapeXml(title)}</dc:title>
<dc:creator>${escapeXml(author)}</dc:creator>
<dc:language>${language}</dc:language>
<meta property="dcterms:modified">${modified}</meta>
<meta name="cover" content="cover-image"/>
</metadata>
<manifest>
${manifest
  .map(
    (item) =>
      `<item id="${item.id}" href="${item.href}" media-type="${item.mediaType}"${item.properties ? ` properties="${item.properties}"` : ""}/>`,
  )
  .join("\n")}
</manifest>
<spine>
${spine.map((id) => `<itemref idref="${id}"/>`).join("\n")}
</spine>
</package>`;

  const container = `<?xml version="1.0" encoding="utf-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
<rootfiles>
<rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
</rootfiles>
</container>`;

  // The mimetype entry must come first and be stored uncompressed.
  const zip: Zippable = {
    mimetype: [strToU8("application/epub+zip"), { level: 0 }],
    "META-INF/container.xml": strToU8(container),
    "OEBPS/content.opf": strToU8(opf),
  };
  for (const [path, content] of Object.entries(files)) {
    zip[path] = typeof content === "string" ? strToU8(content) : [content, { level: 0 }];
  }
  return zipSync(zip, { level: 6 });
}
