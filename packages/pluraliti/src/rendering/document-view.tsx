import { type CSSProperties, Fragment, type ReactNode } from "react";
import { editorTheme } from "../editor/editor-theme";
import { sanitizeUrl } from "../lib/sanitize-url";
import { MediaImage } from "../media/media-image";
import { useMediaSource } from "../media/media-source";
import { AudioClip } from "../nodes/audio-clip/audio-clip-player";
import { INK_DEFAULT_HEIGHT, type InkStroke, inkBottom } from "../nodes/ink/ink-model";
import { InkView } from "../nodes/ink/ink-view";
import { LinkCard } from "../nodes/link-card/link-card-node";

/**
 * Renders a serialized Notables document as plain React elements, no
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
  subscript: 1 << 5,
  superscript: 1 << 6,
} as const;

/**
 * https, same-origin absolute or relative paths (published media, packaged
 * e-book files), device media (`media:<id>`, resolved by the app) and
 * image/audio data URLs.
 */
const SAFE_MEDIA =
  /^(https?:|\/(?!\/)|[\w-]+(\/[\w.-]+)*\.\w+$|media:|data:(image\/(png|jpe?g|gif|webp|avif)|audio\/[\w.+-]+);base64,)/i;

export interface ImageRenderProps {
  src: string;
  alt: string;
  caption: string;
  style?: CSSProperties;
  width?: number;
}

export interface AudioClipRenderProps {
  src: string;
  durationMs: number;
  transcript: string;
}

/**
 * Override how media renders, e.g. plain elements for EPUB export. Sources
 * are already checked; an empty `src` means the file isn't available, and
 * the default renderers skip such nodes.
 */
export interface MediaRenderers {
  image?: (props: ImageRenderProps) => ReactNode;
  audioClip?: (props: AudioClipRenderProps) => ReactNode;
  attachment?: (props: { src: string; name: string; mime: string }) => ReactNode;
}

const defaultRenderers: Required<MediaRenderers> = {
  image: ({ src, alt, caption, style, width }) =>
    src ? (
      <figure className="nt-figure" style={{ width: `${width ?? 100}%` }}>
        <MediaImage src={src} alt={alt} style={style} />
        {caption && <figcaption className="nt-caption">{caption}</figcaption>}
      </figure>
    ) : null,
  attachment: (props) => <AttachmentLink {...props} />,
  audioClip: (props) =>
    props.src ? (
      <div className="nt-audio-block">
        <AudioClip {...props} />
      </div>
    ) : null,
};

function AttachmentLink({ src, name }: { src: string; name: string }) {
  const resolved = useMediaSource(src);
  return (
    <a className="nt-link" href={resolved ?? undefined} download={name}>
      {name}
    </a>
  );
}
const text = editorTheme.text ?? {};
function alignment(value: unknown): CSSProperties | undefined {
  return value === "left" || value === "right" || value === "center" || value === "justify"
    ? { textAlign: value }
    : undefined;
}

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
  if (format & FORMAT.subscript) out = <sub>{out}</sub>;
  if (format & FORMAT.superscript) out = <sup>{out}</sup>;
  if (format & FORMAT.code) out = <code className={text.code}>{out}</code>;
  if (format & FORMAT.highlight) out = <mark className={text.highlight}>{out}</mark>;
  if (format & FORMAT.strikethrough) out = <s className={text.strikethrough}>{out}</s>;
  if (format & FORMAT.underline) out = <u className={text.underline}>{out}</u>;
  if (format & FORMAT.italic) out = <em className={text.italic}>{out}</em>;
  if (format & FORMAT.bold) out = <strong className={text.bold}>{out}</strong>;
  return <span key={key}>{out}</span>;
}

function createRenderer(media: Required<MediaRenderers>, root?: SerializedNode) {
  let hasContents = false;
  const headings: Array<{ node: SerializedNode; title: string; id: string }> = [];
  const plainText = (node: SerializedNode): string =>
    str(node.text) + children(node).map(plainText).join("");
  const collect = (node: SerializedNode) => {
    if (node.type === "contents") hasContents = true;
    if (node.type === "heading")
      headings.push({ node, title: plainText(node), id: `contents-heading-${headings.length}` });
    for (const child of children(node)) collect(child);
  };
  if (root) collect(root);
  const renderChildren = (node: SerializedNode): ReactNode[] => children(node).map(renderNode);

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
          <p key={key} className={editorTheme.paragraph} style={alignment(node.format)}>
            {renderChildren(node)}
          </p>
        );
      case "heading": {
        const tag = node.tag === "h1" || node.tag === "h2" || node.tag === "h3" ? node.tag : "h2";
        const Tag = tag;
        return (
          <Tag
            key={key}
            id={hasContents ? headings.find((heading) => heading.node === node)?.id : undefined}
            className={editorTheme.heading?.[tag]}
            style={alignment(node.format)}
          >
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
      case "table":
        return (
          <table key={key} className="nt-table">
            <tbody>{renderChildren(node)}</tbody>
          </table>
        );
      case "tablerow":
        return <tr key={key}>{renderChildren(node)}</tr>;
      case "tablecell": {
        const Tag = typeof node.headerState === "number" && node.headerState > 0 ? "th" : "td";
        return (
          <Tag
            key={key}
            className="nt-table-cell"
            colSpan={
              typeof node.colSpan === "number" ? Math.max(1, Math.min(100, node.colSpan)) : 1
            }
            rowSpan={
              typeof node.rowSpan === "number" ? Math.max(1, Math.min(100, node.rowSpan)) : 1
            }
          >
            {renderChildren(node)}
          </Tag>
        );
      }
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
      case "contents":
        return (
          <nav key={key}>
            {headings.map((heading) => (
              <a key={heading.id} className="nt-link block" href={`#${heading.id}`}>
                {heading.title}
              </a>
            ))}
          </nav>
        );
      case "link-card":
        return (
          <LinkCard
            key={key}
            url={str(node.url)}
            title={str(node.title)}
            description={str(node.description)}
            image={str(node.image)}
          />
        );
      case "attachment": {
        const src = str(node.src);
        return SAFE_MEDIA.test(src) ? (
          <Fragment key={key}>
            {media.attachment({ src, name: str(node.name), mime: str(node.mime) })}
          </Fragment>
        ) : null;
      }
      case "image": {
        const src = str(node.src);
        if (src && !SAFE_MEDIA.test(src)) return null;
        return (
          <Fragment key={key}>
            {media.image({
              src,
              alt: str(node.alt),
              caption: str(node.caption),
              width:
                typeof (node.layout as { width?: unknown })?.width === "number"
                  ? Math.max(25, Math.min(100, (node.layout as { width: number }).width))
                  : 100,
              style: imageStyle(node.layout),
            })}
          </Fragment>
        );
      }
      case "audio-clip": {
        const src = str(node.src);
        if (src && !SAFE_MEDIA.test(src)) return null;
        return (
          <Fragment key={key}>
            {media.audioClip({
              src,
              durationMs: typeof node.durationMs === "number" ? node.durationMs : 0,
              transcript: str(node.transcript),
            })}
          </Fragment>
        );
      }
      case "ink": {
        const strokes = Array.isArray(node.strokes) ? (node.strokes as InkStroke[]) : [];
        const height = typeof node.height === "number" ? node.height : INK_DEFAULT_HEIGHT;
        return strokes.length ? (
          <div key={key} className="nt-ink-block">
            <InkView strokes={strokes} height={Math.min(height, inkBottom(strokes) + 24)} />
          </div>
        ) : null;
      }
      default:
        return null;
    }
  }

  return renderChildren;
}

function imageStyle(value: unknown): CSSProperties {
  const layout = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const aspect = ["16 / 9", "4 / 3", "1 / 1", "original"].includes(String(layout.aspect))
    ? String(layout.aspect)
    : "16 / 9";
  return {
    aspectRatio: aspect === "original" ? undefined : aspect,
    objectFit: layout.fit === "contain" ? "contain" : "cover",
    width: "100%",
    objectPosition: `50% ${typeof layout.position === "number" ? Math.max(0, Math.min(100, layout.position)) : 50}%`,
  };
}

export function DocumentView({
  document,
  className,
  media,
}: {
  document: unknown;
  className?: string;
  media?: MediaRenderers;
}) {
  const root = (document as { root?: SerializedNode } | null)?.root;
  const renderChildren = createRenderer({ ...defaultRenderers, ...media }, root);
  return (
    <div className={["nt-content", "nt-readonly", className].filter(Boolean).join(" ")}>
      {root ? renderChildren(root) : null}
    </div>
  );
}
