import { cn } from "@ultrapeach/ui";
import type { ReactNode } from "react";
import { BookCover } from "../components/book-cover";
import type { BookEntry } from "../store/book-store";
import { FRONT_COVER, type Side } from "./book-stage";
import type { PageGeometry } from "./page-geometry";

/**
 * One face of the book: the front cover, the inside cover, a page of the
 * flow (a clipped window onto the multi-column text), or blank paper.
 */
export function BookPage({
  index,
  side,
  total,
  book,
  geometry,
  flow,
}: {
  index: number;
  side: Side;
  total: number;
  book: BookEntry;
  geometry: PageGeometry;
  flow: (offset: number) => ReactNode;
}) {
  if (index === FRONT_COVER) {
    return (
      <BookCover
        title={book.title}
        author={book.author}
        image={book.cover}
        className="h-full w-full rounded-[4px_16px_16px_4px]"
      />
    );
  }
  if (index === FRONT_COVER + 1) {
    return <div className="book-endpaper h-full w-full rounded-[16px_4px_4px_16px]" />;
  }

  const isPage = index >= 0 && index < total;
  return (
    <div
      className={cn(
        "book-paper relative h-full w-full overflow-hidden",
        side === "left" ? "is-left" : "is-right",
      )}
    >
      {isPage && (
        <>
          <div
            className="absolute overflow-hidden"
            style={{
              top: geometry.padding,
              left: geometry.padding,
              width: geometry.textWidth,
              height: geometry.textHeight,
            }}
          >
            {flow(index * (geometry.textWidth + geometry.columnGap))}
          </div>
          {index > 0 && (
            <span
              className="absolute inset-x-0 text-center font-serif text-footnote text-label-tertiary"
              style={{ bottom: geometry.padding * 0.6 }}
            >
              {index}
            </span>
          )}
        </>
      )}
    </div>
  );
}
