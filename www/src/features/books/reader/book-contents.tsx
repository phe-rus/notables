import { ChaptersIcon, CloseIcon, HighlighterIcon, Popover, useDismiss } from "@phe-rus/hino";
import { Button } from "@phe-rus/hino/button";
import { IconButton } from "@phe-rus/hino/icon-button";
import { TextField } from "@phe-rus/hino/text-field";
import { useState } from "react";
import { t } from "@/i18n/i18n";
import type { BookContentsProps } from "../model/types";

/** Chapter navigation and exact page entry share one compact reading surface. */
export function BookContents({
  open,
  anchor,
  onClose,
  chapters,
  currentChapter,
  chapterPages,
  page,
  total,
  onChapter,
  onPage,
  onHighlights,
}: BookContentsProps) {
  const [entry, setEntry] = useState("");
  const [pageEntry, setPageEntry] = useState(false);
  const close = () => {
    anchor.current?.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
    setPageEntry(false);
    setEntry("");
    onClose();
  };
  useDismiss(anchor, open, close);
  const last = Math.max(0, total - 1);
  const requested = /^\d+$/.test(entry) ? Number(entry) : NaN;
  const valid = Number.isSafeInteger(requested) && requested >= 1 && requested <= last;
  const submit = () => {
    if (!valid) return;
    onPage(requested);
    setEntry("");
    close();
  };

  return (
    <Popover
      open={open}
      role="dialog"
      aria-label={t("books.reader.contents")}
      origin="top-right"
      className="end-0 top-[calc(100%+8px)] flex w-72 max-h-[min(420px,calc(100dvh-110px))] flex-col overflow-hidden"
    >
      <header className="flex shrink-0 items-center gap-2 px-3 py-2">
        <ChaptersIcon size={17} className="text-accent-text" />
        <h2 className="min-w-0 flex-1 text-subheadline font-semibold">
          {t("books.reader.contents")}
        </h2>
        <IconButton size="icon-xs" variant="ghost" label={t("common.close")} onClick={close}>
          <CloseIcon size={18} />
        </IconButton>
      </header>
      <div className="flex items-center justify-between gap-3 shrink-0 border-t border-separator/50 px-3 py-1.5">
        <span className="text-caption text-label-secondary tabular-nums">
          {t("books.reader.position", { page: Math.max(0, page), total: last })}
        </span>
        <Button variant="ghost" size="xs" onClick={() => setPageEntry((shown) => !shown)}>
          {t("books.reader.goToPage")}
        </Button>
      </div>
      {pageEntry && (
        <form
          className="shrink-0 border-y border-separator/50 bg-fill/30 px-3 py-2"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <TextField
            label={t("books.reader.goToPage")}
            inputMode="numeric"
            pattern="[0-9]*"
            value={entry}
            placeholder={String(Math.max(1, page))}
            onChange={(event) => setEntry(event.target.value)}
            className="h-9! text-subheadline"
            errors={entry && !valid ? [t("books.reader.pageRange", { total: last })] : []}
            action={
              <Button type="submit" size="xs" disabled={!valid}>
                {t("books.reader.go")}
              </Button>
            }
          />
        </form>
      )}
      <nav
        aria-label={t("books.reader.contents")}
        className="flex min-h-0 flex-1 touch-pan-y flex-col gap-0.5 overflow-y-auto overscroll-contain px-1.5 py-1.5"
      >
        <Button
          variant="ghost"
          size="sm"
          className="justify-start"
          onClick={() => {
            onPage(-2);
            close();
          }}
        >
          {t("books.reader.cover")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="justify-start"
          onClick={() => {
            onPage(0);
            close();
          }}
        >
          {t("books.reader.titlePage")}
        </Button>
        {chapters.map((chapter, index) => (
          <div key={chapter.noteId}>
            {chapter.part && (
              <p className="px-3 pt-4 pb-2 text-caption font-medium text-label-secondary">
                {chapter.part.title}
              </p>
            )}
            <Button
              variant="ghost"
              size="sm"
              aria-current={currentChapter === chapter.noteId ? "location" : undefined}
              className="h-auto! min-h-9 w-full justify-start py-2 text-start aria-current:bg-accent-soft aria-current:text-accent-text [&>span]:w-full [&>span]:justify-start"
              onClick={() => {
                onChapter(chapter.noteId);
                close();
              }}
            >
              <span className="w-6 shrink-0 text-caption text-label-tertiary tabular-nums">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 text-footnote font-normal [overflow-wrap:anywhere]">
                {chapter.title}
              </span>
              <span className="shrink-0 text-caption text-label-secondary tabular-nums">
                {chapterPages[chapter.noteId] ?? ""}
              </span>
            </Button>
          </div>
        ))}
      </nav>
      <footer className="shrink-0 border-t border-separator/50 px-3 py-1.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            close();
            onHighlights();
          }}
        >
          <HighlighterIcon size={17} />
          {t("books.reader.highlights")}
        </Button>
      </footer>
    </Popover>
  );
}
