import { INK_WIDTH, type InkStroke, strokePath } from "@notables/pluraliti";

const inkHex: Record<string, string> = {
  ink: "#1c1c1e",
  blue: "#2a6fd6",
  red: "#d0342c",
  green: "#2f8f4e",
  yellow: "#f2c53d",
};

/** Handwriting drawn onto a white PNG, for formats without vector ink. */
export async function inkToPng(
  strokes: unknown[],
  height: number,
): Promise<{ bytes: Uint8Array; width: number; height: number } | null> {
  const scale = 1.2;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(INK_WIDTH * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(scale, scale);
  for (const stroke of strokes as InkStroke[]) {
    ctx.globalAlpha = stroke.tool === "marker" ? 0.4 : 1;
    ctx.fillStyle = inkHex[stroke.color] ?? "#1c1c1e";
    ctx.fill(new Path2D(strokePath(stroke)));
  }
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  return blob
    ? {
        bytes: new Uint8Array(await blob.arrayBuffer()),
        width: canvas.width,
        height: canvas.height,
      }
    : null;
}
