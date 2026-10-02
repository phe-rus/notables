import {
  Button,
  cn,
  GlobeIcon,
  IconButton,
  LinkIcon,
  Popover,
  toast,
  useDismiss,
} from "@notables/ui";
import { useCallback, useId, useRef, useState } from "react";
import type * as Y from "yjs";
import { getAuthorName } from "../../../platform/author-preferences";
import type { LibraryEntry } from "../../library/store/library-store";
import { useNotePublication } from "../hooks/use-note-publication";

/**
 * Publish, update and unpublish a note. Lives inside the editor so it can
 * snapshot the current document.
 */
export function PublishControl({ entry, doc }: { entry: LibraryEntry; doc: Y.Doc }) {
  const {
    isPublished: published,
    link,
    pending: busy,
    error,
    publish: publishAs,
    unpublish: remove,
  } = useNotePublication(entry, doc);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [author, setAuthor] = useState(getAuthorName);
  const panelId = useId();
  const root = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);
  useDismiss(root, open, close);

  const publish = async () => {
    const wasPublished = published;
    if (await publishAs(author)) {
      toast.success(wasPublished ? "Publication updated" : "Published", {
        description: wasPublished
          ? "Readers now see this version."
          : "Anyone with the link can read it.",
      });
    }
  };
  const unpublish = async () => {
    if (await remove()) {
      setOpen(false);
      toast("Unpublished", { description: "The public link no longer works." });
    }
  };

  const copy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    toast.success("Link copied");
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

      <Popover
        open={open}
        id={panelId}
        role="dialog"
        aria-label={published ? "Publication" : "Publish"}
        origin="top-right"
        className="top-[calc(100%+10px)] right-0 flex w-[320px] max-w-[calc(100vw-24px)] flex-col gap-3 p-4"
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
              className="flex items-center gap-2 rounded-full bg-fill px-3.5 py-2.5 text-left text-[13px] text-label-secondary transition-colors hover:bg-separator/60"
            >
              <LinkIcon size={15} className="shrink-0 text-accent-text" />
              <span className="truncate">{link}</span>
              <span className="ml-auto shrink-0 font-semibold text-accent-text">
                {copied ? "Copied" : "Copy"}
              </span>
            </button>
            <div className="flex gap-2">
              <Button variant="primary" className="grow" disabled={busy !== null} onClick={publish}>
                {busy === "publish" ? "Updating…" : "Update"}
              </Button>
              <a
                href={link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-[34px] items-center rounded-full border border-separator px-3.5 text-[14px] font-semibold text-label no-underline hover:bg-fill"
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
                className="rounded-[14px] bg-fill px-3.5 py-2.5 text-[15px] text-label outline-none focus:ring-2 focus:ring-accent/60"
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
      </Popover>
    </div>
  );
}
