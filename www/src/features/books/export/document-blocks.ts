/**
 * A chapter's stored document as plain blocks of styled text and media,
 * for the export formats that lay out text themselves (Markdown, plain
 * text, PDF and Word).
 */

export interface Inline {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  code?: boolean;
  href?: string;
}

export interface ListItem {
  inlines: Inline[];
  depth: number;
  /** For checklists. */
  checked?: boolean;
}

export type Block =
  | { type: "heading"; level: 1 | 2 | 3; inlines: Inline[] }
  | { type: "paragraph"; inlines: Inline[] }
  | { type: "quote"; inlines: Inline[] }
  | { type: "list"; style: "bullet" | "number" | "check"; items: ListItem[] }
  | { type: "code"; text: string }
  | { type: "rule" }
  | { type: "image"; src: string; alt: string; caption: string }
  | { type: "audio"; src: string; transcript: string; durationMs: number }
  | { type: "ink"; strokes: unknown[]; height: number };

interface Node {
  type?: string;
  text?: string;
  format?: number;
  tag?: string;
  url?: string;
  listType?: string;
  checked?: boolean;
  children?: Node[];
  src?: string;
  alt?: string;
  caption?: string;
  transcript?: string;
  durationMs?: number;
  strokes?: unknown[];
  height?: number;
}

// Lexical's text format bits.
const BOLD = 1;
const ITALIC = 2;
const STRIKE = 4;
const UNDERLINE = 8;
const CODE = 16;

function inlinesOf(node: Node, href?: string): Inline[] {
  const out: Inline[] = [];
  for (const child of node.children ?? []) {
    if (child.type === "text" || child.type === "code-highlight") {
      const format = child.format ?? 0;
      out.push({
        text: child.text ?? "",
        ...(format & BOLD ? { bold: true } : {}),
        ...(format & ITALIC ? { italic: true } : {}),
        ...(format & STRIKE ? { strike: true } : {}),
        ...(format & UNDERLINE ? { underline: true } : {}),
        ...(format & CODE ? { code: true } : {}),
        ...(href ? { href } : {}),
      });
    } else if (child.type === "linebreak") {
      out.push({ text: "\n" });
    } else if (child.type === "link" || child.type === "autolink") {
      out.push(...inlinesOf(child, child.url));
    } else if (child.type !== "list") {
      out.push(...inlinesOf(child, href));
    }
  }
  return out;
}

function listItems(list: Node, depth: number, style: string): ListItem[] {
  const items: ListItem[] = [];
  for (const item of list.children ?? []) {
    const nested = (item.children ?? []).filter((child) => child.type === "list");
    const inlines = inlinesOf(item);
    if (inlines.some((inline) => inline.text.trim())) {
      items.push({
        inlines,
        depth,
        ...(style === "check" ? { checked: Boolean(item.checked) } : {}),
      });
    }
    for (const child of nested) items.push(...listItems(child, depth + 1, style));
  }
  return items;
}

export function documentBlocks(document: unknown): Block[] {
  const root = (document as { root?: Node } | null)?.root;
  const blocks: Block[] = [];
  for (const node of root?.children ?? []) {
    switch (node.type) {
      case "heading": {
        const level = Math.min(3, Number(node.tag?.slice(1)) || 1) as 1 | 2 | 3;
        blocks.push({ type: "heading", level, inlines: inlinesOf(node) });
        break;
      }
      case "quote":
        blocks.push({ type: "quote", inlines: inlinesOf(node) });
        break;
      case "list": {
        const style =
          node.listType === "number" ? "number" : node.listType === "check" ? "check" : "bullet";
        blocks.push({ type: "list", style, items: listItems(node, 0, style) });
        break;
      }
      case "code":
        blocks.push({
          type: "code",
          text: inlinesOf(node)
            .map((inline) => inline.text)
            .join(""),
        });
        break;
      case "horizontalrule":
        blocks.push({ type: "rule" });
        break;
      case "image":
        if (node.src) {
          blocks.push({
            type: "image",
            src: node.src,
            alt: node.alt ?? "",
            caption: node.caption ?? "",
          });
        }
        break;
      case "audio-clip":
        if (node.src) {
          blocks.push({
            type: "audio",
            src: node.src,
            transcript: node.transcript ?? "",
            durationMs: node.durationMs ?? 0,
          });
        }
        break;
      case "ink":
        blocks.push({ type: "ink", strokes: node.strokes ?? [], height: node.height ?? 360 });
        break;
      default: {
        const inlines = inlinesOf(node);
        blocks.push({ type: "paragraph", inlines });
      }
    }
  }
  // Drop trailing empty paragraphs.
  while (
    blocks.at(-1)?.type === "paragraph" &&
    !plainText((blocks.at(-1) as { inlines: Inline[] }).inlines).trim()
  ) {
    blocks.pop();
  }
  return blocks;
}

export function plainText(inlines: Inline[]): string {
  return inlines.map((inline) => inline.text).join("");
}
