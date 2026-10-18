/**
 * Makes the store screenshots: `bun run store:screenshots [out-dir] [--only=<set>]`.
 *
 * Needs the standalone web app running (`cd www && VITE_STANDALONE_WEB=1
 * bun run dev`). For each device it opens a fresh library at that size,
 * lets the welcome write its examples, adds the store content
 * (`seed.ts`), captures six screens and composes them with headlines
 * (`frame.ts`). Writes Google Play (1080x1920 and the feature graphic),
 * iPhone 6.1-inch (1179x2556) and iPad landscape (2732x2048) and Play tablet (2560x1440) sets, by
 * default into `.store-screenshots/`.
 */
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { type BrowserContext, chromium, type Page } from "playwright-core";
import { featureGraphic, framePage } from "./frame";
import { type SeedInput, seedStoreContent } from "./seed";
import { routeSketch } from "./sketch";

const ROOT = join(import.meta.dir, "..", "..");
const APP = "http://localhost:3000";
const args = process.argv.slice(2);
/** `--only=google-play` (or another folder name) makes one set. */
/** `--compose-only` redraws the frames from the screens captured last time. */
const composeOnly = args.includes("--compose-only");
const only = args.find((arg) => arg.startsWith("--only="))?.slice(7);
const OUT = args.find((arg) => !arg.startsWith("--")) ?? join(ROOT, ".store-screenshots");
/** A Friday morning, so the calendar's day is full and the clock reads 9:41. */
const DAY = "2026-10-16";

interface Device {
  folder: string;
  viewport: { width: number; height: number };
  scale: number;
  userAgent: string;
  /** The composed image's size in CSS pixels; times `frameScale` gives the store's size. */
  frame: { width: number; height: number; scale: number };
  tablet?: boolean;
}

/** A 6.1-inch phone screen, kept a little short so the app reads large. */
const PHONE = { width: 390, height: 760 };
/** An iPad Pro 11-inch (2360 by 1640) screen, in landscape. */
const TABLET = { width: 1180, height: 820 };

const devices: Device[] = [
  {
    folder: "google-play",
    viewport: PHONE,
    scale: 3,
    userAgent:
      "Mozilla/5.0 (Linux; Android 16; SM-S931B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36",
    frame: { width: 360, height: 640, scale: 3 },
  },
  {
    folder: "google-play-tablet",
    viewport: TABLET,
    scale: 2,
    userAgent:
      "Mozilla/5.0 (Linux; Android 16; SM-X920) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
    // 2560 by 1440, 16:9, for both of Play's tablet slots.
    frame: { width: 1280, height: 720, scale: 2 },
    tablet: true,
  },
  {
    folder: "app-store-iphone",
    viewport: PHONE,
    scale: 3,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
    // 1179 by 2556, the 6.1-inch size.
    frame: { width: 393, height: 852, scale: 3 },
  },
  {
    folder: "app-store-ipad",
    viewport: TABLET,
    scale: 2,
    userAgent:
      "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
    // 2732 by 2048, the size App Store Connect asks for every iPad.
    frame: { width: 1366, height: 1024, scale: 2 },
    tablet: true,
  },
];

interface Shot {
  name: string;
  headline: string;
  accent: string;
  /** Opens the screen; `ids` maps titles to library ids. */
  open: (page: Page, ids: Record<string, string>, device: Device) => Promise<void>;
  /** Phones only: the part of the screen to magnify. */
  callout?: (page: Page) => Promise<{ x: number; y: number; w: number; h: number } | undefined>;
  phoneOnly?: boolean;
}

const shots: Shot[] = [
  {
    name: "1-notes",
    headline: "Anything notable,<br>always with you",
    accent: "note it down, keep it close",
    open: (page) => visit(page, "/"),
  },
  {
    name: "2-note",
    headline: "Make room<br>for your ideas",
    accent: "write it, sketch it, keep it",
    open: (page, ids) => visit(page, `/notes/${ids["Weekend in Jinja"]}`),
  },
  {
    name: "3-reader",
    headline: "Give your words<br>another chapter",
    accent: "your words, from page to page",
    open: async (page, ids) => {
      await visit(page, `/read/${ids["The Lighthouse Keeper"]}`);
      // Past the cover and title page, to the first chapter.
      const chapter = page.getByText("The fog came in at dusk").first();
      for (let turn = 0; turn < 5 && !(await chapter.isVisible()); turn++) {
        await page.keyboard.press("ArrowRight");
        await page.waitForTimeout(1200);
      }
    },
  },
  {
    name: "4-calendar",
    headline: "Put your day<br>on the page",
    accent: "plans, reminders &amp; deadlines",
    open: async (page) => {
      await visit(page, "/calendar");
      // Start the day at 6:30, so the morning fills the screen.
      await page.evaluate(() => {
        const label = [...document.querySelectorAll("*")].find(
          (node) => node.childElementCount === 0 && node.textContent?.trim() === "7 AM",
        );
        let box = label?.parentElement ?? null;
        while (box && box.scrollHeight <= box.clientHeight + 4) box = box.parentElement;
        if (label && box) {
          const offset = label.getBoundingClientRect().top - box.getBoundingClientRect().top;
          box.scrollTop += offset - 34;
        }
      });
    },
  },
  {
    name: "5-invoice",
    headline: "Keep the details<br>that matter",
    accent: "a signed seal and a QR check",
    open: async (page, ids) => {
      await visit(page, `/invoices/${ids["INV-0001"]}`);
      // Narrow screens switch between the form and the preview; wide ones show both.
      const picker = page.locator("button", { hasText: /^\s*Edit\s*$/ }).first();
      if (!(await picker.isVisible())) return;
      await picker.click();
      await page.waitForTimeout(500);
      await page.getByText("Preview", { exact: true }).last().click();
      await page.waitForTimeout(1200);
    },
    callout: (page) =>
      page.evaluate(() => {
        const seal = [...document.querySelectorAll("*")].find(
          (node) =>
            node.childElementCount === 0 &&
            node.textContent?.trim() === "Scan to check this invoice is genuine" &&
            node.getBoundingClientRect().height > 0,
        );
        if (!seal) return undefined;
        const box = seal.getBoundingClientRect();
        return { x: 24, y: box.top - 10, w: window.innerWidth - 48, h: 76 };
      }),
  },
  {
    name: "6-comic",
    headline: "A world of stories,<br>made by you",
    accent: "draw them, then read them",
    open: (page, ids) => visit(page, `/read/${ids["Pip & the Lamp"]}`),
  },
];

async function visit(page: Page, path: string) {
  await page.goto(`${APP}${path}`, { timeout: 180_000 });
  await page.waitForFunction(() => !document.querySelector(".splash-mark"), null, {
    timeout: 180_000,
  });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(1800);
  // No caret, focus ring or hover left on screen.
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.mouse.move(-10, -10);
}

/** Where the dev server serves the editor package, for `seed.ts`. */
function moduleUrls(): SeedInput["urls"] {
  return { pluraliti: `/@fs${join(ROOT, "packages", "pluraliti", "src", "index.ts")}` };
}

async function libraryIds(page: Page): Promise<Record<string, string>> {
  return page.evaluate(async () => {
    const load = (path: string) => import(/* @vite-ignore */ path);
    const [library, books, invoices] = await Promise.all([
      load("/src/features/library/store/library-store.ts"),
      load("/src/features/books/store/book-store.ts"),
      load("/src/features/invoices/store/invoice-store.ts"),
    ]);
    const ids: Record<string, string> = {};
    for (const entry of library.getLibrary().getSnapshot()) ids[entry.title] = entry.id;
    for (const book of books.getBookStore().getSnapshot()) ids[book.title] = book.id;
    for (const bill of invoices.getInvoiceStore().getSnapshot()) ids[bill.number] = bill.id;
    return ids;
  });
}

async function openLibrary(device: Device): Promise<BrowserContext> {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: device.viewport,
    deviceScaleFactor: device.scale,
    isMobile: true,
    hasTouch: true,
    userAgent: device.userAgent,
    timezoneId: "Africa/Kampala",
    locale: "en-US",
    colorScheme: "light",
  });
  // Only dates move to the screenshot morning: Playwright's clock also fakes
  // the timers and animation frames the app's motion runs on, and freezes it.
  await context.addInitScript((target: number) => {
    const RealDate = Date;
    const offset = target - RealDate.now();
    class ShiftedDate extends RealDate {
      constructor(...args: ConstructorParameters<DateConstructor>) {
        if (args.length === 0) super(RealDate.now() + offset);
        else super(...args);
      }
      static override now() {
        return RealDate.now() + offset;
      }
    }
    globalThis.Date = ShiftedDate as DateConstructor;
  }, new Date(`${DAY}T09:41:00+03:00`).getTime());
  await context.addInitScript(() => localStorage.setItem("notables:setup-done", "2026-10-09"));
  return context;
}

async function capture(device: Device, input: Omit<SeedInput, "urls">, urls: SeedInput["urls"]) {
  const context = await openLibrary(device);
  const page = await context.newPage();
  page.on("pageerror", (error) => console.warn(`  page error: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") console.warn(`  console: ${message.text().slice(0, 300)}`);
  });
  await visit(page, "/");
  // The welcome writes its examples on the first visit.
  await page.waitForFunction(() => localStorage.getItem("notables:welcomed-shelf") !== null);
  await page.waitForTimeout(2500);
  console.log(`  ${await page.evaluate(seedStoreContent, { ...input, urls })}`);
  await page.waitForTimeout(1500);
  const ids = await libraryIds(page);

  const results: Array<{
    shot: Shot;
    png: Uint8Array;
    callout?: Awaited<ReturnType<NonNullable<Shot["callout"]>>>;
  }> = [];
  for (const shot of shots) {
    await shot.open(page, ids, device);
    await page.waitForTimeout(700);
    const callout = !device.tablet && shot.callout ? await shot.callout(page) : undefined;
    results.push({ shot, png: await page.screenshot(), callout });
    console.log(`  ${shot.name}`);
  }
  await context.browser()?.close();
  return results;
}

/** The screens and callouts the last full run saved in `raw/`. */
async function previousCapture(folder: string) {
  const callouts = await Bun.file(join(folder, "raw", "callouts.json"))
    .json()
    .catch(() => ({}));
  return Promise.all(
    shots.map(async (shot) => ({
      shot,
      png: new Uint8Array(await Bun.file(join(folder, "raw", `${shot.name}.png`)).arrayBuffer()),
      callout: callouts[shot.name],
    })),
  );
}

async function render(
  html: string,
  size: { width: number; height: number; scale: number },
  path: string,
) {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: size.width, height: size.height },
    deviceScaleFactor: size.scale,
  });
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => !document.querySelector("[data-pending]"));
  await page.screenshot({
    path,
    type: path.endsWith(".jpg") ? "jpeg" : "png",
    quality: path.endsWith(".jpg") ? 92 : undefined,
  });
  await browser.close();
}

async function main() {
  const up = await fetch(APP)
    .then((response) => response.ok)
    .catch(() => false);
  if (!up && !composeOnly) {
    console.error("Start the app first: cd www && VITE_STANDALONE_WEB=1 bun run dev");
    process.exit(1);
  }
  const input = { sketch: routeSketch(), day: DAY };
  const urls = moduleUrls();

  for (const device of devices.filter((item) => !only || item.folder === only)) {
    console.log(device.folder);
    const folder = join(OUT, device.folder);
    await mkdir(join(folder, "raw"), { recursive: true });
    const captured = composeOnly
      ? await previousCapture(folder)
      : await capture(device, input, urls);
    await Bun.write(
      join(folder, "raw", "callouts.json"),
      JSON.stringify(Object.fromEntries(captured.map((item) => [item.shot.name, item.callout]))),
    );
    for (const { shot, png, callout } of captured) {
      await Bun.write(join(folder, "raw", `${shot.name}.png`), png);
      const html = await framePage({
        width: device.frame.width,
        height: device.frame.height,
        headline: shot.headline,
        accent: shot.accent,
        screenshot: png,
        viewport: device.viewport,
        tablet: device.tablet,
        android: device.folder.startsWith("google-play"),
        callout,
      });
      await render(
        html,
        device.frame,
        join(folder, `${device.folder.split("-").at(-1)}-${shot.name}.png`),
      );
    }
    if (device.folder === "google-play") {
      const icon = new Uint8Array(
        await Bun.file(
          join(ROOT, "www", "src-tauri", "icons", "source", "app-icon.png"),
        ).arrayBuffer(),
      );
      const pick = (name: string) =>
        captured.find((item) => item.shot.name === name)?.png ?? new Uint8Array();
      const html = await featureGraphic(
        icon,
        [pick("6-comic"), pick("2-note"), pick("4-calendar")],
        device.viewport,
      );
      await render(
        html,
        { width: 1024, height: 500, scale: 1 },
        join(folder, "feature-graphic-1024x500.jpg"),
      );
    }
  }
  console.log(`Done: ${OUT}`);
}

await main();
