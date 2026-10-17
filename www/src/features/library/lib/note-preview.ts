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
  return { previewImage, attachmentCount, tags };
}
