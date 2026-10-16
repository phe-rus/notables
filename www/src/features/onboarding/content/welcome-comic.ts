/**
 * The example comic, "Pip & the Lamp": one full colour page and its cover,
 * drawn as SVG so they stay crisp at any size. Pip, the village cat, finds
 * fireflies to light the lamp again.
 */

const INK = "#2b2220";
/** Comic lettering, with hand-lettered system fonts if the face is missing. */
const LETTERING = "Lettering, 'Patrick Hand', 'Chalkboard SE', 'Comic Sans MS', cursive";

const letteringFace = (lettering?: string) =>
  lettering ? `<style>@font-face{font-family:Lettering;src:url(${lettering})}</style>` : "";

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

let ids = 0;
const id = (prefix: string) => `${prefix}${++ids}`;

function panel(box: Box, body: string): string {
  const clip = id("clip");
  return `<clipPath id="${clip}"><rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="6"/></clipPath>
<g clip-path="url(#${clip})"><g transform="translate(${box.x} ${box.y})">${body}</g></g>
<rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="6" fill="none" stroke="${INK}" stroke-width="5"/>`;
}

function sky(w: number, h: number, stops: string[]): string {
  const grad = id("sky");
  const parts = stops
    .map((color, i) => `<stop offset="${i / (stops.length - 1)}" stop-color="${color}"/>`)
    .join("");
  return `<linearGradient id="${grad}" x1="0" y1="0" x2="0" y2="1">${parts}</linearGradient><rect width="${w}" height="${h}" fill="url(#${grad})"/>`;
}

function glow(x: number, y: number, r: number, color: string, strength = 0.85): string {
  const grad = id("glow");
  return `<radialGradient id="${grad}"><stop offset="0" stop-color="${color}" stop-opacity="${strength}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient><circle cx="${x}" cy="${y}" r="${r}" fill="url(#${grad})"/>`;
}

function hill(w: number, h: number, top: number, bulge: number, color: string, shift = 0): string {
  return `<path d="M-10 ${top + 20} C ${w * 0.25 + shift} ${top - bulge}, ${w * 0.6 + shift} ${top + bulge * 0.6}, ${w + 10} ${top - bulge * 0.4} L ${w + 10} ${h + 10} L -10 ${h + 10} Z" fill="${color}" stroke="${INK}" stroke-width="3"/>`;
}

function house(x: number, y: number, s: number, wall: string, roof: string, lit: boolean): string {
  const window = lit ? "#ffd36b" : "#5b6b86";
  return `<g transform="translate(${x} ${y}) scale(${s})">
${lit ? glow(30, 34, 46, "#ffc94d", 0.35) : ""}
<rect x="0" y="20" width="60" height="44" fill="${wall}" stroke="${INK}" stroke-width="3"/>
<path d="M-8 22 L30 -10 L68 22 Z" fill="${roof}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
<rect x="10" y="32" width="14" height="14" fill="${window}" stroke="${INK}" stroke-width="2.5"/>
<rect x="36" y="38" width="14" height="26" fill="#6b4a3a" stroke="${INK}" stroke-width="2.5"/>
</g>`;
}

function lampPost(x: number, base: number, height: number, lit: boolean): string {
  const top = base - height;
  return `<g>
${lit ? glow(x, top - 28, 150, "#ffd36b", 0.9) + glow(x, top - 28, 60, "#fff4c2", 1) : ""}
<rect x="${x - 7}" y="${top}" width="14" height="${height}" fill="#3a2f2b" stroke="${INK}" stroke-width="3"/>
<rect x="${x - 20}" y="${base - 12}" width="40" height="12" rx="3" fill="#3a2f2b" stroke="${INK}" stroke-width="3"/>
<rect x="${x - 22}" y="${top - 52}" width="44" height="48" rx="6" fill="${lit ? "#fff1b8" : "#cfd6df"}" stroke="${INK}" stroke-width="4"/>
<path d="M${x - 30} ${top - 50} L${x} ${top - 74} L${x + 30} ${top - 50} Z" fill="#c4553f" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
<line x1="${x}" y1="${top - 52}" x2="${x}" y2="${top - 4}" stroke="${INK}" stroke-width="2" opacity="0.5"/>
</g>`;
}

/** Pip, the village cat. `look` turns the eyes; `jar` gives Pip a lantern jar. */
function pip(
  x: number,
  y: number,
  s: number,
  options: { jar?: "empty" | "lit"; mouth?: "smile" | "open" } = {},
): string {
  const mouth =
    options.mouth === "open"
      ? `<path d="M-12 22 Q0 40 12 22 Z" fill="#8a2f3b" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`
      : `<path d="M-12 22 Q-6 30 0 22 Q6 30 12 22" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
  const jar = options.jar
    ? `<g transform="translate(58 70)">
${options.jar === "lit" ? glow(0, 6, 70, "#fff08a", 0.95) : ""}
<rect x="-20" y="-24" width="40" height="52" rx="10" fill="${options.jar === "lit" ? "#fff6c4" : "#e7f1f4"}" fill-opacity="0.85" stroke="${INK}" stroke-width="3.5"/>
<rect x="-16" y="-32" width="32" height="10" rx="3" fill="#b6744c" stroke="${INK}" stroke-width="3"/>
${options.jar === "lit" ? `<circle cx="-5" cy="6" r="5" fill="#ffe34d"/><circle cx="8" cy="-4" r="4" fill="#ffe34d"/><circle cx="4" cy="14" r="3.5" fill="#ffe34d"/>` : ""}
</g>`
    : "";
  return `<g transform="translate(${x} ${y}) scale(${s})">
<path d="M48 96 C 110 96, 120 30, 92 10" fill="none" stroke="${INK}" stroke-width="18" stroke-linecap="round"/>
<path d="M48 96 C 110 96, 120 30, 92 10" fill="none" stroke="#f0913e" stroke-width="11" stroke-linecap="round"/>
<ellipse cx="0" cy="92" rx="56" ry="46" fill="#f0913e" stroke="${INK}" stroke-width="4"/>
<ellipse cx="0" cy="104" rx="30" ry="26" fill="#fde3c4"/>
<path d="M-46 -26 L-40 -78 L-8 -44 Z" fill="#f0913e" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
<path d="M46 -26 L40 -78 L8 -44 Z" fill="#f0913e" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
<path d="M-38 -36 L-36 -62 L-18 -44 Z" fill="#f7a7b0"/>
<path d="M38 -36 L36 -62 L18 -44 Z" fill="#f7a7b0"/>
<ellipse cx="0" cy="0" rx="58" ry="52" fill="#f0913e" stroke="${INK}" stroke-width="4"/>
<path d="M-10 -50 L-6 -32 M10 -50 L6 -32 M0 -52 L0 -30" stroke="#c9682a" stroke-width="5" stroke-linecap="round"/>
<path d="M-58 4 L-40 6 M-56 18 L-40 14 M58 4 L40 6 M56 18 L40 14" stroke="#c9682a" stroke-width="4" stroke-linecap="round"/>
<ellipse cx="-22" cy="-2" rx="13" ry="16" fill="#fff" stroke="${INK}" stroke-width="3"/>
<ellipse cx="22" cy="-2" rx="13" ry="16" fill="#fff" stroke="${INK}" stroke-width="3"/>
<ellipse cx="-19" cy="1" rx="7.5" ry="10" fill="${INK}"/>
<ellipse cx="25" cy="1" rx="7.5" ry="10" fill="${INK}"/>
<circle cx="-16" cy="-4" r="3" fill="#fff"/><circle cx="28" cy="-4" r="3" fill="#fff"/>
<ellipse cx="-36" cy="18" rx="9" ry="5" fill="#f7a7b0" opacity="0.8"/>
<ellipse cx="36" cy="18" rx="9" ry="5" fill="#f7a7b0" opacity="0.8"/>
<path d="M-6 13 L6 13 L0 20 Z" fill="#d9586a" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
${mouth}
${jar}
<ellipse cx="-26" cy="134" rx="18" ry="10" fill="#f0913e" stroke="${INK}" stroke-width="3.5"/>
<ellipse cx="26" cy="134" rx="18" ry="10" fill="#f0913e" stroke="${INK}" stroke-width="3.5"/>
</g>`;
}

function bubble(x: number, y: number, lines: string[], tail: [number, number], size = 30): string {
  const width = Math.max(...lines.map((line) => line.length)) * size * 0.46 + 52;
  const height = lines.length * size * 1.05 + 30;
  const text = lines
    .map(
      (line, i) =>
        `<text x="${x}" y="${y - ((lines.length - 1) * size * 1.05) / 2 + i * size * 1.05 + size * 0.34}" text-anchor="middle" font-family="${LETTERING}" font-size="${size}" fill="${INK}">${line}</text>`,
    )
    .join("");
  return `<path d="M${x - 16} ${y + height / 2 - 10} Q ${(x + tail[0]) / 2} ${(y + tail[1]) / 2 + 10} ${tail[0]} ${tail[1]} Q ${(x + tail[0]) / 2 + 14} ${(y + tail[1]) / 2} ${x + 16} ${y + height / 2 - 8} Z" fill="#fff" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
<ellipse cx="${x}" cy="${y}" rx="${width / 2}" ry="${height / 2}" fill="#fff" stroke="${INK}" stroke-width="3.5"/>
<ellipse cx="${x}" cy="${y}" rx="${width / 2 - 2}" ry="${height / 2 - 2}" fill="#fff"/>
${text}`;
}

function caption(x: number, y: number, text: string, width: number): string {
  return `<rect x="${x}" y="${y}" width="${width}" height="44" fill="#fff4d6" stroke="${INK}" stroke-width="3"/>
<text x="${x + 16}" y="${y + 30}" font-family="${LETTERING}" font-size="25" fill="${INK}">${text}</text>`;
}

function stars(w: number, h: number, count: number, seed: number): string {
  let value = seed;
  const random = () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
  return Array.from({ length: count }, () => {
    const r = 1.2 + random() * 2.2;
    return `<circle cx="${(random() * w).toFixed(1)}" cy="${(random() * h).toFixed(1)}" r="${r.toFixed(1)}" fill="#fff8de" opacity="${(0.5 + random() * 0.5).toFixed(2)}"/>`;
  }).join("");
}

function fireflies(points: Array<[number, number]>): string {
  return points
    .map(
      ([x, y]) =>
        `${glow(x, y, 26, "#fff27a", 0.8)}<circle cx="${x}" cy="${y}" r="4.5" fill="#fffbd0"/>`,
    )
    .join("");
}

/**
 * The one page of "Pip & the Lamp", 800 by 1200. `lettering` is a font
 * file as a data URL: an SVG shown as an image can't use the app's fonts,
 * so the comic carries its own.
 */
export function pipComicPage(lettering?: string): string {
  const W = 800;
  const H = 1200;
  const a = { x: 34, y: 34, w: 732, h: 380 };
  const b = { x: 34, y: 434, w: 356, h: 360 };
  const c = { x: 410, y: 434, w: 356, h: 360 };
  const d = { x: 34, y: 814, w: 732, h: 352 };

  const dusk = `${sky(a.w, a.h, ["#f6b38a", "#f4cf9c", "#fbe8c4"])}
${glow(560, 250, 160, "#ffd59a", 0.9)}<circle cx="560" cy="250" r="46" fill="#ffcf7a" stroke="${INK}" stroke-width="3"/>
<path d="M60 90 q40 -26 80 0 q30 -18 60 0" fill="none" stroke="#fff6e8" stroke-width="10" stroke-linecap="round" opacity="0.8"/>
<path d="M420 70 q36 -22 72 0 q24 -14 48 0" fill="none" stroke="#fff6e8" stroke-width="9" stroke-linecap="round" opacity="0.7"/>
${hill(a.w, a.h, 270, 70, "#9cc36b", 40)}
${house(70, 230, 1, "#f3e3c8", "#c4553f", true)}${house(170, 250, 0.85, "#e9d2b4", "#8a5a44", true)}${house(560, 262, 0.9, "#f3e3c8", "#a8463a", false)}
${hill(a.w, a.h, 330, 40, "#6fa64f", -60)}
${lampPost(410, 352, 150, false)}
${pip(300, 310, 0.42)}
${caption(18, 18, "Fennel Hill, the night the lamp went out.", 470)}`;

  const closeUp = `${sky(b.w, b.h, ["#f4cf9c", "#f9e6c6"])}
<path d="M0 270 Q180 240 360 280 L360 380 L0 380 Z" fill="#8fbd5f" stroke="${INK}" stroke-width="3"/>
${pip(150, 200, 0.95, { jar: "empty", mouth: "open" })}
${bubble(178, 62, ["I'll find a", "new spark!"], [150, 128], 30)}`;

  const forest = `${sky(c.w, c.h, ["#1f2c4d", "#2d4a5e", "#36614f"])}
${stars(c.w, 150, 26, 7)}
<path d="M-10 130 L40 40 L90 130 Z M60 150 L120 20 L180 150 Z M230 140 L290 30 L350 140 Z" fill="#23413a" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
<path d="M0 290 Q180 250 360 300 L360 370 L0 370 Z" fill="#2e5a3f" stroke="${INK}" stroke-width="3"/>
${fireflies([
  [70, 190],
  [130, 150],
  [250, 120],
  [300, 200],
  [210, 230],
  [90, 250],
])}
${pip(180, 236, 0.62, { jar: "lit", mouth: "smile" })}
<text x="244" y="96" font-family="${LETTERING}" font-size="34" fill="#fff27a" transform="rotate(-8 244 96)">bzzt!</text>`;

  const night = `${sky(d.w, d.h, ["#18233f", "#2f3f6b", "#58507a"])}
${stars(d.w, 200, 60, 11)}
<circle cx="630" cy="70" r="30" fill="#fff4cf"/><circle cx="642" cy="62" r="26" fill="#283660"/>
${hill(d.w, d.h, 270, 50, "#2f5244", 0)}
${house(70, 236, 0.9, "#c9b49a", "#7a3d36", true)}${house(560, 246, 0.85, "#c9b49a", "#5e3a33", true)}
${lampPost(370, 330, 190, true)}
${pip(500, 262, 0.42, { mouth: "smile" })}
<g fill="#1a1a26" stroke="${INK}" stroke-width="2"><circle cx="230" cy="262" r="15"/><path d="M206 334 Q230 196 254 334 Z"/><circle cx="276" cy="270" r="12"/><path d="M257 334 Q276 214 295 334 Z"/></g>
${bubble(600, 140, ["Told you", "I would."], [520, 214], 30)}
${caption(18, 18, "And the lamp shone again.", 330)}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<defs>${letteringFace(lettering)}</defs>
<rect width="${W}" height="${H}" fill="#fffaf0"/>
${panel(a, dusk)}${panel(b, closeUp)}${panel(c, forest)}${panel(d, night)}
</svg>`;
}

/** The cover: Fennel Hill at dusk, with Pip and the lamp, under the title. */
export function pipComicCover(lettering?: string): string {
  const W = 800;
  const H = 1200;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<defs>${letteringFace(lettering)}</defs>
${sky(W, H, ["#f39c7a", "#f6c08f", "#fbe6c2"])}
${glow(560, 760, 300, "#ffd59a", 0.9)}<circle cx="560" cy="760" r="90" fill="#ffcf7a" stroke="${INK}" stroke-width="4"/>
${hill(W, H, 820, 110, "#9cc36b", 60)}
${house(90, 760, 1.5, "#f3e3c8", "#c4553f", true)}${house(600, 800, 1.3, "#e9d2b4", "#8a5a44", true)}
${hill(W, H, 960, 70, "#6fa64f", -80)}
${lampPost(470, 1060, 300, true)}
${pip(280, 900, 1.05, { jar: "lit", mouth: "smile" })}
<text x="400" y="190" text-anchor="middle" font-family="${LETTERING}" font-size="118" fill="${INK}">Pip &amp; the Lamp</text>
<text x="400" y="262" text-anchor="middle" font-family="${LETTERING}" font-size="44" fill="${INK}" opacity="0.75">A short comic</text>
</svg>`;
}
