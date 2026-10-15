import { mediaReferences } from "@notables/sync";
import * as Y from "yjs";
import { getPersistence, listDocuments } from "../../../platform/storage/document-storage";
import { deleteMedia, listMedia, loadMedia } from "../../../platform/storage/media-store";
import { getLibrary } from "../../library/store/library-store";

const STATE_KEY = "notables:media-sweep";
const DAY = 24 * 60 * 60 * 1000;
/** A file must stay unused this long, across sweeps, before it's deleted. */
const GRACE = 7 * DAY;
/** `media:<id>` anywhere in text: settings, drawing scenes. */
const REFERENCE = /media:([\w-]{1,64})/g;

interface SweepState {
  lastRun: number;
  /** Unused files, by id, with when a sweep first found them unused. */
  unused: Record<string, number>;
}

function readState(): SweepState {
  try {
    const saved = JSON.parse(localStorage.getItem(STATE_KEY) ?? "null") as SweepState | null;
    if (saved && typeof saved.lastRun === "number" && saved.unused) return saved;
  } catch {
    // Start afresh.
  }
  return { lastRun: 0, unused: {} };
}

function writeState(state: SweepState) {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    // Without storage, the grace period starts again next time: nothing is lost.
  }
}

const referencesIn = (text: string, into: Set<string>) => {
  for (const match of text.matchAll(REFERENCE)) if (match[1]) into.add(match[1]);
};

/**
 * Every media id something on this device still uses: every stored
 * document (notes, Recently Deleted included, and the library with its
 * book covers and invoices), settings kept on the device (a business
 * logo), and the images placed inside drawing scenes.
 */
export async function usedMedia(types: ReadonlyMap<string, string>): Promise<Set<string>> {
  const used = new Set<string>();
  const names = new Set(await listDocuments().catch(() => null));
  names.add("library");
  for (const entry of getLibrary().getSnapshot()) names.add(entry.id);
  for (const name of names) {
    const doc = new Y.Doc();
    const binding = await getPersistence().bind(name, doc);
    for (const id of mediaReferences(doc)) used.add(id);
    binding.destroy();
    doc.destroy();
  }
  try {
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      const value = key && key !== STATE_KEY ? localStorage.getItem(key) : null;
      if (value) referencesIn(value, used);
    }
  } catch {
    // No settings to read.
  }
  // Drawing scenes are files that refer to more files; follow them.
  const queue = [...used];
  for (let index = 0; index < queue.length; index++) {
    const id = queue[index] as string;
    if (types.get(id) !== "application/json") continue;
    const scene = await loadMedia(id).catch(() => null);
    if (!scene) continue;
    const found = new Set<string>();
    referencesIn(await scene.text(), found);
    for (const each of found) {
      if (!used.has(each)) {
        used.add(each);
        queue.push(each);
      }
    }
  }
  return used;
}

/**
 * Deletes media files nothing uses any more, such as a photo taken out of
 * a note or the old picture of a redrawn drawing. A file is only deleted
 * once sweeps have found it unused for a week, so undo, Recently Deleted
 * and devices still catching up never lose a file. Runs at most daily.
 */
export async function sweepMedia(now = Date.now()): Promise<number> {
  const state = readState();
  if (now - state.lastRun < DAY) return 0;
  const stored = await listMedia();
  const types = new Map(stored.map((entry) => [entry.id, entry.type]));
  const used = await usedMedia(types);
  const plan = planSweep(
    stored.map((entry) => entry.id),
    used,
    state.unused,
    now,
  );
  for (const id of plan.remove) await deleteMedia(id).catch(() => {});
  writeState({ lastRun: now, unused: plan.unused });
  return plan.remove.length;
}

/**
 * Which stored files may go now: those unused in this sweep and already
 * found unused at least a week ago. The rest that are unused keep the date
 * they were first found so; a file used again is forgotten.
 */
export function planSweep(
  stored: readonly string[],
  used: ReadonlySet<string>,
  unusedSince: Readonly<Record<string, number>>,
  now: number,
): { remove: string[]; unused: Record<string, number> } {
  const remove: string[] = [];
  const unused: Record<string, number> = {};
  for (const id of stored) {
    if (used.has(id)) continue;
    const since = unusedSince[id] ?? now;
    if (now - since >= GRACE) remove.push(id);
    else unused[id] = since;
  }
  return { remove, unused };
}
