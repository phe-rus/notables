import {
  $applyNodeReplacement,
  DecoratorNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
} from "lexical";
import type { JSX } from "react";
import { sanitizeUrl } from "../../lib/sanitize-url";
export interface LinkCardInput {
  url: string;
  title: string;
  description: string;
  image: string;
}
type SerializedLinkCard = Spread<LinkCardInput, SerializedLexicalNode>;
export function LinkCard({ url, title, description, image }: LinkCardInput) {
  const href = sanitizeUrl(url);
  if (!href || !href.startsWith("https://")) return null;
  const cover = sanitizeUrl(image);
  const host = new URL(href).hostname;
  const hasTitle = title && title !== host;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="my-3 flex overflow-hidden rounded-2xl border border-separator text-inherit no-underline"
    >
      {cover?.startsWith("https://") && (
        <img
          src={cover}
          alt=""
          referrerPolicy="no-referrer"
          className="aspect-square w-24 shrink-0 object-cover"
          loading="lazy"
        />
      )}
      <span className="flex min-w-0 flex-col gap-1 p-3">
        {hasTitle && <span className="line-clamp-2 text-callout font-semibold">{title}</span>}
        {description && (
          <span className="line-clamp-2 text-caption text-label-secondary">{description}</span>
        )}
        <span className="truncate text-caption text-label-tertiary">{host}</span>
      </span>
    </a>
  );
}
export class LinkCardNode extends DecoratorNode<JSX.Element | null> {
  __preview: LinkCardInput;
  static override getType() {
    return "link-card";
  }
  static override clone(node: LinkCardNode) {
    return new LinkCardNode(node.__preview, node.__key);
  }
  static override importJSON(json: unknown) {
    const value = json && typeof json === "object" ? (json as Record<string, unknown>) : {};
    const text = (key: string, limit: number) =>
      typeof value[key] === "string" ? value[key].slice(0, limit) : "";
    return $createLinkCardNode({
      url: text("url", 2048),
      title: text("title", 300),
      description: text("description", 500),
      image: text("image", 2048),
    });
  }
  constructor(
    preview: LinkCardInput = { url: "", title: "", description: "", image: "" },
    key?: NodeKey,
  ) {
    super(key);
    this.__preview = preview;
  }
  override exportJSON(): SerializedLinkCard {
    return { ...super.exportJSON(), ...this.__preview, type: "link-card", version: 1 };
  }
  override createDOM() {
    return document.createElement("div");
  }
  override updateDOM(): false {
    return false;
  }
  override isInline(): false {
    return false;
  }
  override getTextContent() {
    return this.__preview.title || this.__preview.url;
  }
  override decorate() {
    return <LinkCard {...this.__preview} />;
  }
}
export const $createLinkCardNode = (input: LinkCardInput) =>
  $applyNodeReplacement(new LinkCardNode(input));
