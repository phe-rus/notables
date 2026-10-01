import { Button } from "@notables/ui";
import { useState } from "react";
import type { BookEntry } from "../store/book-store";
import { exportBookAsEpub } from "./export-book";

/** Downloads the book as an EPUB for Apple Books, Kobo and other readers. */
export function ExportBookButton({ book }: { book: BookEntry }) {
  const [exporting, setExporting] = useState(false);

  const exportBook = async () => {
    setExporting(true);
    try {
      await exportBookAsEpub(book);
    } catch (error) {
      console.error(error);
      window.alert("The book couldn’t be exported. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button
      variant="secondary"
      disabled={exporting || book.chapterIds.length === 0}
      onClick={exportBook}
      title="Export as EPUB"
    >
      {exporting ? "Exporting…" : "Export"}
    </Button>
  );
}
