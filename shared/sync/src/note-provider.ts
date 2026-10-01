import YProvider from "y-partyserver/provider";
import { Awareness } from "y-protocols/awareness";
import type * as Y from "yjs";
import { Emitter } from "./emitter";
import type { Persistence } from "./persistence";

export type SyncStatus = "loading" | "local" | "connecting" | "synced" | "offline";

export interface RemoteSync {
  /** Host of the app's Worker, e.g. `notables.pherus.org` or `localhost:3000`. */
  host: string;
  /** Durable Object namespace that serves notes. */
  party?: string;
  /** Extra query parameters, e.g. an access token once identity exists. */
  params?: () => Promise<Record<string, string>>;
}

export interface NoteProviderOptions {
  persistence: Persistence;
  /** Omit to keep the note on this device only. */
  remote?: RemoteSync | null;
  /** Wait at most this long for the server before showing local content. */
  remoteSyncTimeoutMs?: number;
}

type Events = {
  sync: (isSynced: boolean) => void;
  status: (event: { status: string }) => void;
  update: (update: unknown) => void;
  reload: (doc: Y.Doc) => void;
  change: (status: SyncStatus) => void;
};

/**
 * Connects one note's Yjs document to on-device storage and, when enabled,
 * to its Durable Object. Shaped as a Lexical collaboration `Provider` so the
 * editor binds to it directly.
 *
 * Local content always loads first. With remote sync enabled, the first
 * `sync` event waits briefly for the server so a new device never seeds an
 * empty document that then merges with real content.
 */
export class NoteProvider extends Emitter<Events> {
  readonly awareness: Awareness;
  #status: SyncStatus = "loading";
  #local?: { destroy(): void };
  #remote?: YProvider;
  #synced = false;
  /** Bumped by every connect/disconnect so stale async work can bail out. */
  #generation = 0;
  #opening?: Promise<void>;

  constructor(
    readonly noteId: string,
    readonly doc: Y.Doc,
    readonly options: NoteProviderOptions,
  ) {
    super();
    this.awareness = new Awareness(doc);
  }

  get status(): SyncStatus {
    return this.#status;
  }

  /**
   * Starts loading and syncing. Synchronous on purpose: Lexical defers its
   * StrictMode disconnect when `connect` returns a promise, which would tear
   * down the next connection. Await `loaded()` to know when content is in.
   */
  connect(): void {
    if (this.#local || this.#opening) return;
    const generation = ++this.#generation;
    this.#opening = this.#open(generation).finally(() => {
      if (generation === this.#generation) this.#opening = undefined;
    });
  }

  /** Resolves once the current connection has loaded local content. */
  loaded(): Promise<void> {
    return this.#opening ?? Promise.resolve();
  }

  async #open(generation: number): Promise<void> {
    const local = await this.options.persistence.bind(`note:${this.noteId}`, this.doc);
    if (generation !== this.#generation) {
      // Disconnected while loading: drop this binding.
      local.destroy();
      return;
    }
    this.#local = local;

    const remote = this.options.remote;
    if (!remote) {
      this.#setStatus("local");
      this.#markSynced();
      return;
    }

    this.#setStatus("connecting");
    const provider = new YProvider(remote.host, this.noteId, this.doc, {
      party: remote.party ?? "note-document",
      awareness: this.awareness,
      ...(remote.params ? { params: remote.params } : {}),
    });
    this.#remote = provider;

    provider.on("sync", (synced: boolean) => {
      if (!synced) return;
      this.#setStatus("synced");
      this.#markSynced();
    });
    provider.on("status", ({ status }: { status: string }) => {
      if (status === "disconnected") this.#setStatus("offline");
      if (status === "connecting") this.#setStatus("connecting");
      this.emit("status", { status });
    });

    setTimeout(() => {
      if (generation === this.#generation) this.#markSynced();
    }, this.options.remoteSyncTimeoutMs ?? 1500);
  }

  /** Stops syncing. The provider can `connect()` again (editors remount). */
  disconnect(): void {
    this.#generation++;
    this.#opening = undefined;
    this.#remote?.destroy();
    this.#remote = undefined;
    this.#local?.destroy();
    this.#local = undefined;
    this.#synced = false;
    this.#setStatus("loading");
  }

  destroy(): void {
    this.disconnect();
    this.awareness.destroy();
    this.clearListeners();
  }

  #markSynced() {
    if (this.#synced) return;
    this.#synced = true;
    this.emit("sync", true);
  }

  #setStatus(status: SyncStatus) {
    if (status === this.#status) return;
    this.#status = status;
    this.emit("change", status);
  }
}
