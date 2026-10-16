import * as Y from "yjs";
import { inBrowserSession } from "../session/browser-session-store";
import { getPersistence } from "../storage/document-storage";

/**
 * Settings that follow the person (spec 0005, AC-16): one Yjs document,
 * "settings", stored like the library, so a browser linked to a phone reads
 * and changes the phone's settings live, and linked devices will merge them
 * like any edit. Each setting lives under its old localStorage key.
 *
 * Apps (and the standalone web) also keep each value in localStorage, so
 * reads at startup and the pre-paint appearance script never wait, and the
 * first run moves those values into the document. A linked browser keeps
 * nothing: until the phone answers it shows the defaults.
 */

/** How a value is kept in localStorage: JSON, or the plain text older builds wrote. */
type Format = "json" | "text";

interface Registered {
  format: Format;
  notify: () => void;
}

const doc = new Y.Doc();
const values = doc.getMap<unknown>("values");
const registry = new Map<string, Registered>();
let started = false;

const keepsLocalCopy = () => !inBrowserSession();

function readLocal(key: string, format: Format): unknown {
  try {
    const stored = localStorage.getItem(key);
    if (stored === null) return undefined;
    return format === "text" ? stored : JSON.parse(stored);
  } catch {
    return undefined;
  }
}

function writeLocal(key: string, format: Format, value: unknown) {
  try {
    if (value === undefined || value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, format === "text" ? String(value) : JSON.stringify(value));
  } catch {
    // Private windows may refuse storage; the document still has it.
  }
}

/** Opens the document once, after mount: the server prerender has no storage. */
function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  values.observe((event) => {
    for (const key of event.keysChanged) {
      const setting = registry.get(key);
      if (!setting) continue;
      if (keepsLocalCopy()) writeLocal(key, setting.format, values.get(key));
      setting.notify();
    }
  });
  // Another window of the app (the desktop widget) changed a setting.
  window.addEventListener("storage", (event) => {
    const setting = event.key ? registry.get(event.key) : undefined;
    if (!event.key || !setting || !keepsLocalCopy()) return;
    const value = readLocal(event.key, setting.format);
    if (value === undefined) values.delete(event.key);
    else values.set(event.key, value);
  });
  void getPersistence()
    .bind("settings", doc)
    .then(() => {
      if (!keepsLocalCopy()) return;
      // First run with the document: bring over what this device had.
      doc.transact(() => {
        for (const [key, { format }] of registry) {
          if (values.has(key)) continue;
          const local = readLocal(key, format);
          if (local !== undefined) values.set(key, local);
        }
      });
    });
}

export interface SyncedSetting {
  /** The raw stored value; undefined when never set. */
  get(): unknown;
  set(value: unknown): void;
  subscribe(listener: () => void): () => void;
}

const made = new Map<string, SyncedSetting>();

/**
 * A setting kept in the settings document under `key`; asking again for
 * the same key returns the same setting. One made after the document opened
 * (a book's reading place) moves its local value over when next saved.
 */
export function syncedSetting(key: string, format: Format = "json"): SyncedSetting {
  const existing = made.get(key);
  if (existing) return existing;
  const listeners = new Set<() => void>();
  const notify = () => {
    for (const listener of listeners) listener();
  };
  registry.set(key, { format, notify });

  const setting: SyncedSetting = {
    get() {
      start();
      if (values.has(key)) return values.get(key);
      return keepsLocalCopy() ? readLocal(key, format) : undefined;
    },
    set(value) {
      start();
      if (value === undefined || value === null) values.delete(key);
      else values.set(key, value);
      // The observer mirrors and notifies; this covers a value that didn't change.
      if (keepsLocalCopy()) writeLocal(key, format, value);
      notify();
    },
    subscribe(listener) {
      start();
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  made.set(key, setting);
  return setting;
}
