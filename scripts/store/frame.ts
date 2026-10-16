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
body{position:relative;background:#fbf1f3;font-family:"Newsreader",serif;color:#1d1b18;-webkit-font-smoothing:antialiased}
/* Hino's Blush: the accent's soft tints, lit from above like Apple's own store art. */
.paper{position:absolute;inset:0;background:
  radial-gradient(90% 55% at 50% -8%,#ffffff 0%,rgba(255,255,255,0) 72%),
  radial-gradient(70% 45% at 100% 100%,rgba(209,105,136,.16),transparent 70%),
  radial-gradient(60% 40% at 0% 70%,rgba(239,179,187,.22),transparent 70%),
  linear-gradient(180deg,#fdf6f7 0%,#f8e6e9 100%)}
.card{position:absolute;overflow:hidden;background:#fff;display:flex;flex-direction:column;
  box-shadow:0 0 0 1px rgba(80,30,45,.07),0 2px 6px rgba(80,30,45,.05),0 28px 60px -18px rgba(120,40,65,.28),0 70px 120px -50px rgba(209,105,136,.35)}
.card img{display:block;width:100%;flex:none}
.rim{position:absolute;pointer-events:none;border:1px solid rgba(255,255,255,.95)}
.status{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;flex:none;font-family:"SF Pro Text","Roboto","Inter","Liberation Sans",Arial,sans-serif;letter-spacing:-.01em}
.status .time{font-weight:650;justify-self:center}
.status .icons{display:flex;gap:.32em;align-items:center;justify-self:center}
.status.android .time{font-weight:500;justify-self:start}
.status.android .icons{justify-self:end;gap:.3em}
.status svg{height:.82em;fill:currentColor;display:block}
.island{display:block;background:#050505;border-radius:99px}
.home{display:flex;align-items:center;justify-content:center;flex:none}
.home i{display:block;border-radius:99px;background:currentColor;opacity:.9}
${extraCss}
</style></head><body><div class="paper"></div>${body}</body></html>`;
}

/** Android 16: time on the left, a punch-hole camera, Material icons and the battery level. */
const androidStatusBar = (
  camera: string,
) => `<span class="time">9:41</span>${camera}<span class="icons">
<svg viewBox="0 0 16 12"><path d="M8 11.8.2 3.6a11.6 11.6 0 0 1 15.6 0z"/></svg>
<svg viewBox="0 0 12 12"><path d="M12 0v12H0z"/></svg>
<svg viewBox="0 0 7 12" style="height:.95em"><rect x="2" y="0" width="3" height="1.4" rx=".4"/><rect x="0" y="1.1" width="7" height="10.9" rx="1.3"/></svg>
<span style="font-size:.9em;font-weight:500">100%</span></span>`;

/** iOS: time, the Dynamic Island, then signal, Wi-Fi and battery, drawn the way Apple draws them. */
const iosStatusBar = (
  camera: string,
  date: boolean,
) => `<span class="time">9:41${date ? '&nbsp;&nbsp;<span style="font-weight:500">Fri 16 Oct</span>' : ""}</span>${camera}<span class="icons">
${date ? "" : `<svg viewBox="0 0 17 11"><rect x="0" y="7.4" width="3" height="3.6" rx=".9"/><rect x="4.6" y="5.4" width="3" height="5.6" rx=".9"/><rect x="9.2" y="3" width="3" height="8" rx=".9"/><rect x="13.8" y=".4" width="3" height="10.6" rx=".9"/></svg>`}
<svg viewBox="0 0 16 11.5"><path d="M8 11.2 10.2 8.9a3.2 3.2 0 0 0-4.4 0z"/><path d="M3.8 6.6a6 6 0 0 1 8.4 0M1.2 3.9a9.7 9.7 0 0 1 13.6 0" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>
<svg viewBox="0 0 27 13" style="height:.9em"><rect x=".6" y=".6" width="23.4" height="11.8" rx="3.6" fill="none" stroke="currentColor" stroke-opacity=".38" stroke-width="1.1"/><rect x="2.3" y="2.3" width="20" height="8.4" rx="2.1"/><path d="M25.3 4.5v4c.8-.3 1.4-1.1 1.4-2s-.6-1.7-1.4-2z" fill-opacity=".4"/></svg></span>`;

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
  // Landscape tablets put the headline on one line.
  const landscape = width > height;
  const headline = landscape ? spec.headline.replace(/<br>/g, " ") : spec.headline;
  const top = height * (landscape ? 0.21 : tablet ? 0.165 : 0.2);
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
  const radius = screenW * (tablet ? 0.022 : 0.075);
  const headSize = landscape ? height * 0.068 : tablet ? width * 0.058 : width * 0.088;
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
  <h1 style="font-size:${headSize}px;line-height:1.02;font-weight:650;letter-spacing:-.025em;white-space:nowrap">${headline}</h1>
  <p style="font-family:Caveat;font-weight:600;font-size:${accentSize}px;line-height:1;color:#a23f51;white-space:nowrap">${spec.accent}</p>
</header>
<div class="card" data-pending style="left:${left}px;top:${top}px;width:${screenW}px;height:${screenH}px;border-radius:${radius}px">
  <div class="status${spec.android ? " android" : ""}" style="height:${statusH}px;font-size:${statusH * (tablet ? 0.55 : 0.34)}px;padding:${tablet ? 0 : statusH * 0.08}px ${screenW * (tablet ? 0.025 : spec.android ? 0.07 : 0.06)}px 0">${spec.android ? androidStatusBar(tablet ? "<i></i>" : `<i class="island" style="width:${statusH * 0.36}px;height:${statusH * 0.36}px"></i>`) : iosStatusBar(tablet ? "<i></i>" : `<i class="island" style="width:${screenW * 0.31}px;height:${statusH * 0.6}px"></i>`, Boolean(tablet))}</div>
  <img src="${image}">
  <div class="home" style="height:${homeH}px"><i style="width:${screenW * (tablet ? 0.22 : spec.android ? 0.28 : 0.36)}px;height:${Math.max(2, screenW * (tablet ? 0.0045 : spec.android ? 0.009 : 0.012))}px"></i></div>
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
    `.callout{position:absolute;border-radius:${width * 0.035}px;background-color:#fff;background-repeat:no-repeat;
  box-shadow:0 0 0 1px rgba(70,45,25,.08),0 30px 60px -14px rgba(90,50,30,.4)}`,
  );
}

/** Inter, the nearest open face to Apple's SF Pro, for the feature graphic. */
async function interFace(): Promise<string> {
  const file = join(
    import.meta.dir,
    "..",
    "..",
    "node_modules",
    "@fontsource-variable",
    "inter",
    "files",
    "inter-latin-opsz-normal.woff2",
  );
  const data = Buffer.from(await Bun.file(file).arrayBuffer()).toString("base64");
  return `@font-face{font-family:"Inter";src:url(data:font/woff2;base64,${data}) format("woff2");font-weight:100 900}`;
}

/**
 * Google Play's 1024 by 500 feature graphic, the way Apple would set it:
 * the mark and name in a bold sans on the left, glass pills, and three real
 * screens standing on the right, the front one bleeding off the bottom.
 */
export async function featureGraphic(
  icon: Uint8Array,
  screens: Uint8Array[],
  viewport: { width: number; height: number },
): Promise<string> {
  const card = (shot: Uint8Array, x: number, y: number, w: number, z: number, dim = 1) =>
    `<div class="card" style="left:${x}px;top:${y}px;width:${w}px;height:${(w * viewport.height) / viewport.width}px;border-radius:${w * 0.09}px;z-index:${z};filter:brightness(${dim})"><img src="${pngData(shot)}"></div>`;
  const [left, front, right] = screens;
  const check = `<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="8" fill="#d16988"/><path d="M4.6 8.3 7 10.6l4.4-5" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const pill = (text: string) => `<span class="pill">${check}${text}</span>`;
  const body = `
${card(left, 590, 96, 196, 1, 0.98)}${card(right, 808, 96, 196, 1, 0.98)}${card(front, 676, 44, 236, 2)}
<img src="${pngData(icon)}" style="position:absolute;left:64px;top:84px;width:72px;height:72px;border-radius:17px;box-shadow:0 10px 24px -8px rgba(120,40,65,.35)">
<h1 class="sans" style="position:absolute;left:60px;top:170px;font-size:92px;font-weight:750;letter-spacing:-.045em;line-height:1">Notables</h1>
<p class="sans" style="position:absolute;left:64px;top:262px;font-size:25px;font-weight:500;letter-spacing:-.015em;color:#5b5550;width:500px;line-height:1.3">Anything notable, always with you.</p>
<div class="sans" style="position:absolute;left:64px;top:322px;display:flex;gap:8px;white-space:nowrap">${pill("Local first")}${pill("Account not required")}${pill("Works offline")}</div>`;
  return base(
    1024,
    500,
    body,
    `${await interFace()}
.sans{font-family:"Inter","SF Pro Display",system-ui,sans-serif;font-optical-sizing:auto}
.pill{display:inline-flex;align-items:center;gap:7px;padding:8px 13px 8px 9px;border-radius:99px;font-size:14px;font-weight:600;letter-spacing:-.01em;color:#2a2522;
  background:rgba(255,255,255,.62);backdrop-filter:blur(14px) saturate(1.4);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 0 0 1px rgba(120,40,65,.09),0 8px 20px -10px rgba(120,40,65,.35)}
.pill svg{width:16px;height:16px}`,
  );
}
