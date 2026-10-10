import { FLOATING_LAYER, ownsFloatingLayer } from "../../lib/floating-layers";

const surfaces: HTMLElement[] = [];
const isolated = new Map<HTMLElement, boolean>();
let overflow = "";
let overflowPriority = "";

function restoreBackground() {
  for (const [element, inert] of isolated) element.inert = inert;
  isolated.clear();
}

function isolateBackground() {
  restoreBackground();
  const surface = surfaces.at(-1);
  if (!surface) return;
  const roots = [surface.parentElement ?? surface];
  for (const layer of document.querySelectorAll<HTMLElement>(`[${FLOATING_LAYER}]`)) {
    if (ownsFloatingLayer(surface, layer)) roots.push(layer);
  }
  const visit = (parent: HTMLElement) => {
    for (const child of parent.children) {
      if (!(child instanceof HTMLElement)) continue;
      if (roots.includes(child)) continue;
      if (roots.some((root) => child.contains(root))) {
        visit(child);
      } else if (!child.matches("script, style, link")) {
        isolated.set(child, child.inert);
        child.inert = true;
      }
    }
  };
  visit(document.body);
}

/** Keeps nested sheets and their portaled controls above an inactive background. */
export function enterModalEnvironment(surface: HTMLElement): () => void {
  if (!surfaces.length) {
    overflow = document.body.style.getPropertyValue("overflow");
    overflowPriority = document.body.style.getPropertyPriority("overflow");
    document.body.style.setProperty("overflow", "hidden");
  }
  surfaces.push(surface);
  isolateBackground();
  const preventBackgroundScroll = (event: WheelEvent | TouchEvent) => {
    if (surfaces.at(-1) !== surface) return;
    const target = event.target;
    if (
      target instanceof Element &&
      (surface.contains(target) || ownsFloatingLayer(surface, target))
    )
      return;
    event.preventDefault();
  };
  document.addEventListener("wheel", preventBackgroundScroll, { passive: false });
  document.addEventListener("touchmove", preventBackgroundScroll, { passive: false });
  const observer = new MutationObserver(() => {
    if (surfaces.at(-1) === surface) isolateBackground();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  return () => {
    observer.disconnect();
    document.removeEventListener("wheel", preventBackgroundScroll);
    document.removeEventListener("touchmove", preventBackgroundScroll);
    surfaces.splice(surfaces.indexOf(surface), 1);
    isolateBackground();
    if (!surfaces.length) {
      if (overflow) document.body.style.setProperty("overflow", overflow, overflowPriority);
      else document.body.style.removeProperty("overflow");
    }
  };
}
