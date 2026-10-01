import { createPublicationSnapshot, readingMinutes } from "@notables/core";
import { useDocumentSnapshot } from "@notables/editor";
import { Button, cn, GlobeIcon, IconButton, LinkIcon } from "@notables/ui";
import { useEffect, useId, useRef, useState } from "react";
import type * as Y from "yjs";
import { publicUrl } from "../../platform/links";
import { getAuthorName, setAuthorName } from "../../platform/preferences";
import { publishNote, unpublishNote } from "../../server/functions";
import { getLibrary, type LibraryEntry } from "../library/library";

type Busy = "publish" | "unpublish" | null;

/**
 * Publish, update and unpublish a note. Lives inside the editor so it can
 * snapshot the current document.
 */
export function PublishControl({ entry, doc }: { entry: LibraryEntry; doc: Y.Doc }) {
  const snapshot = useDocumentSnapshot();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [author, setAuthor] = useState(getAuthorName);
  const panelId = useId();
  const root = useRef<HTMLDivElement>(null);
  const published = Boolean(entry.publicationId && entry.publishKey);
  const link = entry.publicationId ? publicUrl(`/p/${entry.publicationId}`) : null;

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (
        event instanceof KeyboardEvent
          ? event.key === "Escape"
          : !root.current?.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const publish = async () => {
    const name = author.trim();
    if (!name) {
      setError("Add the name readers will see.");
      return;
    }
    setBusy("publish");
    setError(null);
    try {
      const { document, text } = snapshot();
      const { title, excerpt } = createPublicationSnapshot(doc, {
        kind: entry.kind,
        text,
        document,
      });
      setAuthorName(name);
      const result = await publishNote({
        data: {
          noteId: entry.id,
          kind: entry.kind,
          title,
          excerpt,
          authorName: name,
          readingMinutes: readingMinutes(text),
          document: document as unknown as { root: { children: unknown[] } },
          key: entry.publishKey ?? undefined,
        },
      });
      getLibrary().update(entry.id, {
        publicationId: result.publication.id,
        publishKey: result.key,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn’t publish. Try again.");
    } finally {
      setBusy(null);
    }
  };

  const unpublish = async () => {
    if (!entry.publicationId || !entry.publishKey) return;
    setBusy("unpublish");
    setError(null);
    try {
      await unpublishNote({ data: { id: entry.publicationId, key: entry.publishKey } });
      getLibrary().update(entry.id, { publicationId: null, publishKey: null });
      setOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn’t unpublish. Try again.");
    } finally {
      setBusy(null);
    }
  };

  const copy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div ref={root} className="relative">
      <IconButton
        label={published ? "Published" : "Publish"}
        tone={published ? "accent" : "default"}
        className="md:hidden"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <GlobeIcon size={20} />
      </IconButton>
      <Button
        variant={published ? "secondary" : "primary"}
        className="max-md:hidden"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        {published && <GlobeIcon size={16} className="text-accent-text" />}
        {published ? "Published" : "Publish"}
      </Button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label={published ? "Publication" : "Publish"}
          className="absolute top-[calc(100%+8px)] right-0 z-40 flex w-[320px] max-w-[calc(100vw-24px)] flex-col gap-3 rounded-2xl bg-elevated p-4 shadow-[0_0_0_1px_var(--color-separator),0_18px_48px_rgb(40_30_0/0.16)]"
        >
          {published && link ? (
            <>
              <div className="flex flex-col gap-1">
                <p className="text-[15px] font-semibold">This note is public</p>
                <p className="text-[13px] leading-snug text-label-secondary">
                  Readers see the version you last published. Your note stays private.
                </p>
              </div>
              <button
                type="button"
                onClick={copy}
                className="flex items-center gap-2 rounded-[10px] bg-fill px-3 py-2.5 text-left text-[13px] text-label-secondary transition-colors hover:bg-separator/60"
              >
                <LinkIcon size={15} className="shrink-0 text-accent-text" />
                <span className="truncate">{link}</span>
                <span className="ml-auto shrink-0 font-semibold text-accent-text">
                  {copied ? "Copied" : "Copy"}
                </span>
              </button>
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  className="grow"
                  disabled={busy !== null}
                  onClick={publish}
                >
                  {busy === "publish" ? "Updating…" : "Update"}
                </Button>
                <a
                  href={link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-[34px] items-center rounded-[9px] border border-separator px-3.5 text-[14px] font-semibold text-label no-underline hover:bg-fill"
                >
                  View
                </a>
              </div>
              <button
                type="button"
                disabled={busy !== null}
                onClick={unpublish}
                className="self-start text-[13px] font-semibold text-danger disabled:opacity-40"
              >
                {busy === "unpublish" ? "Unpublishing…" : "Unpublish"}
              </button>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-1">
                <p className="text-[15px] font-semibold">Publish to the web</p>
                <p className="text-[13px] leading-snug text-label-secondary">
                  Anyone with the link can read it, heart it and rate it. You can unpublish at any
                  time.
                </p>
              </div>
              <label className="flex flex-col gap-1.5 text-[13px] font-medium text-label-secondary">
                Name shown to readers
                <input
                  value={author}
                  onChange={(event) => setAuthor(event.target.value)}
                  maxLength={80}
                  placeholder="Your name or pen name"
                  className="rounded-[10px] bg-fill px-3 py-2.5 text-[15px] text-label outline-none focus:ring-2 focus:ring-accent/60"
                />
              </label>
              <Button variant="primary" disabled={busy !== null} onClick={publish}>
                {busy === "publish" ? "Publishing…" : "Publish"}
              </Button>
            </>
          )}
          {error && (
            <p role="alert" className={cn("text-[13px] text-danger")}>
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
