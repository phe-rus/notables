/**
 * Composes store images as HTML pages: warm paper, a Newsreader headline
 * with a Caveat accent, and the app's own screen as a floating card. Playwright renders each page at the store's exact pixel size.
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
body{position:relative;background:#fbf5ec;font-family:"Newsreader",serif;color:#26201b;-webkit-font-smoothing:antialiased}
.paper{position:absolute;inset:0;background:
  radial-gradient(60% 45% at 88% 8%,rgba(255,206,160,.75),transparent 70%),
  radial-gradient(55% 40% at 6% 30%,rgba(246,196,204,.55),transparent 70%),
  radial-gradient(70% 50% at 50% 105%,rgba(236,178,190,.55),transparent 70%),
  linear-gradient(180deg,#fdf8f1,#f8eee4)}
.paper::after{content:"";position:absolute;inset:0;opacity:.5;background:repeating-linear-gradient(to bottom,transparent 0 calc(var(--rule) - 1px),rgba(120,90,60,.06) calc(var(--rule) - 1px) var(--rule))}
.card{position:absolute;overflow:hidden;background:#fff;display:flex;flex-direction:column;
  box-shadow:0 0 0 1px rgba(70,45,25,.08),0 2px 6px rgba(70,45,25,.06),0 24px 60px -16px rgba(90,50,30,.32),0 60px 120px -40px rgba(190,90,110,.28)}
.card img{display:block;width:100%;flex:none}
.rim{position:absolute;pointer-events:none;border:1px solid rgba(255,255,255,.9);box-shadow:inset 0 0 0 1px rgba(255,255,255,.35)}
.status{display:flex;align-items:center;justify-content:space-between;flex:none;font-family:"SF Pro Text","Roboto","Inter","Liberation Sans",Arial,sans-serif;font-weight:650;letter-spacing:-.01em}
.status svg{height:.95em;fill:currentColor}
.home{display:flex;align-items:center;justify-content:center;flex:none}
.home i{display:block;border-radius:99px;background:currentColor;opacity:.9}
${extraCss}
</style></head><body><div class="paper"></div>${body}</body></html>`;
}

/** Android 15: time on the left, Material icons and the battery level on the right. */
const androidStatusBar =
  () => `<span style="font-weight:500">9:41</span><span style="display:flex;gap:.35em;align-items:center;font-weight:500">
<svg viewBox="0 0 16 13"><path d="M8 12.5 0 3.2A12.4 12.4 0 0 1 16 3.2z"/></svg>
<svg viewBox="0 0 13 13"><path d="M13 0v13H0z"/></svg>
<svg viewBox="0 0 8 13" style="height:1.05em"><rect x="2.5" y="0" width="3" height="1.5" rx=".5"/><rect x="0" y="1.2" width="8" height="11.8" rx="1.4"/></svg>
<span style="font-size:.92em">100%</span></span>`;

/** 9:41 (with the date on a tablet), signal, Wi-Fi and battery, in the strip's own colour. */
const statusBar = (
  tablet: boolean,
) => `<span>${tablet ? '9:41&nbsp;&nbsp;<span style="font-weight:500">Fri 16 Oct</span>' : "9:41"}</span><span style="display:flex;gap:.4em;align-items:center">
${tablet ? "" : `<svg viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>`}
<svg viewBox="0 0 16 12"><path d="M8 11.6 5.7 9.2a3.3 3.3 0 0 1 4.6 0zM3.5 7a6.4 6.4 0 0 1 9 0l1.5-1.5a8.5 8.5 0 0 0-12 0zM.4 3.9a10.7 10.7 0 0 1 15.2 0L17 2.5A12.7 12.7 0 0 0-1 2.5z"/></svg>
<svg viewBox="0 0 27 12"><rect x=".5" y=".5" width="23" height="11" rx="3.4" fill="none" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="20" height="8" rx="2"/><path d="M25 4v4a2 2 0 0 0 0-4z" opacity=".4"/></svg></span>`;

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
  /** Android's status bar and gesture bar instead of Apple's. */
  android?: boolean;
  /** A magnified piece of the screen, in viewport pixels, shown floating over it. */
  callout?: { x: number; y: number; w: number; h: number };
}

/**
 * One store screenshot, framed the way Apple frames its own: no hardware,
 * just the screen as a rounded card with a status bar and home indicator,
 * floating on warm paper under the headline.
 */
export async function framePage(spec: FrameSpec): Promise<string> {
  const { width, height, viewport, tablet } = spec;
  const top = height * (tablet ? 0.165 : 0.2);
  const available = height - top - height * (tablet ? 0.04 : 0.05);
  const statusShare = tablet ? 0.028 : 0.105;
  const homeShare = tablet ? 0.022 : 0.06;
  const screenFor = (w: number) => w * (statusShare + homeShare + viewport.height / viewport.width);
  let screenW = width * (tablet ? 0.86 : 0.8);
  if (screenFor(screenW) > available) screenW *= available / screenFor(screenW);
  const screenH = screenFor(screenW);
  const statusH = screenW * statusShare;
  const homeH = screenW * homeShare;
  const left = (width - screenW) / 2;
  const radius = screenW * (tablet ? 0.03 : 0.1);
  const headSize = tablet ? width * 0.058 : width * 0.088;
  const accentSize = headSize * 0.64;
  const image = pngData(spec.screenshot);

  let callout = "";
  if (spec.callout) {
    const { x, y, w, h } = spec.callout;
    const scale = screenW / viewport.width;
    const zoom = (screenW * 1.06) / (w * scale);
    const cw = w * scale * zoom;
    const ch = h * scale * zoom;
    callout = `<div class="callout" style="left:${(width - cw) / 2}px;top:${top + statusH + screenH * 0.66}px;width:${cw}px;height:${ch}px;
      background-image:url(${image});background-size:${viewport.width * scale * zoom}px ${viewport.height * scale * zoom}px;
      background-position:${-x * scale * zoom}px ${-y * scale * zoom}px"></div>`;
  }

  const body = `
<header style="position:absolute;left:0;right:0;top:0;height:${top}px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${headSize * 0.32}px;padding:0 ${width * 0.05}px;text-align:center">
  <h1 style="font-size:${headSize}px;line-height:1.02;font-weight:650;letter-spacing:-.025em;white-space:nowrap">${spec.headline}</h1>
  <p style="font-family:Caveat;font-weight:600;font-size:${accentSize}px;line-height:1;color:#d0703a;white-space:nowrap">${spec.accent}</p>
</header>
<div class="card" data-pending style="left:${left}px;top:${top}px;width:${screenW}px;height:${screenH}px;border-radius:${radius}px">
  <div class="status" style="height:${statusH}px;font-size:${statusH * (tablet ? 0.55 : 0.33)}px;padding:${tablet ? 0 : statusH * 0.12}px ${screenW * (tablet ? 0.025 : 0.085)}px 0">${spec.android ? androidStatusBar() : statusBar(Boolean(tablet))}</div>
  <img src="${image}">
  <div class="home" style="height:${homeH}px"><i style="width:${screenW * (tablet ? 0.22 : spec.android ? 0.28 : 0.36)}px;height:${Math.max(2, screenW * (spec.android ? 0.009 : 0.012))}px"></i></div>
</div>
<div class="rim" style="left:${left}px;top:${top}px;width:${screenW}px;height:${screenH}px;border-radius:${radius}px"></div>
${callout}
<script>
  // The bars take the colour of the app's own top and bottom edges.
  const card = document.querySelector(".card");
  const shot = card.querySelector("img");
  const paint = () => {
    const canvas = document.createElement("canvas");
    canvas.width = shot.naturalWidth;
    canvas.height = shot.naturalHeight;
    const context = canvas.getContext("2d");
    context.drawImage(shot, 0, 0);
    const at = (y) => context.getImageData(Math.round(canvas.width / 2), y, 1, 1).data;
    const set = (element, [r, g, b]) => {
      element.style.background = "rgb(" + r + "," + g + "," + b + ")";
      element.style.color = 0.299 * r + 0.587 * g + 0.114 * b > 140 ? "#111" : "#fff";
    };
    set(card.querySelector(".status"), at(2));
    set(card.querySelector(".home"), at(canvas.height - 2));
    card.removeAttribute("data-pending");
  };
  shot.complete ? paint() : shot.addEventListener("load", paint);
</script>`;
  return base(
    width,
    height,
    body,
    `.paper::after{--rule:${Math.round(height / 32)}px}
.callout{position:absolute;border-radius:${width * 0.035}px;background-color:#fff;background-repeat:no-repeat;
  box-shadow:0 0 0 1px rgba(70,45,25,.08),0 30px 60px -14px rgba(90,50,30,.4)}`,
  );
}

/**
 * Google Play's 1024 by 500 feature graphic: the mark and name on the
 * left, and a tilted wall of real screens running off the right edge.
 */
export async function featureGraphic(
  icon: Uint8Array,
  screens: Uint8Array[],
  viewport: { width: number; height: number },
): Promise<string> {
  const w = 200;
  const h = (w * viewport.height) / viewport.width;
  const column = (shots: Uint8Array[], offset: number) =>
    `<div style="display:flex;flex-direction:column;gap:26px;transform:translateY(${offset}px)">${shots
      .map(
        (shot) =>
          `<div class="card" style="position:relative;width:${w}px;height:${h}px;border-radius:24px"><img src="${pngData(shot)}"></div>`,
      )
      .join("")}</div>`;
  const [a, b, c, d, e] = screens;
  const body = `
<div style="position:absolute;left:470px;top:-150px;display:flex;gap:26px;transform:perspective(1600px) rotateX(18deg) rotateY(-14deg) rotateZ(-16deg);transform-origin:left top">
  ${column([a, b], 40)}${column([c, d], -120)}${column([e, a], -20)}
</div>
<div style="position:absolute;left:0;top:0;bottom:0;width:560px;background:linear-gradient(90deg,#fbf3ea 62%,rgba(251,243,234,0))"></div>
<img src="${pngData(icon)}" style="position:absolute;left:64px;top:70px;width:76px;height:76px;border-radius:18px;box-shadow:0 12px 26px -8px rgba(90,50,30,.35)">
<h1 style="position:absolute;left:60px;top:158px;font-size:96px;font-weight:650;letter-spacing:-.035em;line-height:1">Notables</h1>
<p style="position:absolute;left:64px;top:270px;font-family:'Newsreader Italic';font-size:28px;color:#4a3f37">Anything notable, always with you.</p>
<p style="position:absolute;left:64px;top:312px;font-family:Caveat;font-weight:600;font-size:31px;color:#d0703a">notes, books, comics, plans &amp; invoices</p>
<div style="position:absolute;left:64px;top:382px;display:flex;gap:10px;font-family:'Liberation Sans',Arial,sans-serif;font-size:15px;font-weight:600;color:#5a4636">
  <span class="pill">Local first</span><span class="pill">No account</span><span class="pill">Works offline</span>
</div>`;
  return base(
    1024,
    500,
    body,
    `.paper::after{--rule:26px}
.pill{padding:8px 14px;border-radius:99px;background:rgba(255,255,255,.75);box-shadow:0 0 0 1px rgba(120,80,50,.12),0 6px 14px -8px rgba(90,50,30,.3)}`,
  );
}
