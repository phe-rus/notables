import type { Provider } from "@lexical/yjs";
import type * as Y from "yjs";

/**
 * Anything that can keep a note's Yjs document in sync — `NoteProvider`
 * from `@notables/sync` satisfies this.
 */
export interface DocumentProvider {
  readonly doc: Y.Doc;
  /** A y-protocols `Awareness` (cursor and presence state). */
  readonly awareness: object;
  /** Must not return a promise; see NoteProvider.connect. */
  connect(): void;
  disconnect(): void;
  on(event: "sync" | "status" | "update" | "reload", listener: (...args: never[]) => void): void;
  off(event: "sync" | "status" | "update" | "reload", listener: (...args: never[]) => void): void;
}

const adapters = new WeakMap<DocumentProvider, Provider>();

/** Lexical disconnects when the provider identity changes, so adapt each provider once. */
export function toLexicalProvider(provider: DocumentProvider): Provider {
  const cached = adapters.get(provider);
  if (cached) return cached;
  const adapter = {
    awareness: provider.awareness as Provider["awareness"],
    connect: () => provider.connect(),
    disconnect: () => provider.disconnect(),
    on: (type: string, cb: (...args: never[]) => void) => provider.on(type as "sync", cb),
    off: (type: string, cb: (...args: never[]) => void) => provider.off(type as "sync", cb),
  } as Provider;
  adapters.set(provider, adapter);
  return adapter;
}
