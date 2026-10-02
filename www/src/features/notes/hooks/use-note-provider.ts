import { NoteProvider, type SyncStatus } from "@notables/sync";
import { useEffect, useState } from "react";
import * as Y from "yjs";
import { getRemoteSync } from "../../../platform/storage/document-storage";
import { persistenceFor } from "../../sharing/lib/share-sessions";

/** One provider per mounted editor; created in an effect so StrictMode remounts stay clean. */
export function useNoteProvider(noteId: string) {
  const [provider, setProvider] = useState<NoteProvider | null>(null);
  const [status, setStatus] = useState<SyncStatus>("loading");

  useEffect(() => {
    const next = new NoteProvider(noteId, new Y.Doc(), {
      // Shared notes load through their live session, so edits reach other devices.
      persistence: persistenceFor(noteId),
      remote: getRemoteSync(),
    });
    next.on("change", setStatus);
    setProvider(next);
    return () => next.destroy();
  }, [noteId]);

  return { provider, status };
}
