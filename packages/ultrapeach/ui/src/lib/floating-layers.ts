export const FLOATING_LAYER = "data-floating-layer";

const anchors = new WeakMap<Element, Element>();

/** Portals retain the ownership of the control that opened them. */
export function registerFloatingLayer(layer: Element, anchor: Element): () => void {
  anchors.set(layer, anchor);
  return () => anchors.delete(layer);
}

export function ownsFloatingLayer(container: Element, target: Element | null): boolean {
  let layer = target?.closest(`[${FLOATING_LAYER}]`);
  const visited = new Set<Element>();
  while (layer && !visited.has(layer)) {
    visited.add(layer);
    const anchor = anchors.get(layer);
    if (!anchor) return false;
    if (container.contains(anchor)) return true;
    layer = anchor.closest(`[${FLOATING_LAYER}]`);
  }
  return false;
}
