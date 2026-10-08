import { DocumentView } from "@notables/pluraliti";
import { type CSSProperties, memo } from "react";
import { stripLeadingTitle } from "../../../lib/documents/strip-leading-title";
import type { BookEntry } from "../store/book-store";
import type { PageGeometry } from "./page-geometry";
import type { BookChapter } from "./use-book-content";

/**
 * The whole book as one multi-column flow: each column is exactly one
 * page, so the browser's own typography decides where pages break.
 */
export const BookFlow = memo(function BookFlow({
  book,
  chapters,
  geometry,
  style,
}: {
  book: BookEntry;
  chapters: BookChapter[];
  geometry: PageGeometry;
  style?: CSSProperties;
}) {
  return (
    <div
      className="book-flow"
      style={{
        width: geometry.textWidth,
        height: geometry.textHeight,
        columnWidth: geometry.textWidth,
        columnGap: geometry.columnGap,
        columnFill: "auto",
        ...style,
      }}
    >
      <section className="book-title-page">
        <h1>{book.title || "Untitled"}</h1>
        {book.subtitle && <p className="book-subtitle">{book.subtitle}</p>}
        {book.author && <p className="book-author">{book.author}</p>}
      </section>
      {chapters.map((chapter, index) => [
        chapter.part && (
          <section key={chapter.part.id} className="book-part">
            <h2>{chapter.part.title}</h2>
          </section>
        ),
        <section key={chapter.noteId} className="book-chapter" data-chapter={chapter.noteId}>
          <p className="book-chapter-number">Chapter {index + 1}</p>
          <h2 className="book-chapter-title">{chapter.title}</h2>
          {chapter.document ? (
            <DocumentView document={stripLeadingTitle(chapter.document, chapter.title)} />
          ) : (
            <p className="book-missing">Open this note once on this device to include it.</p>
          )}
        </section>,
      ])}
    </div>
  );
});
