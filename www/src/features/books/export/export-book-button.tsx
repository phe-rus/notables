import { Button, DownloadIcon, toast } from "@notables/ui";
import { useState } from "react";
import type { BookEntry } from "../store/book-store";
import { exportBookAsEpub } from "./export-book";

/** Downloads the book as an EPUB for Apple Books, Kobo and other readers. */
export function ExportBookButton({ book }: { book: BookEntry }) {
  const [exporting, setExporting] = useState(false);

  const exportBook = async () => {
    setExporting(true);
    try {
      await toast.promise(exportBookAsEpub(book), {
        loading: "Exporting your book…",
        success: "Book exported",
        error: "The book couldn’t be exported",
      });
    } catch (error) {
      console.error(error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button
      variant="secondary"
      disabled={exporting || book.chapterIds.length === 0}
      onClick={exportBook}
      data-tooltip="Export as EPUB"
      aria-label="Export as EPUB"
    >
      <DownloadIcon size={16} />
      <span className="max-sm:hidden">{exporting ? "Exporting…" : "Export"}</span>
    </Button>
  );
}
