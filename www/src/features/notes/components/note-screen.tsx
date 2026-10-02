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
  type ContextMenuItem,
  IconButton,
  MoreIcon,
  openContextMenu,
  PinIcon,
  riseMotion,
  ShareIcon,
  StatusIndicator,
  TrashIcon,
} from "@notables/ui";
import { Link, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { t } from "../../../i18n/i18n";
import { getDeviceId } from "../../../platform/device-identity";
import { saveNoteContent } from "../../../platform/storage/note-content-cache";
import { AiAssist } from "../../ai/components/ai-assist";
import { PendingNarration } from "../../books/narration/components/pending-narration";
import { useBook } from "../../books/store/book-store";
import { formatFull } from "../../library/lib/date-format";
import { getView, summarize } from "../../library/model/library-views";
import {
  getLibrary,
  type LibraryEntry,
  useEntry,
  useLibraryReady,
} from "../../library/store/library-store";
import { recordOpened } from "../../library/store/recents-store";
import { ReadAloudButton } from "../../listening/components/read-aloud-button";
import { PublishControl } from "../../publishing/components/publish-control";
import { NoteRecorder } from "../../recording/components/note-recorder";
import { takeRecording } from "../../recording/lib/pending-recording";
import { usePreferences } from "../../settings/store/preferences-store";
import { ShareSheet } from "../../sharing/components/share-sheet";
import { useShareSession } from "../../sharing/lib/share-sessions";
import { PendingDrawing } from "../../studio/components/pending-drawing";
import { moveNotesToBin } from "../../trash/lib/recycle-bin";
import { noteFontItems } from "../actions/note-menu";
import { useNoteProvider } from "../hooks/use-note-provider";

const statusLabel = (status: SyncStatus) => t(`notes.status.${status}`);

/*
 * The top bar answers to the width of the note's own pane, not the window:
 * with the sidebar and list open, a wide window can still leave the note
 * narrow. Below 860px the formatting tools float at the bottom; below
 * 600px Share and Publish become icons; below 520px Pin, Font and Delete
 * move into More. The save status shows its words only where they fit.
 */

export function NoteScreen({ noteId, viewId }: { noteId: string; viewId?: string }) {
  const entry = useEntry(noteId);
  const ready = useLibraryReady();

  if (!entry) {
    return ready ? <MissingNote /> : null;
  }
  return <SharedAwareEditor entry={entry} viewId={viewId} />;
}

/** Reopens the editor when a note starts or stops being shared, so it loads from the right place. */
function SharedAwareEditor({ entry, viewId }: { entry: LibraryEntry; viewId?: string }) {
  const shared = useShareSession(entry.id) !== undefined;
  return <NoteEditorScreen key={`${entry.id}:${shared}`} entry={entry} viewId={viewId} />;
}

function NoteEditorScreen({ entry, viewId }: { entry: LibraryEntry; viewId?: string }) {
  const { provider, status } = useNoteProvider(entry.id);
  const navigate = useNavigate();
  const view = getView(viewId);
  // Chapters written for a book lead back to it.
  const book = useBook(entry.bookId ?? "");
  const { noteFont } = usePreferences();
  // "Record chapter" on an audiobook opens its new chapter already recording.
  const [recording, setRecording] = useState(() => takeRecording(entry.id));
  const articleRef = useRef<HTMLElement>(null);
  const [sharing, setSharing] = useState(false);
  const shareSession = useShareSession(entry.id);
  const startRecording = useCallback(() => setRecording(true), []);

  useEffect(() => recordOpened(entry.id), [entry.id]);

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

  const remove = () => {
    moveNotesToBin([entry]);
    if (book) void navigate({ to: "/books/$bookId", params: { bookId: book.id } });
    else void navigate({ to: "/", search: (s) => s });
  };

  const moreItems = (): ContextMenuItem[] => [
    {
      label: entry.pinned ? t("notes.unpin") : t("notes.pin"),
      icon: <PinIcon size={16} />,
      onSelect: () => getLibrary().update(entry.id, { pinned: !entry.pinned }),
    },
    "divider",
    ...noteFontItems(entry),
    "divider",
    {
      label: t("notes.deleteNote"),
      icon: <TrashIcon size={16} />,
      destructive: true,
      onSelect: remove,
    },
  ];

  return (
    <NotesEditor id={entry.id} provider={provider} bootstrap={entry.origin === getDeviceId()}>
      <div className="@container/note relative flex min-h-0 grow flex-col">
        <div className="relative flex min-h-0 grow flex-col overflow-y-auto">
          <header className="glass-bar sticky top-0 z-20 flex box-content h-14 shrink-0 items-center justify-between gap-2 px-3 pt-[env(safe-area-inset-top)] @min-[600px]/note:px-5">
            {book ? (
              // A chapter leads back to its book, on every screen size.
              <Link
                to="/books/$bookId"
                params={{ bookId: book.id }}
                className="flex min-h-11 min-w-0 items-center gap-0.5 px-1 text-[17px] text-accent-text no-underline"
              >
                <ChevronLeftIcon size={22} strokeWidth={2.2} className="shrink-0" />
                <span className="max-w-[min(180px,30cqw)] truncate">{book.title || "Book"}</span>
              </Link>
            ) : (
              <Link
                to="/"
                search={(s) => s}
                className="flex min-h-11 min-w-0 items-center gap-0.5 px-1 text-[17px] text-accent-text no-underline md:hidden"
              >
                <ChevronLeftIcon size={22} strokeWidth={2.2} className="shrink-0" />
                <span className="truncate @max-[420px]/note:sr-only">{view.title}</span>
              </Link>
            )}
            <BlockToolbar onRecord={startRecording} className="@max-[860px]/note:hidden" />
            <div className="ms-auto flex shrink-0 items-center gap-1 @min-[600px]/note:gap-2">
              <StatusIndicator
                state={
                  status === "connecting" || status === "loading"
                    ? "syncing"
                    : status === "offline"
                      ? "offline"
                      : "saved"
                }
                className="px-1.5 whitespace-nowrap"
                data-tooltip={statusLabel(status)}
              >
                <span className="sr-only @min-[600px]/note:not-sr-only @min-[860px]/note:sr-only @min-[1100px]/note:not-sr-only">
                  {statusLabel(status)}
                </span>
              </StatusIndicator>
              <ReadAloudButton root={articleRef} title={entry.title} />
              <AiAssist />
              <IconButton
                label={entry.pinned ? t("notes.unpin") : t("notes.pin")}
                tone={entry.pinned ? "accent" : "default"}
                className="@max-[520px]/note:hidden"
                onClick={() => getLibrary().update(entry.id, { pinned: !entry.pinned })}
              >
                <PinIcon size={19} />
              </IconButton>
              <IconButton
                label={t("notes.font")}
                className="@max-[520px]/note:hidden"
                onClick={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  openContextMenu(rect.left, rect.bottom + 6, noteFontItems(entry));
                }}
              >
                <span className="font-[family-name:var(--font-script)] text-[21px] leading-none font-semibold">
                  Aa
                </span>
              </IconButton>
              <IconButton
                label={t("notes.deleteNote")}
                className="@max-[520px]/note:hidden"
                onClick={remove}
              >
                <TrashIcon size={19} />
              </IconButton>
              <IconButton
                label={t("sharing.share")}
                tone={shareSession ? "accent" : "default"}
                className="@min-[600px]/note:hidden"
                onClick={() => setSharing(true)}
              >
                <ShareIcon size={19} />
              </IconButton>
              <Button
                variant="secondary"
                className="@max-[600px]/note:hidden"
                onClick={() => setSharing(true)}
                data-tooltip={t("sharing.tooltip")}
              >
                <ShareIcon size={16} />
                {shareSession
                  ? t("sharing.shared", { count: shareSession.peers.length + 1 })
                  : t("sharing.share")}
              </Button>
              <PublishControl entry={entry} doc={provider.doc} />
              <IconButton
                label={t("notes.more")}
                className="@min-[520px]/note:hidden"
                onClick={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  openContextMenu(rect.right - 220, rect.bottom + 6, moreItems());
                }}
              >
                <MoreIcon size={20} />
              </IconButton>
            </div>
          </header>

          <article
            ref={articleRef}
            data-note-font={entry.font ?? noteFont}
            className="flex grow justify-center px-6 pt-6 pb-36 @min-[600px]/note:pt-11"
          >
            <div className="flex w-full max-w-[640px] flex-col gap-4">
              <p
                data-read-aloud-skip
                className="text-center font-sans text-[12px] text-label-tertiary @min-[600px]/note:text-start @min-[600px]/note:text-[13px]"
              >
                {formatFull(entry.createdAt)}
              </p>
              <div className="relative">
                <NotesEditorContent
                  label={entry.title || t("notes.newNote")}
                  placeholder={t("notes.title")}
                  onDocumentChange={onDocumentChange}
                />
              </div>
            </div>
          </article>
        </div>

        {/* The formatting tools float at the bottom wherever the top bar has no room for them. */}
        <motion.footer
          {...riseMotion}
          className="glass-menu absolute inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-20 mx-auto flex max-w-[480px] rounded-full px-2 py-1 @min-[860px]/note:hidden"
        >
          <BlockToolbar
            onRecord={startRecording}
            menuPlacement="above"
            className="w-full justify-around"
          />
        </motion.footer>
      </div>

      <ShareSheet entry={entry} open={sharing} onClose={() => setSharing(false)} />
      <NoteRecorder open={recording} title={entry.title} onClose={() => setRecording(false)} />
      <PendingNarration noteId={entry.id} ready={status === "local" || status === "synced"} />
      <PendingDrawing noteId={entry.id} ready={status === "local" || status === "synced"} />
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
