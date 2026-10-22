import type { Provider } from "@lexical/yjs";

/** A provider that is never connected: composing happens on this device only. */
export function offlineProvider(): Provider {
  const awareness = {
    getLocalState: () => null,
    getStates: () => new Map(),
    off: () => {},
    on: () => {},
    setLocalState: () => {},
    setLocalStateField: () => {},
  };
  return {
    awareness,
    connect: () => {},
    disconnect: () => {},
    off: () => {},
    on: () => {},
  } as unknown as Provider;
}
