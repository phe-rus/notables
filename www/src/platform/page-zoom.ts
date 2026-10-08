/**
 * The app never zooms as a page, the way native apps don't: pinches,
 * double taps and ctrl+wheel (a trackpad pinch) leave the layout alone.
 * Places that are about zooming (the calendar's hours, photos, pages)
 * handle those gestures themselves. Text Size in Settings scales the whole
 * interface instead. Published pages keep the browser's own zoom.
 */
export function preventPageZoom(): () => void {
  const root = document.documentElement;
  const previous = root.style.touchAction;
  // Panning still scrolls; pinching and double-tap zoom do nothing.
  root.style.touchAction = "pan-x pan-y";

  const onWheel = (event: WheelEvent) => {
    if (event.ctrlKey) event.preventDefault();
  };
  // Safari's own pinch events on Mac and iPad.
  const onGesture = (event: Event) => event.preventDefault();

  document.addEventListener("wheel", onWheel, { passive: false });
  document.addEventListener("gesturestart", onGesture);
  document.addEventListener("gesturechange", onGesture);

  // iPhone zooms into a focused field whose text is under 16 px; a maximum
  // scale of 1 stops that without changing how anything is drawn.
  const viewport = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  const content = viewport?.content;
  if (viewport && content && !content.includes("maximum-scale")) {
    viewport.content = `${content}, maximum-scale=1`;
  }

  return () => {
    root.style.touchAction = previous;
    document.removeEventListener("wheel", onWheel);
    document.removeEventListener("gesturestart", onGesture);
    document.removeEventListener("gesturechange", onGesture);
    if (viewport && content !== undefined) viewport.content = content;
  };
}
