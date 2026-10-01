import { z } from "zod";
import { AccountId, Id, Timestamp } from "./primitives";

/**
 * Who can read a note. Social data (likes, comments, counts) only exists
 * for `public` notes, which are served from a publication snapshot.
 */
export const Visibility = z.enum(["private", "people", "circle", "public"]);
export type Visibility = z.infer<typeof Visibility>;

/** The kinds of surface a note can contain. */
export const SurfaceKind = z.enum(["text", "canvas", "audio", "media"]);
export type SurfaceKind = z.infer<typeof SurfaceKind>;

/** What a note is primarily used for; drives templates and discovery. */
export const NoteKind = z.enum(["note", "journal", "story", "article", "manga", "lesson", "plan"]);
export type NoteKind = z.infer<typeof NoteKind>;

/** Metadata kept in the local database and mirrored into the Yjs document. */
export const NoteMeta = z.object({
  id: Id,
  ownerId: AccountId,
  kind: NoteKind,
  title: z.string().max(300),
  surfaces: z.array(SurfaceKind).min(1),
  collectionId: Id.nullable(),
  pinned: z.boolean(),
  createdAt: Timestamp,
  updatedAt: Timestamp,
});
export type NoteMeta = z.infer<typeof NoteMeta>;

/** Notebooks, series and manga volumes. */
export const Collection = z.object({
  id: Id,
  ownerId: AccountId,
  name: z.string().min(1).max(120),
  kind: z.enum(["notebook", "series", "volume"]),
  createdAt: Timestamp,
});
export type Collection = z.infer<typeof Collection>;

/** An ordered compilation of notes, exportable as EPUB or PDF. */
export const Book = z.object({
  id: Id,
  ownerId: AccountId,
  title: z.string().min(1).max(200),
  subtitle: z.string().max(200).optional(),
  coverMediaId: Id.optional(),
  chapterNoteIds: z.array(Id),
  createdAt: Timestamp,
  updatedAt: Timestamp,
});
export type Book = z.infer<typeof Book>;

/** A time-aligned piece of an audio transcript. */
export const TranscriptSegment = z.object({
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().nonnegative(),
  text: z.string(),
  speaker: z.string().optional(),
});
export type TranscriptSegment = z.infer<typeof TranscriptSegment>;
