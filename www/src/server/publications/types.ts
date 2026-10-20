import type { NoteKind } from "@notables/core";
import type { createPublications } from "./publications.service";
import type { publications } from "./schema";

export type PublicationMediaUpload = {
  /** The id the private note uses (`media:<id>`). */
  id: string;
  contentType: string;
  /** Base64-encoded file. */
  data: string;
};

export type PublicationMediaBytes = Pick<PublicationMediaUpload, "id" | "contentType"> & {
  bytes: Uint8Array;
};

export type PublicationStats = {
  views: number;
  reads: number;
  likes: number;
  hearts: number;
  rating: number | null;
  ratings: number;
};

export type Publication = {
  id: string;
  kind: NoteKind;
  title: string;
  excerpt: string;
  authorName: string;
  readingMinutes: number;
  publishedAt: number;
  updatedAt: number;
  stats: PublicationStats;
};

export type PublishInput = {
  noteId: string;
  kind: NoteKind;
  title: string;
  excerpt: string;
  authorName: string;
  readingMinutes: number;
  document: unknown;
  /** Device media the document references, uploaded with it. */
  media?: PublicationMediaUpload[];
  /** The key from a previous publish of this note, to update it. */
  key?: string;
};

export type PublicationRecord = typeof publications.$inferSelect;
export type PublicationInsert = typeof publications.$inferInsert;
export type Publications = ReturnType<typeof createPublications>;
