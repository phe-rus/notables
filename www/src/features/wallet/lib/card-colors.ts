import { type AccentId, accents } from "@phe-rus/hino/tokens";

/** Ignore white paper, ink and glare; match the colored center to Hino's swatches. */
export function closestCardPalette(pixels: ArrayLike<number>): AccentId | undefined {
  let red = 0;
  let green = 0;
  let blue = 0;
  let weight = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i] ?? 0;
    const g = pixels[i + 1] ?? 0;
    const b = pixels[i + 2] ?? 0;
    const chroma = Math.max(r, g, b) - Math.min(r, g, b);
    if (chroma < 25 || Math.max(r, g, b) < 45 || Math.min(r, g, b) > 230) continue;
    red += r * chroma;
    green += g * chroma;
    blue += b * chroma;
    weight += chroma;
  }
  if (!weight) return undefined;
  const observed = [red / weight, green / weight, blue / weight];
  const normalized = (channels: number[]) => {
    const min = Math.min(...channels);
    const range = Math.max(1, Math.max(...channels) - min);
    return channels.map((channel) => (channel - min) / range);
  };
  const hue = normalized(observed);
  return Object.values(accents)
    .filter((accent) => accent.id !== "graphite")
    .map((accent) => {
      const color = accent.swatch.slice(1);
      const rgb = [0, 2, 4].map((index) => Number.parseInt(color.slice(index, index + 2), 16));
      return {
        id: accent.id,
        distance: normalized(rgb).reduce(
          (sum, channel, index) => sum + (channel - (hue[index] ?? 0)) ** 2,
          0,
        ),
      };
    })
    .sort((a, b) => a.distance - b.distance)[0]?.id;
}

export function readCardPalette(source: HTMLCanvasElement) {
  const sample = document.createElement("canvas");
  sample.width = sample.height = 32;
  const context = sample.getContext("2d", { willReadFrequently: true });
  if (!context) return undefined;
  context.drawImage(
    source,
    source.width * 0.15,
    source.height * 0.15,
    source.width * 0.7,
    source.height * 0.7,
    0,
    0,
    32,
    32,
  );
  const palette = closestCardPalette(context.getImageData(0, 0, 32, 32).data);
  sample.width = sample.height = 0;
  return palette;
}
