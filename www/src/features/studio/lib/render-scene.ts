import { loadMedia } from "../../../platform/storage/media-store";
import type { PageScene, Panel } from "../model/page-scene";
import { bubbleShape, bubbleText, fontFamilies, fontFor, sceneStrokePath } from "./scene-geometry";

const PANEL_BORDER = 6;

/** Loads through a blob URL, so the canvas stays exportable on every platform. */
async function loadImage(src: string): Promise<HTMLImageElement | null> {
  const blob = src.startsWith("media:")
    ? await loadMedia(src.slice(6))
    : await fetch(src)
        .then((response) => response.blob())
        .catch(() => null);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  }).finally(() => URL.revokeObjectURL(url)) as Promise<HTMLImageElement | null>;
}

function clipTo(ctx: CanvasRenderingContext2D, panel: Panel | undefined) {
  if (!panel) return;
  ctx.beginPath();
  ctx.rect(panel.x, panel.y, panel.w, panel.h);
  ctx.clip();
}

/**
 * Paints a page onto a canvas exactly as the studio shows it, for saving
 * as an image. `scale` turns page units into pixels.
 */
export async function renderScene(scene: PageScene, scale = 1.6): Promise<HTMLCanvasElement> {
  // Bubbles use the app's fonts; make sure they're ready before painting.
  await Promise.all(
    Object.values(fontFamilies).map((family) =>
      document.fonts.load(`32px ${family.split(",")[0]}`).catch(() => []),
    ),
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(scene.width * scale);
  canvas.height = Math.round(scene.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Drawing isn’t available here.");
  ctx.scale(scale, scale);
  ctx.fillStyle = scene.paper;
  ctx.fillRect(0, 0, scene.width, scene.height);

  const panels = new Map(scene.panels.map((panel) => [panel.id, panel]));
  const images = new Map<string, HTMLImageElement | null>();
  for (const item of scene.items) {
    if (item.type === "picture" && !images.has(item.src))
      images.set(item.src, await loadImage(item.src));
  }

  for (const item of scene.items) {
    ctx.save();
    if (item.type === "stroke") {
      clipTo(ctx, item.panel ? panels.get(item.panel) : undefined);
      ctx.globalAlpha = item.tool === "marker" ? 0.45 : 1;
      ctx.fillStyle = item.color;
      ctx.fill(new Path2D(sceneStrokePath(item)));
    } else if (item.type === "picture") {
      clipTo(ctx, item.panel ? panels.get(item.panel) : undefined);
      const image = images.get(item.src);
      if (image) ctx.drawImage(image, item.x, item.y, item.w, item.h);
    } else {
      const shape = bubbleShape(item);
      if (shape) {
        const paths = shape.paths.map((d) => new Path2D(d));
        ctx.strokeStyle = "#141210";
        ctx.lineJoin = "round";
        ctx.lineWidth = shape.outline * 2;
        for (const path of paths) ctx.stroke(path);
        ctx.fillStyle = shape.fill;
        for (const path of paths) ctx.fill(path);
      }
      const text = bubbleText(item);
      ctx.font = fontFor(item);
      ctx.fillStyle = "#141210";
      ctx.textAlign = text.align;
      text.lines.forEach((line, index) => {
        ctx.fillText(line, text.x, text.firstBaseline + index * text.lineHeight);
      });
    }
    ctx.restore();
  }

  // Panel borders sit on top, so drawing never covers them.
  ctx.strokeStyle = "#141210";
  ctx.lineWidth = PANEL_BORDER;
  for (const panel of scene.panels) ctx.strokeRect(panel.x, panel.y, panel.w, panel.h);
  return canvas;
}

export { PANEL_BORDER };
