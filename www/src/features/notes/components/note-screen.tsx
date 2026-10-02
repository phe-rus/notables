import { noteDoc } from "@notables/core";
import {
  BlockToolbar,
  type DocumentSnapshot,
  NotesEditor,
  NotesEditorContent,
} from "@notables/editor";
import type { SyncStatus } from "@notables/sync";
import {
  Button,
  ChevronLeftIcon,
  IconButton,
  PinIcon,
  riseMotion,
  ShareIcon,
  StatusIndicator,
  TrashIcon,
} from "@notables/ui";
import { Link, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useCallback, useState } from "react";
import { getDeviceId } from "../../../platform/device-identity";
import { saveNoteContent } from "../../../platform/storage/note-content-cache";
import { PendingNarration } from "../../books/narration/components/pending-narration";
import { formatFull } from "../../library/lib/date-format";
import { getView, summarize } from "../../library/model/library-views";
import {
  getLibrary,
  type LibraryEntry,
  useEntry,
  useLibraryReady,
} from "../../library/store/library-store";
import { PublishControl } from "../../publishing/components/publish-control";
import { NoteRecorder } from "../../recording/components/note-recorder";
import { deleteNote } from "../actions/delete-note";
import { useNoteProvider } from "../hooks/use-note-provider";

const statusLabel: Record<SyncStatus, string> = {
  loading: "Opening…",
  local: "Saved on this device",
  connecting: "Syncing…",
  synced: "Synced",
  offline: "Offline · saved on this device",
};

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
  const [recording, setRecording] = useState(false);
  const startRecording = useCallback(() => setRecording(true), []);

  const onDocumentChange = useCallback(
    ({ document, text }: DocumentSnapshot) => {
      const { title, excerpt } = summarize(text);
      void saveNoteContent(entry.id, document);
      if (provider && noteDoc.title(provider.doc) !== title) noteDoc.setTitle(provider.doc, title);
      getLibrary().update(entry.id, { title, excerpt, updatedAt: Date.now() });
    },
    [entry.id, provider],
  );

  if (!provider) return null;

  const remove = async () => {
    if (!window.confirm("Delete this note from this device?")) return;
    await deleteNote(entry.id);
    void navigate({ to: "/", search: (s) => s });
  };

  return (
    <NotesEditor id={entry.id} provider={provider} bootstrap={entry.origin === getDeviceId()}>
      <div className="relative flex min-h-0 grow flex-col overflow-y-auto">
        <header className="glass-bar sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-2 px-3 pt-[env(safe-area-inset-top)] md:px-5">
          <Link
            to="/"
            search={(s) => s}
            className="flex min-h-11 items-center gap-0.5 px-1 text-[17px] text-accent-text no-underline md:hidden"
          >
            <ChevronLeftIcon size={22} strokeWidth={2.2} />
            {view.title}
          </Link>
          <BlockToolbar onRecord={startRecording} className="hidden md:flex" />
          <div className="flex items-center gap-1.5 md:gap-2.5">
            <StatusIndicator
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
            </StatusIndicator>
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
              title="Device-to-device sharing is coming soon"
            >
              <ShareIcon size={16} />
              Share
            </Button>
            <PublishControl entry={entry} doc={provider.doc} />
          </div>
        </header>

        <article className="flex grow justify-center px-6 pt-6 pb-36 md:pt-11">
          <div className="flex w-full max-w-[640px] flex-col gap-4">
            <p className="text-center font-sans text-[12px] text-label-tertiary md:text-left md:text-[13px]">
              {formatFull(entry.createdAt)}
            </p>
            <div className="relative">
              <NotesEditorContent
                label={entry.title || "New note"}
                placeholder="Title"
                onDocumentChange={onDocumentChange}
              />
            </div>
          </div>
        </article>
      </div>

      <motion.footer
        {...riseMotion}
        className="glass fixed inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-20 flex rounded-full px-2 py-1 md:hidden"
      >
        <BlockToolbar
          onRecord={startRecording}
          menuPlacement="above"
          className="w-full justify-around"
        />
      </motion.footer>

      <NoteRecorder open={recording} title={entry.title} onClose={() => setRecording(false)} />
      <PendingNarration noteId={entry.id} ready={status === "local" || status === "synced"} />
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
