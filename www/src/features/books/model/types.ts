import type { RefObject } from "react";
import type { Part } from "../store/book-store";

export type BookChapter = {
  noteId: string;
  title: string;
  /** Serialized note document, or null while this device waits for its content. */
  document: unknown | null;
  /** Set on the first chapter of a part. */
  part?: Part;
};

export type BookContentsProps = {
  open: boolean;
  anchor: RefObject<HTMLElement | null>;
  onClose: () => void;
  chapters: BookChapter[];
  currentChapter?: string;
  chapterPages: Record<string, number>;
  page: number;
  total: number;
  onChapter: (noteId: string) => void;
  onPage: (page: number) => void;
  onHighlights: () => void;
};

export type LoadedBookContent = {
  key: string;
  documents: Map<string, unknown>;
};
