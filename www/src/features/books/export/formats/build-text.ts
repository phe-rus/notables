import { strToU8, zipSync } from "fflate";
import type { BookMaterial } from "../book-material";
import { MediaFiles } from "../media-files";
import { blocksToMarkdown, blocksToText } from "./to-markdown";

function frontMatter(material: BookMaterial): string {
  return [
    `# ${material.title}`,
    material.book.subtitle && `*${material.book.subtitle}*`,
    material.author && `By ${material.author}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

/**
 * Markdown: a single .md file, or a .zip with a media folder when the
 * book has pictures or recordings.
 */
export async function buildMarkdown(
  material: BookMaterial,
): Promise<{ bytes: Uint8Array; zipped: boolean }> {
  const media = new MediaFiles();
  for (const chapter of material.chapters) {
    for (const block of chapter.blocks) {
      if (block.type === "image" || block.type === "audio") await media.add(block.src);
    }
  }
  const text = [
    frontMatter(material),
    ...material.chapters.map(
      (chapter) =>
        `${chapter.part ? `# ${chapter.part.title}\n\n` : ""}## ${chapter.title}\n\n${blocksToMarkdown(chapter.blocks, (src) => media.get(src)?.path ?? null)}`,
    ),
  ].join("\n\n");
  if (media.files.length === 0) return { bytes: strToU8(`${text}\n`), zipped: false };
  const files: Record<string, Uint8Array> = { "book.md": strToU8(`${text}\n`) };
  for (const file of media.files) files[file.path] = file.bytes;
  return { bytes: zipSync(files, { level: 6 }), zipped: true };
}

export function buildText(material: BookMaterial): Uint8Array {
  const parts = [
    material.title.toUpperCase(),
    material.book.subtitle,
    material.author && `by ${material.author}`,
    ...material.chapters.map(
      (chapter, index) =>
        `${chapter.part ? `\n\n\n${chapter.part.title.toUpperCase()}` : ""}\n\nCHAPTER ${index + 1}\n${chapter.title}\n\n${blocksToText(chapter.blocks)}`,
    ),
  ].filter(Boolean);
  return strToU8(`${parts.join("\n")}\n`);
}
