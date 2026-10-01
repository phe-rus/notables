import { noteDoc } from "@notables/core";
import { BlockToolbar, NotesEditor, NotesEditorContent } from "@notables/editor";
import { NoteProvider, type SyncStatus } from "@notables/sync";
import {
  Button,
  ChevronLeftIcon,
  IconButton,
  PinIcon,
  ShareIcon,
  StatusDot,
  TrashIcon,
} from "@notables/ui";
import { Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import * as Y from "yjs";
import { getDeviceId } from "../../platform/identity";
import { getPersistence, getRemoteSync } from "../../platform/storage";
import { formatFull } from "../library/format";
import { getLibrary, type LibraryEntry, useEntry, useLibraryReady } from "../library/library";
import { getView, summarize } from "../library/views";

const statusLabel: Record<SyncStatus, string> = {
  loading: "Opening…",
  local: "Saved on this device",
  connecting: "Syncing…",
  synced: "Synced",
  offline: "Offline · saved on this device",
};

/** One provider per mounted editor; created in an effect so StrictMode remounts stay clean. */
function useNoteProvider(noteId: string) {
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

export function NoteScreen({ noteId, viewId }: { noteId: string; viewId?: string }) {
  const entry = useEntry(noteId);
  const ready = useLibraryReady();

  if (!entry) {
    return ready ? <MissingNote /> : null;
  }
  return <NoteEditorScreen key={noteId} entry={entry} viewId={viewId} />;
}

function NoteEditorScreen({ entry, viewId }: { entry: LibraryEntry; viewId?: string }) {
  const { provider, status } = useNoteProvider(entry.id);
  const navigate = useNavigate();
  const view = getView(viewId);

  const onTextChange = useCallback(
    (text: string) => {
      const { title, excerpt } = summarize(text);
      if (provider && noteDoc.title(provider.doc) !== title) noteDoc.setTitle(provider.doc, title);
      getLibrary().update(entry.id, { title, excerpt, updatedAt: Date.now() });
    },
    [entry.id, provider],
  );

  if (!provider) return null;

  const remove = async () => {
    if (!window.confirm("Delete this note from this device?")) return;
    await getLibrary().remove(entry.id);
    void navigate({ to: "/", search: (s) => s });
  };

  return (
    <NotesEditor id={entry.id} provider={provider} bootstrap={entry.origin === getDeviceId()}>
      <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-separator/60 px-3 pt-[env(safe-area-inset-top)] md:px-5">
        <Link
          to="/"
          search={(s) => s}
          className="flex min-h-11 items-center gap-0.5 px-1 text-[17px] text-accent-text no-underline md:hidden"
        >
          <ChevronLeftIcon size={22} strokeWidth={2.2} />
          {view.title}
        </Link>
        <BlockToolbar className="hidden md:flex" />
        <div className="flex items-center gap-1.5 md:gap-2.5">
          <StatusDot
            state={
              status === "connecting" || status === "loading"
                ? "syncing"
                : status === "offline"
                  ? "offline"
                  : "saved"
            }
            className="hidden lg:flex"
          >
            {statusLabel[status]}
          </StatusDot>
          <IconButton
            label={entry.pinned ? "Unpin" : "Pin"}
            tone={entry.pinned ? "accent" : "default"}
            onClick={() => getLibrary().update(entry.id, { pinned: !entry.pinned })}
          >
            <PinIcon size={19} />
          </IconButton>
          <IconButton label="Delete note" onClick={remove}>
            <TrashIcon size={19} />
          </IconButton>
          <Button
            variant="secondary"
            className="max-md:hidden"
            disabled
            title="Sharing with people arrives with Pherus accounts"
          >
            <ShareIcon size={16} />
            Share
          </Button>
        </div>
      </header>

      <article className="flex grow justify-center overflow-y-auto px-6 pt-6 pb-32 md:pt-11">
        <div className="flex w-full max-w-[640px] flex-col gap-4">
          <p className="text-center font-sans text-[12px] text-label-tertiary md:text-left md:text-[13px]">
            {formatFull(entry.createdAt)}
          </p>
          <div className="relative">
            <NotesEditorContent
              label={entry.title || "New note"}
              placeholder="Title"
              onTextChange={onTextChange}
            />
          </div>
        </div>
      </article>

      <footer className="flex justify-center border-t border-separator bg-sidebar px-2.5 pt-1.5 pb-[max(10px,env(safe-area-inset-bottom))] md:hidden">
        <BlockToolbar className="w-full justify-around" />
      </footer>
    </NotesEditor>
  );
}

function MissingNote() {
  return (
    <div className="flex grow flex-col items-center justify-center gap-2 p-10 text-center">
      <p className="font-serif text-[24px] font-semibold">This note isn’t on this device</p>
      <p className="text-[15px] text-label-secondary">It may have been deleted.</p>
      <Link to="/" className="mt-2 font-semibold text-accent-text">
        Back to notes
      </Link>
    </div>
  );
}
