import { Button, DownloadIcon, openContextMenu, toast } from "@notables/ui";
import { useState } from "react";
import { t } from "../../../i18n/i18n";
import type { BookEntry } from "../store/book-store";
import { type ExportFormat, exportBook, exportFormats, formatsFor } from "./export-book";

export async function runExport(book: BookEntry, format: ExportFormat) {
  const { label } = exportFormats[format];
  try {
    await toast.promise(exportBook(book, format), {
      loading: t("books.exportAs", { format: label }),
      success: (outcome) =>
        outcome === "saved" ? t("books.exportedAs", { format: label }) : t("books.exportCancelled"),
      error: (error) =>
        error instanceof Error && error.message ? error.message : t("books.exportFailed"),
    });
  } catch (error) {
    console.error(error);
  }
}

/** The menu of export formats for a book, for any context menu. */
export function exportMenuItems(book: BookEntry, onStart?: () => void, onEnd?: () => void) {
  return formatsFor(book).map((format) => ({
    label: `${exportFormats[format].label} · ${exportFormats[format].hint}`,
    onSelect: () => {
      onStart?.();
      void runExport(book, format).finally(onEnd);
    },
  }));
}

/** Saves the book in the format people need: e-book, PDF, Word, comic archive and more. */
export function ExportBookButton({ book }: { book: BookEntry }) {
  const [exporting, setExporting] = useState(false);

  return (
    <Button
      variant="secondary"
      disabled={exporting || book.chapterIds.length === 0}
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        openContextMenu(
          Math.max(12, rect.right - 300),
          rect.bottom + 6,
          exportMenuItems(
            book,
            () => setExporting(true),
            () => setExporting(false),
          ),
        );
      }}
      data-tooltip={t("books.exportBook")}
      aria-label={t("books.exportBook")}
    >
      <DownloadIcon size={16} />
      <span className="max-sm:hidden">
        {exporting ? `${t("books.export")}…` : t("books.export")}
      </span>
    </Button>
  );
}
