import * as Y from "yjs";
import type { Persistence } from "./persistence";

/**
 * Storage that keeps each document as an append-only log of Yjs updates,
 * such as the SQLite store in the native apps.
 */
export interface UpdateLog {
  /** Every stored update for a document, oldest first. */
  load(name: string): Promise<Uint8Array[]>;
  append(name: string, update: Uint8Array): Promise<void>;
  /** Atomically replaces the log with a single state. */
  replace(name: string, state: Uint8Array): Promise<void>;
  remove(name: string): Promise<void>;
}

export interface UpdateLogPersistenceOptions {
  /** Compact a document's log into one state once it is this long. */
  compactAfter?: number;
  /** Typing produces an update per keystroke; merge them over this window. */
  flushDelayMs?: number;
}

/**
 * Persistence over an update log. Local edits are merged and written in
 * short batches, in order, and long logs are compacted when a document
 * is opened.
 */
export function createUpdateLogPersistence(
  log: UpdateLog,
  { compactAfter = 200, flushDelayMs = 250 }: UpdateLogPersistenceOptions = {},
): Persistence {
  return {
    async bind(name, doc) {
      const origin = Symbol(`persistence:${name}`);
      const stored = await log.load(name);
      Y.transact(
        doc,
        () => {
          for (const update of stored) Y.applyUpdate(doc, update, origin);
        },
        origin,
      );

      // Write everything the document holds when the log is new (it may have
      // been seeded before binding) or too long to replay quickly.
      let writes: Promise<void> =
        stored.length === 0 || stored.length > compactAfter
          ? log.replace(name, Y.encodeStateAsUpdate(doc))
          : Promise.resolve();

      let pending: Uint8Array[] = [];
      let timer: ReturnType<typeof setTimeout> | undefined;

      const flush = () => {
        clearTimeout(timer);
        timer = undefined;
        if (pending.length === 0) return writes;
        const update = pending.length === 1 ? pending[0] : Y.mergeUpdates(pending);
        pending = [];
        // Chain writes so updates land in the order they were made.
        writes = writes
          .catch(() => undefined)
          .then(() => (update ? log.append(name, update) : undefined));
        return writes;
      };

      const onUpdate = (update: Uint8Array, updateOrigin: unknown) => {
        if (updateOrigin === origin) return;
        pending.push(update);
        timer ??= setTimeout(flush, flushDelayMs);
      };
      doc.on("update", onUpdate);

      return {
        destroy() {
          doc.off("update", onUpdate);
          void flush();
        },
        flush,
      };
    },
    remove: (name) => log.remove(name),
  };
}
