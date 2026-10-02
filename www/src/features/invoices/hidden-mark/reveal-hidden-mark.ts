import { HIDDEN_MARK_PREFIX } from "@notables/core";
import jsQR from "jsqr";

/**
 * The ink of the hidden mark: a pale yellow that reads as a faint warm
 * tint on white paper. Yellow barely differs from white to the eye, but
 * strongly in a camera's blue channel, which is what reveals it.
 */
export const HIDDEN_INK = "#fff7d2";

/** How much more yellow than its surroundings a pixel must be to count as ink. */
const MIN_YELLOWNESS = 14;

/**
 * Turns the hidden mark into a black-on-white code a QR reader can see:
 * each pixel's yellowness (red and green above blue) becomes darkness.
 * Plain paper, black text and grey lines all have near-zero yellowness, so
 * they drop out; only the pale yellow remains.
 */
export function revealHiddenInk(image: ImageData): ImageData {
  const { data, width, height } = image;
  const paper = paperBrightness(data);
  const yellowness = new Float32Array(width * height);
  // Pixels too dark to judge, such as text printed over the mark.
  const covered = new Uint8Array(width * height);
  // How yellow the ink is, judged by the bulk of yellowish pixels rather
  // than the single most yellow one, which may be a stray artifact.
  const levels = new Uint32Array(256);
  let yellowish = 0;
  for (let index = 0, pixel = 0; index < data.length; index += 4, pixel++) {
    const r = data[index] ?? 0;
    const g = data[index + 1] ?? 0;
    const b = data[index + 2] ?? 0;
    const light = Math.min(r, g);
    if (light < paper * 0.86) {
      covered[pixel] = 1;
      continue;
    }
    yellowness[pixel] = Math.max(0, light - b);
  }
  // Camera noise speckles single pixels; ink fills whole modules. Averaging
  // over a few pixels keeps the ink and loses the speckle.
  const smooth = smoothed(
    yellowness,
    covered,
    width,
    height,
    Math.max(1, Math.round(Math.min(width, height) / 500)),
  );
  // A warm camera tints the whole page; measure ink against the paper's own tint.
  const baseline = paperTint(smooth, covered);
  for (let pixel = 0; pixel < smooth.length; pixel++) {
    smooth[pixel] = Math.max(0, (smooth[pixel] ?? 0) - baseline);
    const value = Math.min(255, Math.round(smooth[pixel] ?? 0));
    if (value >= MIN_YELLOWNESS) {
      levels[value] = (levels[value] ?? 0) + 1;
      yellowish++;
    }
  }
  let inkLevel = 0;
  for (let level = 0, seen = 0; level < 256; level++) {
    seen += levels[level] ?? 0;
    if (seen >= yellowish * 0.75) {
      inkLevel = level;
      break;
    }
  }
  const threshold = Math.max(MIN_YELLOWNESS, inkLevel * 0.5);
  const ink = new Uint8Array(width * height);
  for (let pixel = 0; pixel < ink.length; pixel++) {
    ink[pixel] = !covered[pixel] && (smooth[pixel] ?? 0) >= threshold ? 1 : 0;
  }

  // Text crossing the mark leaves holes; fill each covered pixel from the
  // pixels around it that could be judged.
  const radius = Math.max(2, Math.round(Math.min(width, height) / 300));
  const inkSum = integral(ink, width, height);
  const seenSum = integral(
    covered.map((value) => 1 - value),
    width,
    height,
  );
  const out = new ImageData(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixel = y * width + x;
      let dark = ink[pixel] === 1;
      if (covered[pixel]) {
        const seen = boxSum(seenSum, width, height, x, y, radius);
        dark = seen > 0 && boxSum(inkSum, width, height, x, y, radius) * 2 > seen;
      }
      const shade = dark ? 0 : 255;
      const index = pixel * 4;
      out.data[index] = shade;
      out.data[index + 1] = shade;
      out.data[index + 2] = shade;
      out.data[index + 3] = 255;
    }
  }
  return out;
}

/** The median yellowness of the paper: most judged pixels are bare paper. */
function paperTint(values: Float32Array, covered: Uint8Array): number {
  const levels = new Uint32Array(256);
  let count = 0;
  for (let pixel = 0; pixel < values.length; pixel += 3) {
    if (covered[pixel]) continue;
    const level = Math.min(255, Math.round(values[pixel] ?? 0));
    levels[level] = (levels[level] ?? 0) + 1;
    count++;
  }
  for (let level = 0, seen = 0; level < 256; level++) {
    seen += levels[level] ?? 0;
    if (seen >= count / 2) return level;
  }
  return 0;
}

/** The mean of judged pixels around each pixel; covered pixels don't count. */
function smoothed(
  values: Float32Array,
  covered: Uint8Array,
  width: number,
  height: number,
  radius: number,
): Float32Array {
  const stride = width + 1;
  const sums = new Float64Array(stride * (height + 1));
  const counts = new Uint32Array(stride * (height + 1));
  for (let y = 1; y <= height; y++) {
    let rowSum = 0;
    let rowCount = 0;
    for (let x = 1; x <= width; x++) {
      const pixel = (y - 1) * width + (x - 1);
      if (!covered[pixel]) {
        rowSum += values[pixel] ?? 0;
        rowCount++;
      }
      sums[y * stride + x] = (sums[(y - 1) * stride + x] ?? 0) + rowSum;
      counts[y * stride + x] = (counts[(y - 1) * stride + x] ?? 0) + rowCount;
    }
  }
  const out = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    const top = Math.max(0, y - radius);
    const bottom = Math.min(height, y + radius + 1);
    for (let x = 0; x < width; x++) {
      const left = Math.max(0, x - radius);
      const right = Math.min(width, x + radius + 1);
      const corner = (table: Float64Array | Uint32Array) =>
        (table[bottom * stride + right] ?? 0) -
        (table[top * stride + right] ?? 0) -
        (table[bottom * stride + left] ?? 0) +
        (table[top * stride + left] ?? 0);
      const count = corner(counts);
      out[y * width + x] = count ? corner(sums) / count : 0;
    }
  }
  return out;
}

/** Summed-area table, one row and column larger than the image. */
function integral(values: Uint8Array, width: number, height: number): Uint32Array {
  const table = new Uint32Array((width + 1) * (height + 1));
  for (let y = 1; y <= height; y++) {
    let row = 0;
    for (let x = 1; x <= width; x++) {
      row += values[(y - 1) * width + (x - 1)] ?? 0;
      table[y * (width + 1) + x] = (table[(y - 1) * (width + 1) + x] ?? 0) + row;
    }
  }
  return table;
}

function boxSum(
  table: Uint32Array,
  width: number,
  height: number,
  x: number,
  y: number,
  radius: number,
): number {
  const left = Math.max(0, x - radius);
  const top = Math.max(0, y - radius);
  const right = Math.min(width, x + radius + 1);
  const bottom = Math.min(height, y + radius + 1);
  const stride = width + 1;
  return (
    (table[bottom * stride + right] ?? 0) -
    (table[top * stride + right] ?? 0) -
    (table[bottom * stride + left] ?? 0) +
    (table[top * stride + left] ?? 0)
  );
}

/** How bright the paper is in this picture: the 90th percentile of red/green. */
function paperBrightness(data: Uint8ClampedArray): number {
  const histogram = new Uint32Array(256);
  let count = 0;
  // Every 7th pixel is plenty to judge the paper.
  for (let index = 0; index < data.length; index += 28) {
    const level = Math.min(data[index] ?? 0, data[index + 1] ?? 0);
    histogram[level] = (histogram[level] ?? 0) + 1;
    count++;
  }
  let seen = 0;
  for (let level = 0; level < 256; level++) {
    seen += histogram[level] ?? 0;
    if (seen >= count * 0.9) return level;
  }
  return 255;
}

/** Reads the hidden mark from a camera frame or photo, if it's there. */
export function readHiddenMark(image: ImageData): string | null {
  const revealed = revealHiddenInk(image);
  const text = jsQR(revealed.data, revealed.width, revealed.height, {
    inversionAttempts: "dontInvert",
  })?.data;
  return text?.startsWith(HIDDEN_MARK_PREFIX) ? text : null;
}
