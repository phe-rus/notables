import { localMediaId } from "@notables/editor";

interface SerializedNode {
  src?: unknown;
  children?: unknown;
  root?: unknown;
}

/** Ids of every on-device media file (`media:<id>`) a serialized document uses. */
export function collectLocalMedia(document: unknown): string[] {
  const ids = new Set<string>();
  const visit = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const { src, children, root } = node as SerializedNode;
    if (typeof src === "string") {
      const id = localMediaId(src);
      if (id) ids.add(id);
    }
    if (Array.isArray(children)) children.forEach(visit);
    if (root) visit(root);
  };
  visit(document);
  return [...ids];
}
