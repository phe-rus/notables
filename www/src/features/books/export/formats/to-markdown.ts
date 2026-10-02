import { type Block, type Inline, plainText } from "../document-blocks";

const escapeMarkdown = (text: string) => text.replace(/([\\`*_[\]#<>|])/g, "\\$1");

function inlineMarkdown(inlines: Inline[]): string {
  return inlines
    .map((inline) => {
      if (inline.text === "\n") return "  \n";
      if (!inline.text) return "";
      let text = inline.code ? `\`${inline.text}\`` : escapeMarkdown(inline.text);
      // Keep spaces outside the markers, as Markdown requires.
      const [, lead = "", core = text, trail = ""] = text.match(/^(\s*)(.*?)(\s*)$/s) ?? [];
      text = core;
      if (text && !inline.code) {
        if (inline.bold) text = `**${text}**`;
        if (inline.italic) text = `*${text}*`;
        if (inline.strike) text = `~~${text}~~`;
      }
      if (inline.href) text = `[${text}](${inline.href})`;
      return `${lead}${text}${trail}`;
    })
    .join("");
}

/**
 * A chapter as Markdown. `media` names each picture or recording file,
 * so they can sit beside the text.
 */
export function blocksToMarkdown(blocks: Block[], media: (src: string) => string | null): string {
  const out: string[] = [];
  for (const block of blocks) {
    switch (block.type) {
      case "heading":
        out.push(`${"#".repeat(block.level + 1)} ${inlineMarkdown(block.inlines)}`);
        break;
      case "paragraph": {
        const text = inlineMarkdown(block.inlines);
        if (text.trim()) out.push(text);
        break;
      }
      case "quote":
        out.push(
          inlineMarkdown(block.inlines)
            .split("\n")
            .map((line) => `> ${line}`)
            .join("\n"),
        );
        break;
      case "list":
        out.push(
          block.items
            .map((item, index) => {
              const indent = "  ".repeat(item.depth);
              const marker =
                block.style === "number"
                  ? `${index + 1}.`
                  : block.style === "check"
                    ? `- [${item.checked ? "x" : " "}]`
                    : "-";
              return `${indent}${marker} ${inlineMarkdown(item.inlines)}`;
            })
            .join("\n"),
        );
        break;
      case "code":
        out.push(`\`\`\`\n${block.text}\n\`\`\``);
        break;
      case "rule":
        out.push("---");
        break;
      case "image": {
        const path = media(block.src);
        if (path) out.push(`![${escapeMarkdown(block.alt || block.caption)}](${path})`);
        if (block.caption) out.push(`*${escapeMarkdown(block.caption)}*`);
        break;
      }
      case "audio": {
        const path = media(block.src);
        if (path) out.push(`[Listen](${path})`);
        if (block.transcript) out.push(`> ${escapeMarkdown(block.transcript)}`);
        break;
      }
      case "ink":
        break;
    }
  }
  return out.join("\n\n");
}

export function blocksToText(blocks: Block[]): string {
  const out: string[] = [];
  for (const block of blocks) {
    switch (block.type) {
      case "heading":
        out.push(plainText(block.inlines).toUpperCase());
        break;
      case "paragraph":
      case "quote": {
        const text = plainText(block.inlines);
        if (text.trim()) out.push(block.type === "quote" ? `    ${text}` : text);
        break;
      }
      case "list":
        out.push(
          block.items
            .map(
              (item, index) =>
                `${"  ".repeat(item.depth)}${
                  block.style === "number"
                    ? `${index + 1}.`
                    : block.style === "check"
                      ? item.checked
                        ? "[x]"
                        : "[ ]"
                      : "•"
                } ${plainText(item.inlines)}`,
            )
            .join("\n"),
        );
        break;
      case "code":
        out.push(block.text);
        break;
      case "rule":
        out.push("* * *");
        break;
      case "image":
        if (block.caption) out.push(`[${block.caption}]`);
        break;
      case "audio":
        if (block.transcript) out.push(block.transcript);
        break;
      case "ink":
        break;
    }
  }
  return out.join("\n\n");
}
