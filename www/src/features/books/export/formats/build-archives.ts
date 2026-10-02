import { strToU8, zipSync } from "fflate";
import { type BookMaterial, materialPages, materialRecordings } from "../book-material";
import { MediaFiles, toPng } from "../media-files";

const READABLE_PAGES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

import { escapeXml } from "../xml";

/** Comic book archive: numbered pages plus ComicInfo.xml for comic readers. */
export async function buildComicArchive(
  material: BookMaterial,
  withInfo: boolean,
): Promise<Uint8Array> {
  const media = new MediaFiles("");
  const pages = materialPages(material);
  for (const [index, src] of pages.entries()) {
    await media.add(src, String(index + 1).padStart(3, "0"));
  }
  const images = media.files.filter((file) => file.type.startsWith("image/"));
  if (images.length === 0) throw new Error("This book has no pages to export yet.");
  const files: Record<string, Uint8Array> = {};
  for (const file of images) {
    // Comic readers open PNG, JPEG, WebP and GIF; anything else becomes PNG.
    if (READABLE_PAGES.has(file.type)) {
      files[file.path] = file.bytes;
    } else {
      const png = await toPng(file);
      if (png) files[file.path.replace(/\.[^.]+$/, ".png")] = png.bytes;
    }
  }
  if (withInfo) {
    const manga = material.kind === "manga";
    files["ComicInfo.xml"] = strToU8(`<?xml version="1.0" encoding="utf-8"?>
<ComicInfo xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <Title>${escapeXml(material.title)}</Title>
  ${material.book.subtitle ? `<Summary>${escapeXml(material.book.subtitle)}</Summary>` : ""}
  ${material.author ? `<Writer>${escapeXml(material.author)}</Writer>` : ""}
  ${material.book.volume ? `<Volume>${material.book.volume}</Volume>` : ""}
  <PageCount>${images.length}</PageCount>
  <Manga>${manga ? "YesAndRightToLeft" : "No"}</Manga>
</ComicInfo>`);
  }
  // Pages are already compressed images; storing them keeps export fast.
  return zipSync(files, { level: 0 });
}

const timestamp = (ms: number) => {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 3600)}:${String(Math.floor((total % 3600) / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

/**
 * Every recording as numbered tracks, with a playlist any player opens
 * and the transcripts beside them.
 */
export async function buildAudiobook(material: BookMaterial): Promise<Uint8Array> {
  const media = new MediaFiles("");
  const recordings = materialRecordings(material);
  const playlist = ["#EXTM3U", `#PLAYLIST:${material.title}`];
  const transcripts: string[] = [];
  let position = 0;
  for (const [index, recording] of recordings.entries()) {
    const name = `${String(index + 1).padStart(2, "0")} ${recording.chapter.replace(/[\\/:*?"<>|]/g, "").slice(0, 60)}`;
    const file = await media.add(recording.src, name);
    if (!file) continue;
    playlist.push(
      `#EXTINF:${Math.round(recording.durationMs / 1000)},${recording.chapter}`,
      file.path,
    );
    if (recording.transcript) {
      transcripts.push(`[${timestamp(position)}] ${recording.chapter}\n\n${recording.transcript}`);
    }
    position += recording.durationMs;
  }
  if (media.files.length === 0) throw new Error("This book has no recordings to export.");
  const files: Record<string, Uint8Array> = {};
  for (const file of media.files) files[file.path] = file.bytes;
  files["playlist.m3u8"] = strToU8(`${playlist.join("\n")}\n`);
  if (transcripts.length > 0) files["transcript.txt"] = strToU8(`${transcripts.join("\n\n\n")}\n`);
  return zipSync(files, { level: 0 });
}
