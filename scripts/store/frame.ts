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

/** 9:41, signal, Wi-Fi and battery, drawn in the strip's own colour. */
const statusBar = () => `<span>9:41</span><span style="display:flex;gap:.35em;align-items:center">
<svg viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>
<svg viewBox="0 0 16 12"><path d="M8 11.5 5.6 9a3.4 3.4 0 0 1 4.8 0zM3.4 6.8a6.5 6.5 0 0 1 9.2 0l1.6-1.6a8.8 8.8 0 0 0-12.4 0zM.2 3.6a11 11 0 0 1 15.6 0L16 3.4"/></svg>
<svg viewBox="0 0 26 12"><rect x=".5" y=".5" width="22" height="11" rx="3" fill="none" stroke="currentColor" opacity=".5"/><rect x="2" y="2" width="17" height="8" rx="1.8"/><rect x="23.5" y="4" width="1.8" height="4" rx=".8" opacity=".5"/></svg></span>`;

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
  /** The hardware drawn around the screen. */
  model?: "galaxy" | "iphone" | "ipad";
  /** A magnified piece of the screen, in viewport pixels, shown floating over the frame. */
  callout?: { x: number; y: number; w: number; h: number };
}

/** One store screenshot: headline above, the app in a phone or tablet below. */
export async function framePage(spec: FrameSpec): Promise<string> {
  const { width, height, viewport } = spec;
  const top = height * (spec.tablet ? 0.17 : 0.175);
  const model = spec.model ?? (spec.tablet ? "ipad" : "iphone");
  // Galaxy S25: thin even bezels; iPhone a little wider; iPad wider still.
  const bezel = width * (model === "galaxy" ? 0.014 : model === "iphone" ? 0.022 : 0.02);
  const available = height - top - height * 0.025;
  // A status bar above the app and a home indicator below it, as on the
  // device, so the screen's rounded corners never cover the app.
  const statusShare = spec.tablet ? 0.032 : 0.11;
  const homeShare = spec.tablet ? 0.026 : 0.075;
  const screenFor = (w: number) => w * (statusShare + homeShare + viewport.height / viewport.width);
  let screenW = spec.tablet ? width * 0.84 : width * 0.8;
  let screenH = screenFor(screenW);
  if (screenH + bezel * 2 > available) {
    screenW = ((available - bezel * 2) / screenH) * screenW;
    screenH = screenFor(screenW);
  }
  const statusH = screenW * statusShare;
  const homeH = screenW * homeShare;
  const deviceW = screenW + bezel * 2;
  const deviceH = screenH + bezel * 2;
  const deviceHFor = (share: number) => deviceH * share;
  const left = (width - deviceW) / 2;
  const radius = width * (model === "galaxy" ? 0.085 : model === "iphone" ? 0.115 : 0.045);
  const camera =
    model === "galaxy"
      ? `<i class="camera" style="width:${statusH * 0.42}px;height:${statusH * 0.42}px;border-radius:50%"></i>`
      : model === "iphone"
        ? `<i class="camera" style="width:${screenW * 0.3}px;height:${statusH * 0.62}px;border-radius:${statusH}px"></i>`
        : "";
  const keys =
    model === "galaxy"
      ? `<i class="key" style="right:-${width * 0.012}px;top:${deviceHFor(0.2)}px;height:${width * 0.13}px"></i><i class="key" style="right:-${width * 0.012}px;top:${deviceHFor(0.36)}px;height:${width * 0.07}px"></i>`
      : model === "iphone"
        ? `<i class="key" style="left:-${width * 0.012}px;top:${deviceHFor(0.18)}px;height:${width * 0.09}px"></i><i class="key" style="left:-${width * 0.012}px;top:${deviceHFor(0.28)}px;height:${width * 0.09}px"></i><i class="key" style="right:-${width * 0.012}px;top:${deviceHFor(0.25)}px;height:${width * 0.14}px"></i>`
        : "";
  const headSize = spec.tablet ? width * 0.056 : width * 0.084;
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
    const cy = top + bezel + statusH + screenH * 0.7;
    callout = `<div class="callout" style="left:${cx}px;top:${cy}px;width:${cw}px;height:${ch}px;
      background-image:url(${image});background-size:${viewport.width * scale * zoom}px ${viewport.height * scale * zoom}px;
      background-position:${-x * scale * zoom}px ${-y * scale * zoom}px"></div>`;
  }

  const body = `
<header style="position:absolute;left:0;right:0;top:0;height:${top}px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${headSize * 0.3}px;padding:0 ${width * 0.05}px ${headSize * 0.25}px;text-align:center">
  <h1 style="font-size:${headSize}px;line-height:1.02;font-weight:640;letter-spacing:-.022em;white-space:nowrap">${spec.headline}</h1>
  <p style="font-family:Caveat;font-weight:600;font-size:${accentSize}px;line-height:1;color:#d9772b;white-space:nowrap">${spec.accent}</p>
</header>
<div class="device ${model}" style="left:${left}px;top:${top}px;width:${deviceW}px;height:${deviceH}px;border-radius:${radius}px">${keys}
  <div class="screen" data-pending style="left:${bezel}px;top:${bezel}px;width:${screenW}px;height:${screenH}px;border-radius:${radius - bezel}px;display:flex;flex-direction:column">
    <div class="status" style="height:${statusH}px;font-size:${statusH * (spec.tablet ? 0.62 : 0.34)}px;padding:0 ${screenW * (spec.tablet ? 0.03 : 0.09)}px">${statusBar()}${camera}</div>
    <img src="${image}" style="height:auto;flex:none">
    <div class="home" style="height:${homeH}px"><i style="width:${screenW * 0.34}px;height:${Math.max(2, homeH * 0.12)}px"></i></div>
  </div>
</div>${callout}
<script>
  // The strips take the colour of the app's own top and bottom edges.
  const screen = document.querySelector(".screen");
  const shot = screen.querySelector("img");
  const paint = () => {
    const canvas = document.createElement("canvas");
    canvas.width = shot.naturalWidth;
    canvas.height = shot.naturalHeight;
    const context = canvas.getContext("2d");
    context.drawImage(shot, 0, 0);
    const at = (y) => context.getImageData(Math.round(canvas.width / 2), y, 1, 1).data;
    const set = (element, [r, g, b]) => {
      element.style.background = "rgb(" + r + "," + g + "," + b + ")";
      element.style.color = 0.299 * r + 0.587 * g + 0.114 * b > 140 ? "#1d1a18" : "#fff";
    };
    set(screen.querySelector(".status"), at(2));
    set(screen.querySelector(".home"), at(canvas.height - 2));
    screen.removeAttribute("data-pending");
  };
  shot.complete ? paint() : shot.addEventListener("load", paint);
</script>`;
  return base(
    width,
    height,
    body,
    `.paper{--rule:${Math.round(height / 30)}px}
.status{position:relative;display:flex;align-items:center;justify-content:space-between;font-family:system-ui,sans-serif;font-weight:600;flex:none}
.status svg{height:1em;fill:currentColor}
.camera{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:#0b0b0c;box-shadow:inset 0 0 0 1px #222}
.key{position:absolute;width:${width * 0.008}px;border-radius:3px;background:linear-gradient(90deg,#8f949b,#d9dce0,#8f949b)}
.galaxy{background:#0d0d0f;box-shadow:0 30px 60px -18px rgba(60,40,20,.45),0 0 0 ${width * 0.006}px #b9bdc3,0 0 0 ${width * 0.0075}px #7d8288,inset 0 0 0 1px #2a2a2e}
.iphone{background:#121212;box-shadow:0 30px 60px -18px rgba(60,40,20,.45),0 0 0 ${width * 0.006}px #c8c3ba,0 0 0 ${width * 0.0075}px #8d877e}
.home{display:flex;align-items:center;justify-content:center;flex:none}
.home i{display:block;border-radius:99px;background:currentColor;opacity:.85}
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
