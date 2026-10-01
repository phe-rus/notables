import type { ReactNode } from "react";
import { editorTheme } from "../editor/editor-theme";
import { sanitizeUrl } from "../lib/sanitize-url";
import { AudioClip } from "../nodes/audio-clip/audio-clip-player";

/**
 * Renders a serialized Notables document as plain React elements — no
 * Lexical runtime, so it server-renders. Unknown nodes are skipped and every
 * URL is sanitised, so untrusted published content cannot inject markup.
 */

interface SerializedNode {
  type?: unknown;
  children?: unknown;
  [key: string]: unknown;
}

const FORMAT = {
  bold: 1,
  italic: 1 << 1,
  strikethrough: 1 << 2,
  underline: 1 << 3,
  code: 1 << 4,
  highlight: 1 << 7,
} as const;

/** https, same-origin paths (published media) and image/audio data URLs. */
const SAFE_MEDIA =
  /^(https?:|\/(?!\/)|data:(image\/(png|jpe?g|gif|webp|avif)|audio\/[\w.+-]+);base64,)/i;

const text = editorTheme.text ?? {};

function children(node: SerializedNode): SerializedNode[] {
  return Array.isArray(node.children) ? (node.children as SerializedNode[]) : [];
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function renderText(node: SerializedNode, key: number): ReactNode {
  const value = str(node.text);
  const format = typeof node.format === "number" ? node.format : 0;
  let out: ReactNode = value;
  if (format & FORMAT.code) out = <code className={text.code}>{out}</code>;
  if (format & FORMAT.highlight) out = <mark className={text.highlight}>{out}</mark>;
  if (format & FORMAT.strikethrough) out = <s className={text.strikethrough}>{out}</s>;
  if (format & FORMAT.underline) out = <u className={text.underline}>{out}</u>;
  if (format & FORMAT.italic) out = <em className={text.italic}>{out}</em>;
  if (format & FORMAT.bold) out = <strong className={text.bold}>{out}</strong>;
  return <span key={key}>{out}</span>;
}

function renderChildren(node: SerializedNode): ReactNode[] {
  return children(node).map(renderNode);
}

function renderNode(node: SerializedNode, key: number): ReactNode {
  switch (node.type) {
    case "text":
    case "code-highlight":
      return renderText(node, key);
    case "linebreak":
      return <br key={key} />;
    case "tab":
      return <span key={key}>{"\t"}</span>;
    case "paragraph":
      return (
        <p key={key} className={editorTheme.paragraph}>
          {renderChildren(node)}
        </p>
      );
    case "heading": {
      const tag = node.tag === "h1" || node.tag === "h2" || node.tag === "h3" ? node.tag : "h2";
      const Tag = tag;
      return (
        <Tag key={key} className={editorTheme.heading?.[tag]}>
          {renderChildren(node)}
        </Tag>
      );
    }
    case "quote":
      return (
        <blockquote key={key} className={editorTheme.quote}>
          {renderChildren(node)}
        </blockquote>
      );
    case "code":
      return (
        <pre key={key} className={editorTheme.code}>
          <code>{renderChildren(node)}</code>
        </pre>
      );
    case "list": {
      const list = editorTheme.list;
      if (node.listType === "check") {
        return (
          <ul key={key} className={list?.checklist}>
            {renderChildren({
              ...node,
              children: children(node).map((c) => ({ ...c, __check: true })),
            })}
          </ul>
        );
      }
      return node.listType === "number" ? (
        <ol key={key} className={list?.ol}>
          {renderChildren(node)}
        </ol>
      ) : (
        <ul key={key} className={list?.ul}>
          {renderChildren(node)}
        </ul>
      );
    }
    case "listitem": {
      const list = editorTheme.list;
      const nested = children(node).some((c) => c.type === "list");
      const className = node.__check
        ? node.checked
          ? list?.listitemChecked
          : list?.listitemUnchecked
        : nested
          ? list?.nested?.listitem
          : list?.listitem;
      return (
        <li key={key} className={className}>
          {renderChildren(node)}
        </li>
      );
    }
    case "link":
    case "autolink": {
      const href = sanitizeUrl(str(node.url));
      return href ? (
        <a
          key={key}
          className={editorTheme.link}
          href={href}
          rel="noopener noreferrer nofollow"
          target="_blank"
        >
          {renderChildren(node)}
        </a>
      ) : (
        <span key={key}>{renderChildren(node)}</span>
      );
    }
    case "horizontalrule":
      return <hr key={key} className={editorTheme.hr} />;
    case "image": {
      const src = str(node.src);
      if (!SAFE_MEDIA.test(src)) return null;
      return (
        <figure key={key} className="nt-figure">
          <img className="nt-image" src={src} alt={str(node.alt)} loading="lazy" />
          {str(node.caption) && <figcaption className="nt-caption">{str(node.caption)}</figcaption>}
        </figure>
      );
    }
    case "audio-clip": {
      const src = str(node.src);
      if (!SAFE_MEDIA.test(src)) return null;
      return (
        <div key={key} className="nt-audio-block">
          <AudioClip
            src={src}
            durationMs={typeof node.durationMs === "number" ? node.durationMs : 0}
            transcript={str(node.transcript)}
          />
        </div>
      );
    }
    default:
      return null;
  }
}

export function DocumentView({ document, className }: { document: unknown; className?: string }) {
  const root = (document as { root?: SerializedNode } | null)?.root;
  return (
    <div className={["nt-content", "nt-readonly", className].filter(Boolean).join(" ")}>
      {root ? renderChildren(root) : null}
    </div>
  );
}
