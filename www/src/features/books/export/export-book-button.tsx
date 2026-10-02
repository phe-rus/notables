import { Button, DownloadIcon, openContextMenu, toast } from "@notables/ui";
import { useState } from "react";
import type { BookEntry } from "../store/book-store";
import { type ExportFormat, exportBook, exportFormats, formatsFor } from "./export-book";

export async function runExport(book: BookEntry, format: ExportFormat) {
  const { label } = exportFormats[format];
  try {
    await toast.promise(exportBook(book, format), {
      loading: `Exporting as ${label}…`,
      success: (outcome) => (outcome === "saved" ? `Exported as ${label}` : "Export cancelled"),
      error: (error) =>
        error instanceof Error && error.message ? error.message : "The book couldn’t be exported",
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
      data-tooltip="Export the book"
      aria-label="Export the book"
    >
      <DownloadIcon size={16} />
      <span className="max-sm:hidden">{exporting ? "Exporting…" : "Export"}</span>
    </Button>
  );
}
