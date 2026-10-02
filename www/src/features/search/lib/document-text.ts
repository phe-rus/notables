/**
 * The readable text of a serialized note: paragraphs, headings, list items,
 * photo captions and recording transcripts, one block or item per line.
 */
export function documentText(document: unknown): string {
  const root = (document as { root?: unknown } | null)?.root;
  const blocks: string[] = [];
  const visit = (node: unknown, into: string[]) => {
    if (!node || typeof node !== "object") return;
    const record = node as Record<string, unknown>;
    if (typeof record.text === "string") into.push(record.text);
    if (typeof record.caption === "string" && record.caption) into.push(` ${record.caption}`);
    if (typeof record.transcript === "string" && record.transcript) {
      into.push(` ${record.transcript}`);
    }
    if (Array.isArray(record.children)) for (const child of record.children) visit(child, into);
  };
  const collect = (node: unknown) => {
    const record = node as { type?: unknown; children?: unknown[] };
    // Each list item is its own line, so items never run together.
    if (record?.type === "list" && Array.isArray(record.children)) {
      for (const item of record.children) collect(item);
      return;
    }
    const parts: string[] = [];
    visit(node, parts);
    const line = parts.join("").trim();
    if (line) blocks.push(line);
  };
  for (const block of (root as { children?: unknown[] } | undefined)?.children ?? []) {
    collect(block);
  }
  return blocks.join("\n");
}
