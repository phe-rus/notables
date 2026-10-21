const places = new Set([
  "/",
  "/wallet",
  "/books",
  "/invoices",
  "/calendar",
  "/connections",
  "/settings",
  "/trash",
]);

/** Root places crossfade; drilling into a place and returning keep their direction. */
export function navigationTransition(from: string, to: string, fromView?: string, toView?: string) {
  if (from === "/" && to === "/") {
    if (fromView === toView) return null;
    if (!fromView || fromView === "workspace")
      return toView?.startsWith("folder:") ? "folder-open" : "page-forward";
    if (!toView || toView === "workspace")
      return fromView.startsWith("folder:") ? "folder-close" : "page-back";
    return "place-change";
  }
  if (from === to) return null;
  if (places.has(to) && from.startsWith(`${to}/`)) return "page-back";
  if (places.has(from) && to.startsWith(`${from}/`)) return "page-forward";
  return "place-change";
}
