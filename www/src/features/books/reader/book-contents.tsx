import { ChaptersIcon, CloseIcon, HighlighterIcon } from "@phe-rus/hino";
import { Button } from "@phe-rus/hino/button";
import { IconButton } from "@phe-rus/hino/icon-button";
import { Sheet } from "@phe-rus/hino/sheet";
import { TextField } from "@phe-rus/hino/text-field";
import { useState } from "react";
import { t } from "@/i18n/i18n";
import type { BookContentsProps } from "../model/types";

/** Chapter navigation and exact page entry share one compact reading surface. */
export function BookContents({
  open,
  onClose,
  chapters,
  currentChapter,
  page,
  total,
  onChapter,
  onPage,
  onHighlights,
}: BookContentsProps) {
  const [entry, setEntry] = useState("");
  const last = Math.max(0, total - 1);
  const requested = /^\d+$/.test(entry) ? Number(entry) : NaN;
  const valid = Number.isSafeInteger(requested) && requested >= 1 && requested <= last;
  const submit = () => {
    if (!valid) return;
    onPage(requested);
    setEntry("");
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} label={t("books.reader.contents")} className="max-w-md">
      <header className="flex items-center gap-3 px-5 pt-2 pb-4">
        <ChaptersIcon size={20} className="text-accent-text" />
        <h2 className="min-w-0 flex-1 text-title3 font-semibold">{t("books.reader.contents")}</h2>
        <IconButton size="icon-xs" variant="ghost" label={t("common.close")} onClick={onClose}>
          <CloseIcon size={18} />
        </IconButton>
      </header>
      <form
        className="border-y border-separator/50 bg-fill/30 px-5 py-3"
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
      <nav aria-label={t("books.reader.contents")} className="flex flex-col gap-1 px-3 py-3">
        <Button
          variant="ghost"
          size="sm"
          className="justify-start"
          onClick={() => {
            onPage(-2);
            onClose();
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
            onClose();
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
              className="h-auto! min-h-10 w-full justify-start py-2 text-start aria-current:bg-accent-soft aria-current:text-accent-text [&>span]:w-full [&>span]:justify-start"
              onClick={() => {
                onChapter(chapter.noteId);
                onClose();
              }}
            >
              <span className="w-6 shrink-0 text-caption text-label-tertiary tabular-nums">
                {index + 1}
              </span>
              <span className="min-w-0 text-subheadline [overflow-wrap:anywhere]">
                {chapter.title}
              </span>
            </Button>
          </div>
        ))}
      </nav>
      <footer className="border-t border-separator/50 px-5 py-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onClose();
            onHighlights();
          }}
        >
          <HighlighterIcon size={17} />
          {t("books.reader.highlights")}
        </Button>
      </footer>
    </Sheet>
  );
}
