import { bridgePersistence, type Persistence } from "@notables/sync";
import { useSyncExternalStore } from "react";
import { getPersistence } from "../../../platform/storage/document-storage";
import { getShares } from "../store/share-store";
import { ShareSession } from "./share-session";

const sessions = new Map<string, ShareSession>();
const listeners = new Set<() => void>();
let version = 0;

const emit = () => {
  version += 1;
  for (const listener of listeners) listener();
};

/** Starts a session for every shared note, and stops ones no longer shared. */
export function syncShareSessions() {
  const shares = getShares();
  const wanted = new Set(shares.map((share) => share.noteId));
  for (const [noteId, session] of sessions) {
    if (!wanted.has(noteId)) {
      session.stop();
      sessions.delete(noteId);
    }
  }
  for (const share of shares) {
    if (sessions.has(share.noteId)) continue;
    const session = new ShareSession(share);
    session.subscribe(emit);
    sessions.set(share.noteId, session);
  }
  emit();
}

export function sessionFor(noteId: string): ShareSession | undefined {
  return sessions.get(noteId);
}

/**
 * Where an editor should load a note from: the shared session when there
 * is one (so edits reach other devices live), otherwise device storage.
 */
export function persistenceFor(noteId: string): Persistence {
  const session = sessions.get(noteId);
  if (!session) return getPersistence();
  const bridge = bridgePersistence(session.doc, getPersistence());
  return {
    async bind(name, doc) {
      await session.ready;
      return bridge.bind(name, doc);
    },
    remove: bridge.remove,
  };
}

/** Changes whenever anyone comes or goes, or a member list changes, on any shared note. */
export function useShareSessionsVersion(): number {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => version,
    () => 0,
  );
}

/** Re-renders as people come and go on shared notes. */
export function useShareSession(noteId: string): ShareSession | undefined {
  useShareSessionsVersion();
  return sessions.get(noteId);
}
