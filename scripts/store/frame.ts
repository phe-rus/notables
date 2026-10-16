/**
 * Composes store images as HTML pages: warm ruled paper, a Newsreader
 * headline with a Caveat accent, and the app's own screenshot in a device
 * frame. Playwright renders each page at the store's exact pixel size.
 */
import { join } from "node:path";

const FONTS = join(import.meta.dir, "..", "..", "www", "node_modules", "@fontsource-variable");

async function fontFace(family: string, file: string): Promise<string> {
  const data = Buffer.from(await Bun.file(join(FONTS, file)).arrayBuffer()).toString("base64");
  return `@font-face{font-family:"${family}";src:url(data:font/woff2;base64,${data}) format("woff2");font-weight:200 900}`;
}

export const pngData = (bytes: Uint8Array) =>
  `data:image/png;base64,${Buffer.from(bytes).toString("base64")}`;

async function base(width: number, height: number, body: string, extraCss = ""): Promise<string> {
  const fonts = [
    await fontFace("Newsreader", "newsreader/files/newsreader-latin-wght-normal.woff2"),
    await fontFace("Newsreader Italic", "newsreader/files/newsreader-latin-wght-italic.woff2"),
    await fontFace("Caveat", "caveat/files/caveat-latin-wght-normal.woff2"),
  ].join("");
  return `<!doctype html><html><head><meta charset="utf-8"><style>${fonts}
*{box-sizing:border-box;margin:0}
html,body{width:${width}px;height:${height}px;overflow:hidden}
body{position:relative;background:#fbf6ee;font-family:"Newsreader",serif;color:#29221d;-webkit-font-smoothing:antialiased}
.paper{position:absolute;inset:0;background:
  radial-gradient(120% 70% at 100% 0%,rgba(250,214,160,.55),transparent 60%),
  radial-gradient(90% 60% at 0% 100%,rgba(240,200,190,.35),transparent 65%),
  repeating-linear-gradient(to bottom,transparent 0 calc(var(--rule) - 1px),rgba(120,90,60,.09) calc(var(--rule) - 1px) var(--rule))}
.device{position:absolute;background:#1d1a18;box-shadow:0 30px 60px -18px rgba(60,40,20,.45),0 8px 18px rgba(60,40,20,.18),inset 0 0 0 1.5px #3b3633}
.screen{position:absolute;overflow:hidden;background:#fff}
.screen img{display:block;width:100%;height:100%;object-fit:cover;object-position:top}
${extraCss}
</style></head><body><div class="paper"></div>${body}</body></html>`;
}

export interface FrameSpec {
  /** Page size in CSS pixels; the store size divided by `scale`. */
  width: number;
  height: number;
  headline: string;
  accent: string;
  screenshot: Uint8Array;
  /** The app's viewport, for the screen's aspect ratio. */
  viewport: { width: number; height: number };
  tablet?: boolean;
  /** A magnified piece of the screen, in viewport pixels, shown floating over the frame. */
  callout?: { x: number; y: number; w: number; h: number };
}

/** One store screenshot: headline above, the app in a phone or tablet below. */
export async function framePage(spec: FrameSpec): Promise<string> {
  const { width, height, viewport } = spec;
  const top = height * (spec.tablet ? 0.205 : 0.215);
  const bezel = spec.tablet ? width * 0.022 : width * 0.026;
  const available = height - top - height * 0.035;
  let screenW = spec.tablet ? width * 0.8 : width * 0.62;
  let screenH = (screenW * viewport.height) / viewport.width;
  if (screenH + bezel * 2 > available) {
    screenH = available - bezel * 2;
    screenW = (screenH * viewport.width) / viewport.height;
  }
  const deviceW = screenW + bezel * 2;
  const deviceH = screenH + bezel * 2;
  const left = (width - deviceW) / 2;
  const radius = spec.tablet ? width * 0.045 : width * 0.11;
  const headSize = spec.tablet ? width * 0.062 : width * 0.092;
  const accentSize = headSize * 0.66;
  const image = pngData(spec.screenshot);

  let callout = "";
  if (spec.callout) {
    const { x, y, w, h } = spec.callout;
    const scale = screenW / viewport.width;
    const zoom = (deviceW * 1.02) / (w * scale);
    const cw = w * scale * zoom;
    const ch = h * scale * zoom;
    const cx = (width - cw) / 2;
    const cy = top + bezel + screenH * 0.76;
    callout = `<div class="callout" style="left:${cx}px;top:${cy}px;width:${cw}px;height:${ch}px;
      background-image:url(${image});background-size:${viewport.width * scale * zoom}px ${viewport.height * scale * zoom}px;
      background-position:${-x * scale * zoom}px ${-y * scale * zoom}px"></div>`;
  }

  const body = `
<header style="position:absolute;left:0;right:0;top:0;height:${top}px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${headSize * 0.3}px;padding:0 ${width * 0.05}px ${headSize * 0.25}px;text-align:center">
  <h1 style="font-size:${headSize}px;line-height:1.02;font-weight:640;letter-spacing:-.022em;white-space:nowrap">${spec.headline}</h1>
  <p style="font-family:Caveat;font-weight:600;font-size:${accentSize}px;line-height:1;color:#d9772b;white-space:nowrap">${spec.accent}</p>
</header>
<div class="device" style="left:${left}px;top:${top}px;width:${deviceW}px;height:${deviceH}px;border-radius:${radius}px">
  <div class="screen" style="left:${bezel}px;top:${bezel}px;width:${screenW}px;height:${screenH}px;border-radius:${radius - bezel}px"><img src="${image}"></div>
</div>${callout}`;
  return base(
    width,
    height,
    body,
    `.paper{--rule:${Math.round(height / 30)}px}
.callout{position:absolute;border-radius:${width * 0.035}px;background-color:#fff;background-repeat:no-repeat;
  box-shadow:0 24px 50px -12px rgba(60,40,20,.45),0 0 0 1px rgba(60,40,20,.08)}`,
  );
}

/** Google Play's 1024 by 500 feature graphic: the mark, the name and three phones. */
export async function featureGraphic(
  icon: Uint8Array,
  screens: Uint8Array[],
  viewport: { width: number; height: number },
): Promise<string> {
  const phoneW = 190;
  const bezel = 7;
  const screenW = phoneW - bezel * 2;
  const screenH = (screenW * viewport.height) / viewport.width;
  const phones = screens
    .map((shot, i) => {
      const x = [560, 790, 675][i];
      const y = [92, 110, 52][i];
      const rotate = [-6, 6, 0][i];
      return `<div class="device" style="left:${x}px;top:${y}px;width:${phoneW}px;height:${screenH + bezel * 2}px;border-radius:30px;transform:rotate(${rotate}deg);z-index:${i === 2 ? 2 : 1}">
  <div class="screen" style="left:${bezel}px;top:${bezel}px;width:${screenW}px;height:${screenH}px;border-radius:23px"><img src="${pngData(shot)}"></div></div>`;
    })
    .join("");
  const body = `
<img src="${pngData(icon)}" style="position:absolute;left:70px;top:78px;width:84px;height:84px;border-radius:20px;box-shadow:0 10px 24px -8px rgba(60,40,20,.35)">
<h1 style="position:absolute;left:66px;top:170px;font-size:104px;font-weight:640;letter-spacing:-.03em;line-height:1">Notables</h1>
<p style="position:absolute;left:70px;top:290px;font-family:'Newsreader Italic';font-size:30px;color:#4a3f37">A calm place for everything you write.</p>
<p style="position:absolute;left:70px;top:336px;font-family:Caveat;font-weight:600;font-size:34px;color:#d9772b">notes, journals, books, comics &amp; invoices</p>
<p style="position:absolute;left:70px;top:404px;font-family:system-ui,sans-serif;font-size:16px;color:#6b5f55"><b style="color:#3b322c">Local first</b> &nbsp;·&nbsp; no account &nbsp;·&nbsp; works offline</p>
${phones}`;
  return base(1024, 500, body, ".paper{--rule:28px}");
}
