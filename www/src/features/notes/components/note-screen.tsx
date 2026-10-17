import { localMediaId, localMediaSrc, noteDoc } from "@notables/core";
import {
  type DocumentChange,
  KeepCaretVisiblePlugin,
  NotesEditor,
  NotesEditorContent,
  ReadModePlugin,
  useEditorCommands,
} from "@notables/pluraliti";
import type { SyncStatus } from "@notables/sync";
import {
  Button,
  ChevronLeftIcon,
  type ContextMenuItem,
  cn,
  FolderIcon,
  GlobeIcon,
  HeadphonesIcon,
  IconButton,
  LayoutIcon,
  MoreIcon,
  NoteIcon,
  openFollowUpMenu,
  openMenu,
  PenIcon,
  PinIcon,
  riseMotion,
  ShareIcon,
  StatusIndicator,
  TrashIcon,
  toast,
  useMediaQuery,
} from "@phe-rus/hino";
import { Link, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { t } from "../../../i18n/i18n";
import { androidBridge } from "../../../platform/android-bridge";
import { getDeviceId } from "../../../platform/device-identity";
import { saveFile } from "../../../platform/save-file";
import { inBrowserSession } from "../../../platform/session/browser-session-store";
import { loadMedia, saveMedia } from "../../../platform/storage/media-store";
import { saveNoteContent } from "../../../platform/storage/note-content-cache";
import { AiAssist } from "../../ai/components/ai-assist";
import { PendingNarration } from "../../books/narration/components/pending-narration";
import { useBook } from "../../books/store/book-store";
import { formatFull } from "../../library/lib/date-format";
import { notePreview } from "../../library/lib/note-preview";
import { rememberNoteTransition } from "../../library/lib/note-transition";
import { summarize } from "../../library/model/library-views";
import {
  getLibrary,
  type LibraryEntry,
  useEntry,
  useFolders,
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
import { SpreadsheetEditor } from "../../spreadsheets/components/spreadsheet-editor";
import { PendingDrawing } from "../../studio/components/pending-drawing";
import { moveNotesToBin } from "../../trash/lib/recycle-bin";
import { noteFolderItems, noteFontItems, noteFormatItems } from "../actions/note-menu";
import { NoteCaptureToolbar } from "../capture/note-capture-toolbar";
import { useKeyboardInset } from "../hooks/use-keyboard-inset";
import { useNoteProvider } from "../hooks/use-note-provider";
import { editorLabels } from "../lib/editor-labels";
import { NoteTagsSheet } from "./note-tags-sheet";

const statusLabel = (status: SyncStatus) => t(`notes.status.${status}`);
/** How far the page scrolls before the title has left the screen and moves into the bar. */
const TITLE_SCROLLED_PX = 72;

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
  const navigate = useNavigate();
  const trashed = Boolean(entry?.trashedAt);
  const bookId = entry?.bookId;

  // Deleted from anywhere (the list, a swipe, another window, a linked
  // browser): the note leaves the screen with it.
  useEffect(() => {
    if (!trashed) return;
    if (bookId) void navigate({ to: "/books/$bookId", params: { bookId }, replace: true });
    else void navigate({ to: "/", search: (s) => s, replace: true });
  }, [trashed, bookId, navigate]);

  if (trashed) return null;
  if (!entry) {
    return ready ? <MissingNote /> : null;
  }
  return <SharedAwareEditor entry={entry} viewId={viewId} />;
}

/** Reopens the editor when a note starts or stops being shared, so it loads from the right place. */
function SharedAwareEditor({ entry, viewId }: { entry: LibraryEntry; viewId?: string }) {
  const shared = useShareSession(entry.id) !== undefined;
  const [sharing, setSharing] = useState(false);
  return (
    <>
      <NoteEditorScreen
        key={`${entry.id}:${shared}`}
        entry={entry}
        viewId={viewId}
        onShare={() => setSharing(true)}
      />
      <ShareSheet entry={entry} open={sharing} onClose={() => setSharing(false)} />
    </>
  );
}

/** A new note takes the caret once its document has loaded, ready to type. */
function FocusWhenLoaded({ loaded }: { loaded: boolean }) {
  const { focus } = useEditorCommands();
  const done = useRef(false);
  useEffect(() => {
    if (!loaded || done.current) return;
    done.current = true;
    focus();
  }, [loaded, focus]);
  return null;
}

function NoteEditorScreen({
  entry,
  onShare,
}: {
  entry: LibraryEntry;
  viewId?: string;
  onShare: () => void;
}) {
  const { provider, status } = useNoteProvider(entry.id);
  // Recording and read aloud run on the phone; its browser exchanges files over their link.
  const browser = inBrowserSession();
  const navigate = useNavigate();
  // Chapters written for a book lead back to it.
  const book = useBook(entry.bookId ?? "");
  const folders = useFolders();
  const folder = folders.find((item) => item.id === entry.folderId);
  const { noteFont } = usePreferences();
  // "Record chapter" on an audiobook opens its new chapter already recording.
  const [tagging, setTagging] = useState(false);
  const [recording, setRecording] = useState(() => takeRecording(entry.id));
  const articleRef = useRef<HTMLElement>(null);
  const readTrigger = useRef<HTMLButtonElement>(null);
  const publishTrigger = useRef<HTMLButtonElement>(null);
  const [titleInBar, setTitleInBar] = useState(false);
  // On touch screens a note opens for reading, so scrolling never brings up
  // the keyboard; a tap on its text edits, and Done reads again. New notes
  // open ready to type.
  const coarsePointer = useMediaQuery("(pointer: coarse)");
  const wideWindow = useMediaQuery("(min-width: 1024px)");
  const desktopTools =
    wideWindow && (!coarsePointer || Boolean(androidBridge()?.hasHardwareKeyboard?.()));
  const touch = coarsePointer && !androidBridge()?.hasHardwareKeyboard?.();
  const [fresh] = useState(() => !entry.title);
  const [editing, setEditing] = useState(fresh);
  const spreadsheet = entry.format === "spreadsheet";
  const reading = touch && !editing;
  const startEditing = useCallback(() => setEditing(true), []);
  // Using the formatting tools means editing: a drawing or photo added
  // while reading would land in a note that can't be edited.
  const editFromTools = useCallback(() => {
    if (touch) setEditing(true);
  }, [touch]);
  // Photos are stored as media files and referenced by id, never inlined:
  // inline photos bloated the note and, on Android, could fail to save.
  const storePhoto = useCallback(async (file: File) => localMediaSrc(await saveMedia(file)), []);
  // The floating formatting tools sit above the keyboard; typing stays above them.
  const tools = useRef<HTMLElement>(null);
  const pane = useRef<HTMLDivElement>(null);
  const keyboardInset = useKeyboardInset(pane);
  const toolsTop = useCallback(() => {
    const rect = tools.current?.getBoundingClientRect();
    return rect && rect.height > 0 ? rect.top : Number.POSITIVE_INFINITY;
  }, []);
  const shareSession = useShareSession(entry.id);
  const startRecording = useCallback(() => setRecording(true), []);

  useEffect(() => recordOpened(entry.id), [entry.id]);

  // Opening a note loads it from its shared document, which the editor also
  // reports as a change. Only an edit (yours, or a collaborator's after the
  // note has loaded) marks it as modified, so reading never reorders the list.
  const loaded = useRef(false);
  useEffect(() => {
    loaded.current = false;
  }, [entry.id]);
  const onDocumentChange = useCallback(
    ({ document, text, origin }: DocumentChange) => {
      const { title, excerpt } = summarize(text);
      const edited = origin === "local" || loaded.current;
      loaded.current = true;
      void saveNoteContent(entry.id, document);
      if (provider && noteDoc.title(provider.doc) !== title) noteDoc.setTitle(provider.doc, title);
      const preview = notePreview(document, text);
      getLibrary().update(entry.id, {
        title,
        excerpt,
        ...preview,
        tags: [
          ...new Set([...(getLibrary().get(entry.id)?.manualTags ?? []), ...preview.tags]),
        ].slice(0, 30),
        ...(edited ? { updatedAt: Date.now() } : {}),
      });
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
    {
      label: t("workspace.moveToFolder"),
      icon: <FolderIcon size={18} />,
      onSelect: () => openFollowUpMenu(noteFolderItems([entry])),
    },
    {
      label: t("workspace.noteFormat"),
      icon: <LayoutIcon size={18} />,
      onSelect: () => openFollowUpMenu(noteFormatItems(entry)),
    },
    {
      label: t("notes.fontMenu"),
      icon: <PenIcon size={18} />,
      onSelect: () => openFollowUpMenu(noteFontItems(entry)),
    },
    { label: t("workspace.tags"), icon: <NoteIcon size={18} />, onSelect: () => setTagging(true) },
    ...(!browser && !spreadsheet
      ? [
          {
            label: t("notes.readAloud"),
            icon: <HeadphonesIcon size={18} />,
            onSelect: () => readTrigger.current?.click(),
          },
        ]
      : []),
    ...(!spreadsheet
      ? [
          {
            label: t("workspace.publishToWeb"),
            icon: <GlobeIcon size={18} />,
            onSelect: () => publishTrigger.current?.click(),
          },
        ]
      : []),
    "divider",
    {
      label: t("notes.deleteNote"),
      icon: <TrashIcon size={16} />,
      destructive: true,
      onSelect: remove,
    },
  ];

  return (
    <NotesEditor
      id={entry.id}
      provider={provider}
      bootstrap={entry.origin === getDeviceId()}
      labels={editorLabels()}
      resolvePhoto={storePhoto}
      onAttachment={async (input) => {
        try {
          const id = localMediaId(input.src);
          const blob = id ? await loadMedia(id) : null;
          if (!blob) throw new Error("missing-media");
          await saveFile(blob, input.name, input.mime);
        } catch {
          toast.error(t("editor.photoFailed"));
        }
      }}
      onEdit={startEditing}
    >
      <ReadModePlugin reading={reading} onEdit={startEditing} />
      {fresh && !spreadsheet && <FocusWhenLoaded loaded={status !== "loading"} />}
      <KeepCaretVisiblePlugin coveredFrom={toolsTop} />
      <div
        ref={pane}
        data-note-transition=""
        className="@container/note relative flex min-h-0 grow flex-col"
      >
        <div
          className="relative flex min-h-0 grow flex-col overflow-y-auto"
          onScroll={(event) => setTitleInBar(event.currentTarget.scrollTop > TITLE_SCROLLED_PX)}
        >
          <header className="glass-bar sticky top-0 z-20 flex box-content h-14 shrink-0 items-center justify-between gap-2 px-3 pt-[env(safe-area-inset-top)] @min-[600px]/note:px-5">
            {book ? (
              // A chapter leads back to its book, on every screen size.
              <Link
                to="/books/$bookId"
                params={{ bookId: book.id }}
                className="flex min-h-11 min-w-0 items-center gap-0.5 px-1 text-body text-accent-text no-underline"
              >
                <ChevronLeftIcon size={22} strokeWidth={2.2} className="shrink-0" />
                <span className="max-w-[min(180px,30cqw)] truncate">{book.title || "Book"}</span>
              </Link>
            ) : (
              <Link
                to="/"
                viewTransition={{ types: ["note-close"] }}
                onClick={() => rememberNoteTransition(entry.id)}
                search={{ view: folder ? `folder:${folder.id}` : undefined }}
                className="flex min-h-11 shrink-0 items-center gap-0.5 px-1 text-body text-accent-text no-underline md:hidden"
              >
                <ChevronLeftIcon size={22} strokeWidth={2.2} className="shrink-0" />
                <span
                  className={cn(
                    "max-w-[40cqw] truncate transition-opacity duration-200",
                    titleInBar && "@max-[860px]/note:sr-only",
                  )}
                >
                  {folder?.name || t("nav.workspace")}
                </span>
              </Link>
            )}
            <span className="min-w-0 flex-1 truncate text-center text-body font-semibold text-label">
              {entry.title || t("notes.newNote")}
            </span>
            {!spreadsheet && (
              <div className="contents" onPointerDownCapture={editFromTools}>
                <NoteCaptureToolbar
                  noteId={entry.id}
                  title={entry.title}
                  browser={browser}
                  onRecord={startRecording}
                  resolvePhoto={storePhoto}
                  className={desktopTools ? "hidden" : "@max-[860px]/note:hidden"}
                />
              </div>
            )}
            <div className="ms-auto flex shrink-0 items-center gap-1 @min-[600px]/note:gap-2">
              <StatusIndicator
                state={
                  status === "connecting" || status === "loading"
                    ? "syncing"
                    : status === "offline"
                      ? "offline"
                      : "saved"
                }
                // On a phone a lone "saved" dot is noise; it shows while syncing or offline.
                className={cn(
                  "px-1.5 whitespace-nowrap",
                  status !== "connecting" &&
                    status !== "loading" &&
                    status !== "offline" &&
                    "@max-[600px]/note:hidden",
                )}
                data-tooltip={statusLabel(status)}
              >
                <span className="sr-only @min-[600px]/note:not-sr-only @min-[860px]/note:sr-only @min-[1100px]/note:not-sr-only">
                  {statusLabel(status)}
                </span>
              </StatusIndicator>
              {touch && editing && (
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    (document.activeElement as HTMLElement | null)?.blur();
                  }}
                  className="min-h-11 px-2 text-body font-semibold text-accent-text"
                >
                  {t("common.done")}
                </button>
              )}
              {!browser && !spreadsheet && (
                <ReadAloudButton
                  root={articleRef}
                  title={entry.title}
                  triggerRef={readTrigger}
                  className="hidden"
                />
              )}
              <AiAssist />
              <IconButton
                size="icon-sm"
                label={entry.pinned ? t("notes.unpin") : t("notes.pin")}
                variant={entry.pinned ? "link" : "ghost"}
                className="@max-[520px]/note:hidden"
                onClick={() => getLibrary().update(entry.id, { pinned: !entry.pinned })}
              >
                <PinIcon size={19} />
              </IconButton>
              <IconButton
                size="icon-sm"
                variant="ghost"
                label={t("notes.font")}
                className="@max-[520px]/note:hidden"
                onClick={(event) => {
                  openMenu(event.currentTarget, noteFontItems(entry));
                }}
              >
                <span className="font-[family-name:var(--font-script)] text-[21px] leading-none font-semibold">
                  Aa
                </span>
              </IconButton>
              <IconButton
                size="icon-sm"
                variant="ghost"
                label={t("notes.deleteNote")}
                className="@max-[520px]/note:hidden"
                onClick={remove}
              >
                <TrashIcon size={19} />
              </IconButton>
              <IconButton
                size="icon-sm"
                label={t("sharing.share")}
                variant={shareSession ? "link" : "ghost"}
                className="@min-[600px]/note:hidden"
                onClick={onShare}
              >
                <ShareIcon size={19} />
              </IconButton>
              <Button
                size="sm"
                variant="secondary"
                className="@max-[600px]/note:hidden"
                onClick={onShare}
                data-tooltip={t("sharing.tooltip")}
              >
                <ShareIcon size={16} />
                {shareSession
                  ? t("sharing.shared", { count: shareSession.peers.length + 1 })
                  : t("sharing.share")}
              </Button>
              {!spreadsheet && (
                <PublishControl
                  entry={entry}
                  doc={provider.doc}
                  triggerRef={publishTrigger}
                  menuOnly
                />
              )}
              <IconButton
                size="icon-xs"
                variant="default"
                label={t("notes.more")}
                onClick={(event) => {
                  openMenu(event.currentTarget, moreItems(), { edge: "trailing" });
                }}
              >
                <MoreIcon size={18} />
              </IconButton>
            </div>
          </header>
          {desktopTools && !spreadsheet && (
            <div
              className="sticky top-[calc(56px+env(safe-area-inset-top))] z-10 flex min-h-11 items-center border-b border-separator/50 bg-paper px-3"
              onPointerDownCapture={editFromTools}
            >
              <NoteCaptureToolbar
                noteId={entry.id}
                title={entry.title}
                browser={browser}
                onRecord={startRecording}
                resolvePhoto={storePhoto}
                className="w-full justify-start"
              />
            </div>
          )}

          {spreadsheet ? (
            <SpreadsheetEditor doc={provider.doc} entry={entry} />
          ) : (
            <article
              ref={articleRef}
              data-note-font={entry.font ?? noteFont}
              className={cn(
                "flex grow justify-center px-6 pt-6 @min-[600px]/note:pt-11",
                desktopTools ? "pb-12" : "pb-36",
              )}
            >
              <div className="flex w-full max-w-[640px] flex-col gap-4">
                <p
                  data-read-aloud-skip
                  className="text-center font-sans text-caption text-label-tertiary @min-[600px]/note:text-start @min-[600px]/note:text-footnote"
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
          )}
        </div>

        {/* The formatting tools float at the bottom wherever the top bar has no room for them. */}
        {!spreadsheet && !desktopTools && (
          <motion.footer
            ref={tools}
            style={keyboardInset > 0 ? { bottom: keyboardInset + 8 } : undefined}
            onPointerDownCapture={editFromTools}
            {...riseMotion}
            className="glass-menu absolute inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-20 mx-auto flex max-w-[480px] rounded-full px-2 py-1 @min-[860px]/note:hidden"
          >
            <NoteCaptureToolbar
              noteId={entry.id}
              title={entry.title}
              browser={browser}
              onRecord={startRecording}
              resolvePhoto={storePhoto}
              menuPlacement="above"
              className="w-full justify-start"
            />
          </motion.footer>
        )}
      </div>

      <NoteTagsSheet entry={entry} open={tagging} onClose={() => setTagging(false)} />
      <NoteRecorder open={recording} title={entry.title} onClose={() => setRecording(false)} />
      <PendingNarration noteId={entry.id} ready={status === "local" || status === "synced"} />
      <PendingDrawing noteId={entry.id} ready={status === "local" || status === "synced"} />
    </NotesEditor>
  );
}

function MissingNote() {
  return (
    <div className="flex grow flex-col items-center justify-center gap-2 p-10 text-center">
      <p className="font-serif text-title2 font-semibold">This note isn’t on this device</p>
      <p className="text-subheadline text-label-secondary">It may have been deleted.</p>
      <Link to="/" className="mt-2 font-semibold text-accent-text">
        Back to notes
      </Link>
    </div>
  );
}
