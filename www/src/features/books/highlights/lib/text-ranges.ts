/**
 * Converting between DOM ranges and character offsets within an element's
 * text, so quotes can be made from a selection and drawn back as ranges.
 */

function textNodes(root: Node): Text[] {
  const walker = root.ownerDocument?.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  if (!walker) return nodes;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) nodes.push(node as Text);
  return nodes;
}

export function textOf(root: Node): string {
  return textNodes(root)
    .map((node) => node.data)
    .join("");
}

/** Character offset of a boundary point (node, offset) within `root`. */
function offsetOf(root: Node, container: Node, offset: number): number | null {
  if (!root.contains(container)) return null;
  const probe = root.ownerDocument?.createRange();
  if (!probe) return null;
  probe.selectNodeContents(root);
  probe.setEnd(container, offset);
  // The text before the boundary, counted the same way as textOf.
  const fragment = probe.cloneContents();
  return textOf(fragment).length;
}

export function offsetsFromRange(root: Node, range: Range): { start: number; end: number } | null {
  const start = offsetOf(root, range.startContainer, range.startOffset);
  const end = offsetOf(root, range.endContainer, range.endOffset);
  return start === null || end === null || end <= start ? null : { start, end };
}

export function rangeFromOffsets(root: Node, start: number, end: number): Range | null {
  const range = root.ownerDocument?.createRange();
  if (!range) return null;
  let seen = 0;
  let started = false;
  for (const node of textNodes(root)) {
    const length = node.data.length;
    if (!started && start <= seen + length) {
      range.setStart(node, start - seen);
      started = true;
    }
    if (started && end <= seen + length) {
      range.setEnd(node, end - seen);
      return range;
    }
    seen += length;
  }
  return null;
}
