import { NoteProvider, type SyncStatus } from "@notables/sync";
import { useEffect, useState } from "react";
import * as Y from "yjs";
import { getPersistence, getRemoteSync } from "../../../platform/note-storage";

/** One provider per mounted editor; created in an effect so StrictMode remounts stay clean. */
export function useNoteProvider(noteId: string) {
  const [provider, setProvider] = useState<NoteProvider | null>(null);
  const [status, setStatus] = useState<SyncStatus>("loading");

  useEffect(() => {
    const next = new NoteProvider(noteId, new Y.Doc(), {
      persistence: getPersistence(),
      remote: getRemoteSync(),
    });
    next.on("change", setStatus);
    setProvider(next);
    return () => next.destroy();
  }, [noteId]);

  return { provider, status };
}
