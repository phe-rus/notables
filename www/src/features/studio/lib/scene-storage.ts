import type { Drawing } from "@notables/editor";
import { loadMedia, saveMedia } from "../../../platform/storage/media-store";
import { isPageScene, type PageScene } from "../model/page-scene";
import { renderScene } from "./render-scene";

/** Reads a page's scene from device media; null if missing or unreadable. */
export async function loadScene(ref: string): Promise<PageScene | null> {
  if (!ref.startsWith("media:")) return null;
  try {
    const blob = await loadMedia(ref.slice(6));
    const value: unknown = blob ? JSON.parse(await blob.text()) : null;
    return isPageScene(value) ? value : null;
  } catch {
    return null;
  }
}

/** Saves the scene and its rendered page, returning both as media references. */
export async function saveDrawing(scene: PageScene): Promise<Drawing> {
  const canvas = await renderScene(scene);
  const image = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Couldn’t render the page."))),
      "image/png",
    ),
  );
  const [src, sceneId] = await Promise.all([
    saveMedia(image),
    saveMedia(new Blob([JSON.stringify(scene)], { type: "application/json" })),
  ]);
  return { src: `media:${src}`, scene: `media:${sceneId}` };
}
