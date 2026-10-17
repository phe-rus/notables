import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { IconButton, MoreIcon, openMenu } from "@phe-rus/hino";
import {
  $applyNodeReplacement,
  $getNodeByKey,
  DecoratorNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
} from "lexical";
import type { JSX } from "react";
import { useEditorTools } from "../../media/editor-tools";
import { useMediaSource } from "../../media/media-source";
export interface AttachmentInput {
  src: string;
  name: string;
  mime: string;
  size: number;
}
type SerializedAttachment = Spread<AttachmentInput, SerializedLexicalNode>;
function Attachment({ input, nodeKey }: { input: AttachmentInput; nodeKey: NodeKey }) {
  const [editor] = useLexicalComposerContext();
  const source = useMediaSource(
    /^(media:[\w-]{1,64}$|https?:\/\/)/i.test(input.src) ? input.src : "",
  );
  const { labels, onAttachment, onEdit } = useEditorTools();
  return (
    <div className="my-3 flex items-center gap-2 rounded-2xl border border-separator p-3">
      <a
        className="min-w-0 flex-1 truncate text-callout text-accent-text"
        href={source ?? undefined}
        download={input.name}
        onClick={
          onAttachment
            ? (event) => {
                event.preventDefault();
                void onAttachment(input);
              }
            : undefined
        }
      >
        {input.name}
      </a>
      <span className="text-caption text-label-secondary">{Math.ceil(input.size / 1024)} KB</span>
      <IconButton
        label={labels.attachment}
        size="icon-sm"
        variant="ghost"
        onClick={(event) =>
          openMenu(event.currentTarget, [
            {
              label: labels.removeAttachment,
              destructive: true,
              onSelect: () => {
                onEdit?.();
                editor.update(() => $getNodeByKey(nodeKey)?.remove());
              },
            },
          ])
        }
      >
        <MoreIcon size={18} />
      </IconButton>
    </div>
  );
}
export class AttachmentNode extends DecoratorNode<JSX.Element> {
  __input: AttachmentInput;
  static override getType() {
    return "attachment";
  }
  static override clone(node: AttachmentNode) {
    return new AttachmentNode(node.__input, node.__key);
  }
  static override importJSON(json: unknown) {
    const value = json && typeof json === "object" ? (json as Record<string, unknown>) : {};
    return $createAttachmentNode({
      src: typeof value.src === "string" ? value.src : "",
      name: typeof value.name === "string" ? value.name : "",
      mime: typeof value.mime === "string" ? value.mime : "",
      size:
        typeof value.size === "number" && Number.isFinite(value.size) ? Math.max(0, value.size) : 0,
    });
  }
  constructor(input: AttachmentInput = { src: "", name: "", mime: "", size: 0 }, key?: NodeKey) {
    super(key);
    this.__input = { src: input.src, name: input.name, mime: input.mime, size: input.size };
  }
  override exportJSON(): SerializedAttachment {
    return { ...super.exportJSON(), ...this.__input, type: "attachment", version: 1 };
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
  override decorate() {
    return <Attachment input={this.__input} nodeKey={this.__key} />;
  }
}
export const $createAttachmentNode = (input: AttachmentInput) =>
  $applyNodeReplacement(new AttachmentNode(input));
