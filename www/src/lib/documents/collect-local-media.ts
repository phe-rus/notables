import { localMediaId } from "@notables/core";

/**
 * Ids of every on-device media file (`media:<id>`) a serialized document
 * uses, in any field: a photo's `src`, a drawing's `src` and its editable
 * `scene`, a recording's `src`.
 */
export function collectLocalMedia(document: unknown): string[] {
  const ids = new Set<string>();
  const visit = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    for (const [key, value] of Object.entries(node)) {
      if (typeof value === "string") {
        const id = localMediaId(value);
        if (id) ids.add(id);
      } else if (key === "children" && Array.isArray(value)) {
        value.forEach(visit);
      } else if (key === "root") {
        visit(value);
      }
    }
  };
  visit(document);
  return [...ids];
}
