import { useSyncExternalStore } from "react";
import type * as Y from "yjs";
import { getLibrary } from "../../library/store/library-store";

/** A phrase and when it's spoken: [start ms, end ms, text]. */
export type TimedPhrase = [number, number, string];

export interface TimedTranscript {
  phrases: TimedPhrase[];
  /** False while transcription is still going. */
  complete: boolean;
  updatedAt: number;
}

/**
 * Timed transcripts of recordings, keyed by the recording's source, kept
 * in the library so they sync with the books that use them.
 */
class TranscriptStore {
  readonly map: Y.Map<TimedTranscript>;
  #listeners = new Set<() => void>();
  #version = 0;

  constructor(doc: Y.Doc) {
    this.map = doc.getMap<TimedTranscript>("transcripts");
    this.map.observe(() => {
      this.#version += 1;
      for (const listener of this.#listeners) listener();
    });
  }

  subscribe = (listener: () => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };

  version = () => this.#version;

  get(src: string): TimedTranscript | undefined {
    return this.map.get(src);
  }

  set(src: string, transcript: TimedTranscript) {
    this.map.set(src, transcript);
  }
}

let instance: TranscriptStore | undefined;

export function getTranscriptStore(): TranscriptStore {
  instance ??= new TranscriptStore(getLibrary().doc);
  return instance;
}

export function useTimedTranscript(src: string | undefined): TimedTranscript | undefined {
  const store = getTranscriptStore();
  useSyncExternalStore(store.subscribe, store.version, () => 0);
  return src ? store.get(src) : undefined;
}

/** The phrase being spoken at `ms`, or the last one before it. */
export function phraseAt(phrases: TimedPhrase[], ms: number): number {
  let low = 0;
  let high = phrases.length - 1;
  let found = -1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    if ((phrases[middle]?.[0] ?? 0) <= ms) {
      found = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return found;
}
