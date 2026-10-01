interface SerializedBlock {
  type?: string;
  text?: string;
  children?: SerializedBlock[];
}

const textOf = (node: SerializedBlock): string =>
  node.text ?? (node.children ?? []).map(textOf).join("");

/**
 * A note's first line is its title, which the reader already shows in the
 * header; drop that leading heading so it isn't repeated.
 */
export function stripLeadingTitle(document: unknown, title: string): unknown {
  const root = (document as { root?: SerializedBlock } | null)?.root;
  const [first, ...rest] = root?.children ?? [];
  if (!root || !first || first.type !== "heading" || textOf(first).trim() !== title.trim()) {
    return document;
  }
  return { ...(document as object), root: { ...root, children: rest } };
}
