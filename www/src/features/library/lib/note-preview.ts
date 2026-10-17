import type { NotePreviewBlock } from "../model/note-preview";

/** A bounded opening excerpt for gallery pages, never the whole editor document. */
export function previewContent(document: unknown): NotePreviewBlock[] {
  const blocks: NotePreviewBlock[] = [];
  let images = 0;
  let visited = 0;
  const record = (value: unknown): Record<string, unknown> =>
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const children = (node: Record<string, unknown>) =>
    Array.isArray(node.children) ? node.children : [];
  const textOf = (value: unknown, depth = 0): string => {
    if (depth > 12) return "";
    const node = record(value);
    if (typeof node.text === "string") return node.text.slice(0, 160);
    let text = "";
    for (const child of children(node).slice(0, 40)) {
      text += textOf(child, depth + 1);
      if (text.length >= 160) break;
    }
    return text.slice(0, 160);
  };
  const visit = (value: unknown, inCheckList = false) => {
    if (blocks.length >= 8 || ++visited > 80) return;
    const node = record(value);
    const text = textOf(node).trim();
    switch (node.type) {
      case "heading":
        if (text)
          blocks.push({
            kind: "heading",
            text,
            level: node.tag === "h1" ? 1 : node.tag === "h2" ? 2 : 3,
          });
        break;
      case "paragraph":
      case "quote":
      case "code":
        if (text) blocks.push({ kind: "paragraph", text });
        break;
      case "list":
        for (const child of children(node).slice(0, 80)) visit(child, node.listType === "check");
        break;
      case "listitem":
        if (text)
          blocks.push(
            inCheckList
              ? { kind: "check", text, checked: node.checked === true }
              : { kind: "bullet", text },
          );
        break;
      case "image":
        if (typeof node.src === "string" && images++ < 2) {
          const width = record(node.layout).width;
          blocks.push({
            kind: "image",
            src: node.src,
            width: typeof width === "number" ? Math.max(25, Math.min(100, width)) : 100,
          });
        }
        break;
      case "table":
        blocks.push({
          kind: "table",
          rows: children(node)
            .slice(0, 4)
            .map((row) =>
              children(record(row))
                .slice(0, 4)
                .map((cell) => textOf(cell).slice(0, 30)),
            ),
        });
        break;
      case "attachment":
        if (typeof node.name === "string")
          blocks.push({ kind: "file", text: node.name.slice(0, 160) });
        break;
      case "link-card":
        if (typeof node.title === "string" && node.title)
          blocks.push({ kind: "heading", text: node.title.slice(0, 160), level: 3 });
        if (blocks.length < 8 && typeof node.description === "string" && node.description)
          blocks.push({ kind: "paragraph", text: node.description.slice(0, 160) });
        if (blocks.length < 8 && images++ < 2 && typeof node.image === "string" && node.image)
          blocks.push({ kind: "image", src: node.image, width: 100 });
        break;
    }
  };
  for (const node of children(record(record(document).root)).slice(0, 80)) visit(node);
  return blocks;
}

/** Small index metadata, never file bytes or a duplicate note body. */
export function notePreview(document: unknown, text = "") {
  let previewImage: string | null = null;
  let attachmentCount = 0;
  const visit = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    const node = value as Record<string, unknown>;
    if (node.type === "image") {
      attachmentCount++;
      if (!previewImage && typeof node.src === "string") previewImage = node.src;
    } else if (node.type === "audio-clip" || node.type === "attachment" || node.type === "ink")
      attachmentCount++;
    if (
      node.type === "link-card" &&
      !previewImage &&
      typeof node.image === "string" &&
      node.image.startsWith("https://")
    )
      previewImage = node.image;
    if (Array.isArray(node.children)) for (const child of node.children) visit(child);
    if (node.root) visit(node.root);
  };
  visit(document);
  const tags = [
    ...new Set(
      [...text.matchAll(/(?:^|\s)#([\p{L}\p{M}\p{N}_-]+)/gu)].map((match) => match[1] as string),
    ),
  ].slice(0, 30);
  return { previewImage, previewContent: previewContent(document), attachmentCount, tags };
}
