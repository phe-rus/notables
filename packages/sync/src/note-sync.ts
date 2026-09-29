import YProvider from "y-partyserver/provider";
import type * as Y from "yjs";
import type { SyncConfig } from "./config";
import type { NotePersistence } from "./persistence";

export type SyncStatus = "local" | "connecting" | "synced" | "offline";

export interface NoteSession {
  readonly doc: Y.Doc;
  readonly status: SyncStatus;
  onStatus(listener: (status: SyncStatus) => void): () => void;
  destroy(): void;
}

const PARTY = "note-document";

/**
 * Opens a note: loads it from local storage first (instant, offline-safe),
 * then — when signed in — connects to its Durable Object for live sync.
 */
export async function openNote(
  noteId: string,
  doc: Y.Doc,
  options: { config: SyncConfig; persistence: NotePersistence },
): Promise<NoteSession> {
  const { config, persistence } = options;
  const local = await persistence.bind(noteId, doc);
  const listeners = new Set<(status: SyncStatus) => void>();

  let status: SyncStatus = "local";
  const setStatus = (next: SyncStatus) => {
    if (next === status) return;
    status = next;
    for (const listener of listeners) listener(next);
  };

  let provider: YProvider | undefined;
  if (await config.getToken()) {
    setStatus("connecting");
    provider = new YProvider(config.syncHost, noteId, doc, {
      party: PARTY,
      params: async () => ({ token: (await config.getToken()) ?? "" }),
    });
    provider.on("sync", (synced: boolean) => synced && setStatus("synced"));
    provider.on("status", ({ status: s }: { status: string }) => {
      if (s === "disconnected") setStatus("offline");
      if (s === "connecting") setStatus("connecting");
    });
  }

  return {
    doc,
    get status() {
      return status;
    },
    onStatus(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    destroy() {
      provider?.destroy();
      local.destroy();
      listeners.clear();
    },
  };
}
