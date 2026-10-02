/** What an imported file is, judged by its name and type. */
export type SourceKind = "epub" | "pdf" | "archive" | "image" | "audio" | "unsupported";

const extension = (name: string) => name.toLowerCase().split(".").pop() ?? "";

export function sourceKind(name: string, type = ""): SourceKind {
  const ext = extension(name);
  if (ext === "epub" || type === "application/epub+zip") return "epub";
  if (ext === "pdf" || type === "application/pdf") return "pdf";
  // Comic archives are zips of page images.
  if (["cbz", "zip"].includes(ext)) return "archive";
  if (["jpg", "jpeg", "png", "webp", "gif", "avif"].includes(ext) || type.startsWith("image/")) {
    return "image";
  }
  if (
    ["mp3", "m4a", "m4b", "aac", "ogg", "oga", "opus", "wav", "flac"].includes(ext) ||
    type.startsWith("audio/")
  ) {
    return "audio";
  }
  return "unsupported";
}

/** Files people pick alongside books that aren't worth reporting. */
export function isNoise(name: string): boolean {
  const base = name.split("/").pop() ?? name;
  return base.startsWith(".") || /^(thumbs\.db|desktop\.ini|__macosx)$/i.test(base);
}
