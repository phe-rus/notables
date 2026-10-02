/**
 * Pages for the example manga and comic, drawn as SVG so they're crisp at
 * any size and weigh almost nothing. Each page is panels of simple scenes
 * with speech bubbles.
 */

/** Ids inside SVGs must be unique wherever pages end up side by side. */
let uid = 0;
const nextId = (prefix: string) => `${prefix}${++uid}`;

const W = 800;
const H = 1200;
const GUTTER = 22;

interface Panel {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Drawing inside the panel, in panel coordinates. */
  scene: (w: number, h: number) => string;
  bubbles?: Bubble[];
}

interface Bubble {
  x: number;
  y: number;
  lines: string[];
  /** Where the tail points, in panel coordinates. */
  tail?: [number, number];
  shout?: boolean;
}

interface Palette {
  paper: string;
  ink: string;
  font: string;
}

const escapeText = (text: string) =>
  text.replace(/[&<>]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[char] ?? char);

function bubble(b: Bubble, palette: Palette): string {
  const width = Math.max(...b.lines.map((line) => line.length)) * 13 + 44;
  const height = b.lines.length * 26 + 28;
  const tail = b.tail
    ? `<path d="M${b.x - 14} ${b.y + height / 2 - 6} L${b.tail[0]} ${b.tail[1]} L${b.x + 14} ${b.y + height / 2 - 6}Z" fill="#fff" stroke="${palette.ink}" stroke-width="3" stroke-linejoin="round"/>`
    : "";
  const shape = b.shout
    ? `<polygon points="${spikes(b.x, b.y, width / 2 + 10, height / 2 + 10)}" fill="#fff" stroke="${palette.ink}" stroke-width="3"/>`
    : `<ellipse cx="${b.x}" cy="${b.y}" rx="${width / 2}" ry="${height / 2}" fill="#fff" stroke="${palette.ink}" stroke-width="3"/>`;
  const text = b.lines
    .map(
      (line, index) =>
        `<text x="${b.x}" y="${b.y - ((b.lines.length - 1) * 26) / 2 + index * 26 + 8}" text-anchor="middle" font-family="${palette.font}" font-size="22" font-weight="${b.shout ? 800 : 600}" fill="${palette.ink}">${escapeText(line)}</text>`,
    )
    .join("");
  return tail + shape + text;
}

function spikes(cx: number, cy: number, rx: number, ry: number): string {
  const points: string[] = [];
  for (let index = 0; index < 28; index++) {
    const angle = (index / 28) * Math.PI * 2;
    const reach = index % 2 === 0 ? 1.12 : 0.9;
    points.push(`${cx + Math.cos(angle) * rx * reach},${cy + Math.sin(angle) * ry * reach}`);
  }
  return points.join(" ");
}

function page(panels: Panel[], palette: Palette, folio: number): string {
  const body = panels
    .map((panel) => {
      const id = nextId("panel");
      return `<clipPath id="${id}"><rect width="${panel.w}" height="${panel.h}"/></clipPath>
<g transform="translate(${panel.x} ${panel.y})"><g clip-path="url(#${id})">${panel.scene(panel.w, panel.h)}</g>
<rect width="${panel.w}" height="${panel.h}" fill="none" stroke="${palette.ink}" stroke-width="5"/>
${(panel.bubbles ?? []).map((b) => bubble(b, palette)).join("")}</g>`;
    })
    .join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<rect width="${W}" height="${H}" fill="${palette.paper}"/>${body}
<text x="${W / 2}" y="${H - 14}" text-anchor="middle" font-family="${palette.font}" font-size="16" fill="${palette.ink}" opacity="0.5">${folio}</text></svg>`;
}

/* Panel grids, inside a 40px margin. */
const M = 40;
const inner = W - M * 2;
const tall = H - M * 2 - 20;
const row = (y: number, h: number, widths: number[]): Array<Omit<Panel, "scene">> => {
  const total = widths.reduce((sum, w) => sum + w, 0);
  let x = M;
  return widths.map((w) => {
    const width = ((inner - GUTTER * (widths.length - 1)) * w) / total;
    const panel = { x, y, w: width, h };
    x += width + GUTTER;
    return panel;
  });
};

/* ——— Manga: ink, screentone, right to left ——— */

const ink: Palette = {
  paper: "#fbfaf6",
  ink: "#141414",
  font: "'Comic Neue', 'Trebuchet MS', sans-serif",
};

const tone = (w: number, h: number, opacity = 0.18) => {
  const id = nextId("dots");
  return `<defs><pattern id="${id}" width="8" height="8" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="1.6" fill="#141414"/></pattern></defs><rect width="${w}" height="${h}" fill="url(#${id})" opacity="${opacity}"/>`;
};

const sea = (w: number, h: number, top: number) =>
  Array.from({ length: 7 }, (_, index) => {
    const y = top + index * ((h - top) / 7);
    return `<path d="M0 ${y} ${Array.from({ length: 8 }, (_, k) => `Q${(k + 0.5) * (w / 8)} ${y - 10} ${(k + 1) * (w / 8)} ${y}`).join(" ")}" fill="none" stroke="#141414" stroke-width="${3 - index * 0.3}"/>`;
  }).join("");

const moon = (x: number, y: number, r: number) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="#fbfaf6" stroke="#141414" stroke-width="3"/><circle cx="${x + r * 0.35}" cy="${y - r * 0.2}" r="${r * 0.18}" fill="#141414" opacity="0.12"/>`;

const figure = (x: number, y: number, s: number, flip = false) =>
  `<g transform="translate(${x} ${y}) scale(${flip ? -s : s} ${s})" fill="#141414"><circle cx="0" cy="-118" r="22"/><path d="M-26 -92 Q0 -102 26 -92 L34 -10 L14 -10 L10 60 L-10 60 L-14 -10 L-34 -10Z"/><path d="M-24 -70 L-58 -20" stroke="#141414" stroke-width="12" stroke-linecap="round"/><path d="M24 -70 L46 -40 L70 -60" stroke="#141414" stroke-width="12" stroke-linecap="round" fill="none"/></g>`;

const lighthouse = (x: number, base: number, s: number) =>
  `<g transform="translate(${x} ${base}) scale(${s})"><path d="M-40 0 L-26 -260 L26 -260 L40 0Z" fill="#fbfaf6" stroke="#141414" stroke-width="4"/><path d="M-36 -60 L36 -60 M-32 -130 L32 -130 M-29 -200 L29 -200" stroke="#141414" stroke-width="10"/><rect x="-30" y="-310" width="60" height="50" fill="#fbfaf6" stroke="#141414" stroke-width="4"/><path d="M-36 -310 L0 -350 L36 -310Z" fill="#141414"/></g>`;

const beams = (x: number, y: number, w: number) =>
  `<path d="M${x} ${y} L${x - w} ${y - 90} L${x - w} ${y + 60}Z" fill="#141414" opacity="0.08"/><path d="M${x} ${y} L${x + w} ${y - 70} L${x + w} ${y + 80}Z" fill="#141414" opacity="0.08"/>`;

const speedLines = (w: number, h: number) =>
  Array.from({ length: 40 }, (_, index) => {
    const angle = (index / 40) * Math.PI * 2;
    const r = Math.max(w, h);
    return `<path d="M${w / 2 + Math.cos(angle) * r * 0.22} ${h / 2 + Math.sin(angle) * r * 0.22} L${w / 2 + Math.cos(angle) * r} ${h / 2 + Math.sin(angle) * r}" stroke="#141414" stroke-width="${1 + (index % 3)}"/>`;
  }).join("");

const rain = (w: number, h: number) =>
  Array.from({ length: 60 }, (_, index) => {
    const x = (index * 97) % w;
    const y = (index * 53) % h;
    return `<path d="M${x} ${y} l-10 30" stroke="#141414" stroke-width="2" opacity="0.5"/>`;
  }).join("");

/** Pages are listed in reading order; panels on each page read right to left. */
export function mangaPages(chapter: 1 | 2): string[] {
  if (chapter === 1) {
    const [a, b] = row(M, 420, [3, 2]) as [Omit<Panel, "scene">, Omit<Panel, "scene">];
    const [c] = row(M + 442, tall - 442, [1]) as [Omit<Panel, "scene">];
    const p1 = page(
      [
        {
          ...b,
          scene: (w, h) => tone(w, h, 0.25) + moon(w * 0.55, h * 0.3, 46) + sea(w, h, h * 0.62),
          bubbles: [{ x: b.w / 2, y: 70, lines: ["The tide comes", "in at midnight."] }],
        },
        {
          ...a,
          scene: (w, h) => tone(w, h, 0.12) + lighthouse(w * 0.5, h, 1.05) + sea(w, h, h * 0.86),
        },
        {
          ...c,
          scene: (w, h) =>
            tone(w, h, 0.08) +
            beams(w * 0.7, h * 0.25, 260) +
            lighthouse(w * 0.7, h * 0.86, 0.9) +
            sea(w, h, h * 0.82) +
            figure(w * 0.24, h * 0.8, 1.2),
          bubbles: [
            { x: 230, y: 90, lines: ["Nobody has lit", "that lamp in years."], tail: [180, 270] },
          ],
        },
      ],
      ink,
      1,
    );
    const rows = [row(M, 360, [1, 1]), row(M + 382, 360, [1]), row(M + 764, tall - 764, [2, 3])];
    const [d, e] = rows[0] as [Omit<Panel, "scene">, Omit<Panel, "scene">];
    const [f] = rows[1] as [Omit<Panel, "scene">];
    const [g, h2] = rows[2] as [Omit<Panel, "scene">, Omit<Panel, "scene">];
    const p2 = page(
      [
        {
          ...e,
          scene: (w, h) => tone(w, h, 0.2) + figure(w * 0.5, h * 0.92, 1.4),
          bubbles: [{ x: e.w / 2, y: 60, lines: ["Mika?"], tail: [e.w / 2, 150] }],
        },
        {
          ...d,
          scene: (w, h) => tone(w, h, 0.1) + figure(w * 0.5, h * 0.92, 1.4, true),
          bubbles: [{ x: d.w / 2, y: 60, lines: ["Look. Up there."], tail: [d.w / 2 + 20, 150] }],
        },
        {
          ...f,
          scene: (w, h) =>
            speedLines(w, h) +
            `<circle cx="${w / 2}" cy="${h / 2}" r="54" fill="#fbfaf6" stroke="#141414" stroke-width="5"/>`,
          bubbles: [{ x: f.w / 2, y: f.h - 60, lines: ["THE LAMP IS ON!"], shout: true }],
        },
        {
          ...h2,
          scene: (w, h) =>
            rain(w, h) + figure(w * 0.3, h * 0.94, 1.1) + figure(w * 0.62, h * 0.94, 1.1, true),
        },
        {
          ...g,
          scene: (w, h) => tone(w, h, 0.3) + lighthouse(w * 0.5, h, 0.7),
          bubbles: [{ x: g.w / 2, y: 54, lines: ["Then someone", "is inside."] }],
        },
      ],
      ink,
      2,
    );
    return [p1, p2];
  }
  const [a] = row(M, 520, [1]) as [Omit<Panel, "scene">];
  const [b, c] = row(M + 542, tall - 542, [1, 1]) as [Omit<Panel, "scene">, Omit<Panel, "scene">];
  return [
    page(
      [
        {
          ...a,
          scene: (w, h) =>
            tone(w, h, 0.15) +
            `<path d="M0 ${h} L${w * 0.5} ${h * 0.2} L${w} ${h}Z" fill="#fbfaf6" stroke="#141414" stroke-width="4"/>` +
            `<path d="M${w * 0.5} ${h * 0.2} v${h * 0.8}" stroke="#141414" stroke-width="2"/>` +
            figure(w * 0.5, h * 0.95, 1.3),
          bubbles: [{ x: a.w * 0.5, y: 64, lines: ["One hundred and twelve steps."] }],
        },
        {
          ...c,
          scene: (w, h) =>
            tone(w, h, 0.22) +
            `<circle cx="${w / 2}" cy="${h * 0.45}" r="90" fill="#fbfaf6" stroke="#141414" stroke-width="6"/><circle cx="${w / 2}" cy="${h * 0.45}" r="40" fill="#141414" opacity="0.15"/>`,
          bubbles: [{ x: c.w / 2, y: c.h - 70, lines: ["Still warm."] }],
        },
        {
          ...b,
          scene: (w, h) => figure(w * 0.5, h * 0.95, 1.5, true),
          bubbles: [
            { x: b.w / 2, y: 64, lines: ["Whoever lit it", "just left."], tail: [b.w / 2, 170] },
          ],
        },
      ],
      ink,
      3,
    ),
  ];
}

/* ——— Comic: flat colour, left to right ——— */

const colour: Palette = {
  paper: "#fff8ec",
  ink: "#2b2118",
  font: "'Comic Neue', 'Trebuchet MS', sans-serif",
};

const sky = (w: number, h: number, top: string, bottom: string) => {
  const id = nextId("sky");
  return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#${id})"/>`;
};

const hill = (w: number, h: number, colourFill: string) =>
  `<path d="M0 ${h * 0.75} Q${w * 0.3} ${h * 0.55} ${w * 0.6} ${h * 0.72} T${w} ${h * 0.68} V${h} H0Z" fill="${colourFill}"/>`;

const pip = (x: number, y: number, s: number, wave = false) =>
  `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="0" rx="46" ry="40" fill="#f2a541" stroke="#2b2118" stroke-width="4"/><circle cx="-14" cy="-8" r="6" fill="#2b2118"/><circle cx="14" cy="-8" r="6" fill="#2b2118"/><path d="M-12 12 Q0 22 12 12" fill="none" stroke="#2b2118" stroke-width="4" stroke-linecap="round"/><path d="M-30 -30 L-38 -60 L-14 -38Z M30 -30 L38 -60 L14 -38Z" fill="#f2a541" stroke="#2b2118" stroke-width="4" stroke-linejoin="round"/>${wave ? `<path d="M44 0 Q70 -30 60 -54" fill="none" stroke="#2b2118" stroke-width="6" stroke-linecap="round"/>` : ""}</g>`;

const lamp = (x: number, y: number, s: number, lit: boolean) =>
  `<g transform="translate(${x} ${y}) scale(${s})">${lit ? `<circle cx="0" cy="-40" r="70" fill="#ffd166" opacity="0.45"/>` : ""}<rect x="-26" y="-70" width="52" height="60" rx="10" fill="${lit ? "#ffd166" : "#d9d2c3"}" stroke="#2b2118" stroke-width="4"/><path d="M-34 -70 L0 -100 L34 -70Z" fill="#c8553d" stroke="#2b2118" stroke-width="4" stroke-linejoin="round"/><rect x="-6" y="-10" width="12" height="60" fill="#2b2118"/></g>`;

export function comicPages(): string[] {
  const [a, b] = row(M, 480, [1, 1]) as [Omit<Panel, "scene">, Omit<Panel, "scene">];
  const [c] = row(M + 502, tall - 502, [1]) as [Omit<Panel, "scene">];
  const first = page(
    [
      {
        ...a,
        scene: (w, h) =>
          sky(w, h, "#9ad1d4", "#e8f4f2") +
          hill(w, h, "#7cb518") +
          pip(w * 0.5, h * 0.66, 1.2, true),
        bubbles: [{ x: a.w / 2, y: 66, lines: ["Morning,", "everyone!"], tail: [a.w / 2, 200] }],
      },
      {
        ...b,
        scene: (w, h) =>
          sky(w, h, "#9ad1d4", "#e8f4f2") +
          hill(w, h, "#5c9d18") +
          lamp(w * 0.5, h * 0.7, 1.4, false),
        bubbles: [{ x: b.w / 2, y: 66, lines: ["The village lamp", "went out."] }],
      },
      {
        ...c,
        scene: (w, h) =>
          sky(w, h, "#3d5a80", "#98c1d9") +
          hill(w, h, "#2f4858") +
          lamp(w * 0.72, h * 0.78, 1.6, false) +
          pip(w * 0.28, h * 0.8, 1.4),
        bubbles: [
          {
            x: c.w * 0.3,
            y: 80,
            lines: ["I'll find a new spark", "before dark. Promise."],
            tail: [c.w * 0.28, c.h * 0.62],
          },
        ],
      },
    ],
    colour,
    1,
  );
  const [d] = row(M, 520, [1]) as [Omit<Panel, "scene">];
  const [e, f] = row(M + 542, tall - 542, [1, 1]) as [Omit<Panel, "scene">, Omit<Panel, "scene">];
  const second = page(
    [
      {
        ...d,
        scene: (w, h) =>
          sky(w, h, "#22223b", "#4a4e69") +
          Array.from(
            { length: 30 },
            (_, index) =>
              `<circle cx="${(index * 131) % w}" cy="${(index * 71) % (h * 0.6)}" r="${1 + (index % 3)}" fill="#fff"/>`,
          ).join("") +
          hill(w, h, "#1b1b2f") +
          `<circle cx="${w * 0.7}" cy="${h * 0.62}" r="10" fill="#ffd166"/><circle cx="${w * 0.7}" cy="${h * 0.62}" r="26" fill="#ffd166" opacity="0.3"/>` +
          pip(w * 0.3, h * 0.82, 1.1),
        bubbles: [{ x: d.w * 0.3, y: 74, lines: ["A firefly!"], tail: [d.w * 0.3, d.h * 0.66] }],
      },
      {
        ...e,
        scene: (w, h) =>
          sky(w, h, "#22223b", "#4a4e69") +
          pip(w * 0.5, h * 0.62, 1.2) +
          `<circle cx="${w * 0.5}" cy="${h * 0.28}" r="10" fill="#ffd166"/>`,
        bubbles: [{ x: e.w / 2, y: e.h - 70, lines: ["Would you", "light our lamp?"] }],
      },
      {
        ...f,
        scene: (w, h) =>
          sky(w, h, "#22223b", "#4a4e69") +
          hill(w, h, "#1b1b2f") +
          lamp(w * 0.5, h * 0.8, 1.5, true),
        bubbles: [{ x: f.w / 2, y: 66, lines: ["Just for tonight."] }],
      },
    ],
    colour,
    2,
  );
  return [first, second];
}

/** A simple painted cover, used before the first page. */
export function coverArt(title: string, subtitle: string, palette: "ink" | "colour"): string {
  const dark = palette === "ink";
  const background = dark ? "#141414" : "#f2a541";
  const fg = dark ? "#fbfaf6" : "#2b2118";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<rect width="${W}" height="${H}" fill="${background}"/>
${
  dark
    ? `<g opacity="0.9">${moon(560, 300, 120)}</g><g transform="translate(0 260)">${lighthouse(
        260,
        900,
        1.6,
      )
        .replace(/#fbfaf6/g, "#141414")
        .replace(/#141414"/g, '#fbfaf6"')}</g>`
    : `${hill(W, H, "#7cb518")}${pip(W / 2, 760, 3.2, true)}`
}
<text x="60" y="140" font-family="'Trebuchet MS', sans-serif" font-size="92" font-weight="800" fill="${fg}">${escapeText(title)}</text>
<text x="64" y="200" font-family="'Trebuchet MS', sans-serif" font-size="34" fill="${fg}" opacity="0.8">${escapeText(subtitle)}</text></svg>`;
}
