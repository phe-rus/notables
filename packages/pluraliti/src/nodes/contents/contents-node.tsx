import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $isHeadingNode } from "@lexical/rich-text";
import {
  $applyNodeReplacement,
  $getRoot,
  DecoratorNode,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
} from "lexical";
import { type JSX, useEffect, useState } from "react";
import { useEditorTools } from "../../media/editor-tools";

interface Heading {
  key: string;
  title: string;
  level: string;
}
function Contents() {
  const [editor] = useLexicalComposerContext();
  const { labels } = useEditorTools();
  const [headings, setHeadings] = useState<Heading[]>([]);
  useEffect(() => {
    const refresh = () =>
      editor.getEditorState().read(() => {
        const next: Heading[] = [];
        const walk = (node: LexicalNode) => {
          if ($isHeadingNode(node) && node.getTextContent().trim())
            next.push({ key: node.getKey(), title: node.getTextContent(), level: node.getTag() });
          if ("getChildren" in node && typeof node.getChildren === "function")
            for (const child of node.getChildren()) walk(child);
        };
        walk($getRoot());
        setHeadings((previous) =>
          JSON.stringify(previous) === JSON.stringify(next) ? previous : next,
        );
      });
    refresh();
    return editor.registerUpdateListener(refresh);
  }, [editor]);
  return (
    <nav aria-label={labels.contents} className="my-4 rounded-2xl border border-separator p-4">
      <p className="mb-2 text-callout font-semibold">{labels.contents}</p>
      {headings.map((heading) => (
        <button
          key={heading.key}
          type="button"
          className="block w-full truncate py-1 text-start text-callout text-accent-text"
          style={{
            paddingInlineStart: heading.level === "h3" ? 24 : heading.level === "h2" ? 12 : 0,
          }}
          onClick={() =>
            editor
              .getElementByKey(heading.key)
              ?.scrollIntoView({ block: "start", behavior: "smooth" })
          }
        >
          {heading.title}
        </button>
      ))}
    </nav>
  );
}
export class ContentsNode extends DecoratorNode<JSX.Element> {
  static override getType() {
    return "contents";
  }
  static override clone(node: ContentsNode) {
    return new ContentsNode(node.__key);
  }
  static override importJSON() {
    return $createContentsNode();
  }
  constructor(key?: NodeKey) {
    super(key);
  }
  override exportJSON(): SerializedLexicalNode {
    return { ...super.exportJSON(), type: "contents", version: 1 };
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
    return <Contents />;
  }
}
export const $createContentsNode = () => $applyNodeReplacement(new ContentsNode());
