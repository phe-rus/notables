import { strToU8, zipSync } from "fflate";
import type { BookMaterial } from "../book-material";
import type { Block, Inline } from "../document-blocks";
import { inkToPng } from "../ink-image";
import { MediaFiles, toPng } from "../media-files";
import { escapeXml } from "../xml";

/** English Metric Units per pixel at 96 dpi. */
const EMU_PER_PX = 9525;
/** The text column: 6 inches at 96 dpi. */
const COLUMN_PX = 576;

interface Picture {
  rid: string;
  path: string;
  bytes: Uint8Array;
  width: number;
  height: number;
}

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
const R = 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';

function run(inline: Inline): string {
  const props = [
    inline.bold ? "<w:b/>" : "",
    inline.italic ? "<w:i/>" : "",
    inline.underline || inline.href ? '<w:u w:val="single"/>' : "",
    inline.strike ? "<w:strike/>" : "",
    inline.code ? '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/>' : "",
    inline.href ? '<w:color w:val="2A6FD6"/>' : "",
  ].join("");
  return inline.text
    .split("\n")
    .map(
      (part, index) =>
        `${index > 0 ? "<w:r><w:br/></w:r>" : ""}<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ""}<w:t xml:space="preserve">${escapeXml(part)}</w:t></w:r>`,
    )
    .join("");
}

function paragraph(inlines: Inline[], style?: string, extra = ""): string {
  const props =
    style || extra ? `<w:pPr>${style ? `<w:pStyle w:val="${style}"/>` : ""}${extra}</w:pPr>` : "";
  return `<w:p>${props}${inlines.map(run).join("")}</w:p>`;
}

function pictureXml(picture: Picture, id: number, caption: string): string {
  const scale = Math.min(1, COLUMN_PX / picture.width);
  const cx = Math.round(picture.width * scale * EMU_PER_PX);
  const cy = Math.round(picture.height * scale * EMU_PER_PX);
  const drawing = `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:drawing><wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${id}" name="Picture ${id}"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${id}" name="${picture.path}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${picture.rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
  return caption ? `${drawing}${paragraph([{ text: caption }], "Caption")}` : drawing;
}

/**
 * A Word document of the book, with real headings (so Word builds the
 * navigation pane), lists, quotes and pictures.
 */
export async function buildDocx(material: BookMaterial): Promise<Uint8Array> {
  const media = new MediaFiles();
  const pictures: Picture[] = [];
  const addPicture = async (png: { bytes: Uint8Array; width: number; height: number } | null) => {
    if (!png) return null;
    const picture: Picture = {
      rid: `rIdImg${pictures.length + 1}`,
      path: `media/image${pictures.length + 1}.png`,
      ...png,
    };
    pictures.push(picture);
    return picture;
  };

  const body: string[] = [];
  body.push(paragraph([{ text: material.title }], "Title"));
  if (material.book.subtitle) body.push(paragraph([{ text: material.book.subtitle }], "Subtitle"));
  if (material.author) body.push(paragraph([{ text: material.author }], "Author"));

  for (const chapter of material.chapters) {
    // A part opens on a page of its own, like a printed book.
    if (chapter.part) {
      body.push(paragraph([{ text: chapter.part.title }], "Title", "<w:pageBreakBefore/>"));
    }
    body.push(paragraph([{ text: chapter.title }], "Heading1", "<w:pageBreakBefore/>"));
    for (const block of chapter.blocks) body.push(await blockXml(block));
  }

  async function blockXml(block: Block): Promise<string> {
    switch (block.type) {
      case "heading":
        return paragraph(block.inlines, `Heading${block.level + 1}`);
      case "paragraph":
        return paragraph(block.inlines);
      case "quote":
        return paragraph(block.inlines, "Quote");
      case "list":
        return block.items
          .map((item) => {
            if (block.style === "check") {
              return paragraph(
                [{ text: item.checked ? "☑ " : "☐ " }, ...item.inlines],
                "ListParagraph",
              );
            }
            return paragraph(
              item.inlines,
              "ListParagraph",
              `<w:numPr><w:ilvl w:val="${Math.min(item.depth, 8)}"/><w:numId w:val="${block.style === "number" ? 2 : 1}"/></w:numPr>`,
            );
          })
          .join("");
      case "code":
        return block.text
          .split("\n")
          .map((line) => paragraph([{ text: line, code: true }], "Code"))
          .join("");
      case "rule":
        return paragraph([{ text: "*   *   *" }], undefined, '<w:jc w:val="center"/>');
      case "image": {
        const file = await media.add(block.src);
        const picture = file?.type.startsWith("image/")
          ? await addPicture(await toPng(file))
          : null;
        return picture ? pictureXml(picture, pictures.length, block.caption) : "";
      }
      case "ink": {
        const picture = await addPicture(await inkToPng(block.strokes, block.height));
        return picture ? pictureXml(picture, pictures.length, "") : "";
      }
      case "audio":
        return block.transcript ? paragraph([{ text: block.transcript, italic: true }]) : "";
    }
  }

  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document ${W} ${R}><w:body>${body.join("")}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`;

  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles ${W}>
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Georgia" w:hAnsi="Georgia" w:cs="Georgia"/><w:sz w:val="23"/><w:lang w:val="en"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="140" w:line="320" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:pPr><w:jc w:val="center"/><w:spacing w:before="2400" w:after="240"/></w:pPr><w:rPr><w:b/><w:sz w:val="56"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:pPr><w:jc w:val="center"/></w:pPr><w:rPr><w:i/><w:color w:val="666666"/><w:sz w:val="28"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Author"><w:name w:val="Author"/><w:basedOn w:val="Normal"/><w:pPr><w:jc w:val="center"/><w:spacing w:before="1200"/></w:pPr><w:rPr><w:rFonts w:ascii="Helvetica" w:hAnsi="Helvetica"/><w:caps/><w:spacing w:val="30"/><w:color w:val="666666"/><w:sz w:val="20"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="1200" w:after="480"/><w:jc w:val="center"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:sz w:val="40"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="360" w:after="120"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:sz w:val="30"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="280" w:after="100"/><w:outlineLvl w:val="2"/></w:pPr><w:rPr><w:b/><w:sz w:val="26"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading4"><w:name w:val="heading 4"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:keepNext/><w:outlineLvl w:val="3"/></w:pPr><w:rPr><w:b/><w:i/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/><w:pPr><w:ind w:left="567"/><w:pBdr><w:left w:val="single" w:sz="12" w:space="12" w:color="E8A200"/></w:pBdr></w:pPr><w:rPr><w:i/><w:color w:val="444444"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="60"/><w:ind w:left="720"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="Code"><w:name w:val="Code"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="0" w:line="260" w:lineRule="auto"/></w:pPr><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="19"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Caption"><w:name w:val="caption"/><w:basedOn w:val="Normal"/><w:pPr><w:jc w:val="center"/></w:pPr><w:rPr><w:i/><w:color w:val="666666"/><w:sz w:val="19"/></w:rPr></w:style>
</w:styles>`;

  const level = (index: number, format: "bullet" | "decimal") =>
    `<w:lvl w:ilvl="${index}"><w:start w:val="1"/><w:numFmt w:val="${format}"/><w:lvlText w:val="${format === "bullet" ? (index % 2 ? "◦" : "•") : `%${index + 1}.`}"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="${720 + index * 360}" w:hanging="360"/></w:pPr></w:lvl>`;
  const numbering = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering ${W}>
<w:abstractNum w:abstractNumId="0">${Array.from({ length: 9 }, (_, i) => level(i, "bullet")).join("")}</w:abstractNum>
<w:abstractNum w:abstractNumId="1">${Array.from({ length: 9 }, (_, i) => level(i, "decimal")).join("")}</w:abstractNum>
<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
<w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>
</w:numbering>`;

  const relationships = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
<Relationship Id="rIdNumbering" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
${pictures.map((p) => `<Relationship Id="${p.rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${p.path}"/>`).join("\n")}
</Relationships>`;

  const now = new Date().toISOString().slice(0, 19);
  const files: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Default Extension="png" ContentType="image/png"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>`),
    "_rels/.rels": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
</Relationships>`),
    "docProps/core.xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${escapeXml(material.title)}</dc:title><dc:creator>${escapeXml(material.author || "Notables")}</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${now}Z</dcterms:created></cp:coreProperties>`),
    "word/document.xml": strToU8(document),
    "word/styles.xml": strToU8(styles),
    "word/numbering.xml": strToU8(numbering),
    "word/_rels/document.xml.rels": strToU8(relationships),
  };
  for (const picture of pictures) files[`word/${picture.path}`] = picture.bytes;
  return zipSync(files, { level: 6 });
}
