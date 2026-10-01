import { z } from "zod";

export const Id = z.uuid();

/**
 * Account identifiers are issued by the identity provider (the OIDC `sub`
 * claim), so they are opaque strings rather than Notables ids.
 */
export const AccountId = z.string().min(1).max(255);

/** Milliseconds since the Unix epoch. */
export const Timestamp = z.number().int().nonnegative();

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

export const Role = z.enum(["viewer", "commenter", "editor"]);
export type Role = z.infer<typeof Role>;

export const Grant = z.object({
  accountId: AccountId,
  role: Role,
});
export type Grant = z.infer<typeof Grant>;

export const Access = z.discriminatedUnion("visibility", [
  z.object({ visibility: z.literal("private") }),
  z.object({ visibility: z.literal("people"), grants: z.array(Grant) }),
  z.object({ visibility: z.literal("circle"), circleId: Id, role: Role }),
  z.object({ visibility: z.literal("public"), publicationId: Id }),
]);
export type Access = z.infer<typeof Access>;

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

/** A named group of accounts, e.g. "Family" or "Close friends". */
export const Circle = z.object({
  id: Id,
  ownerId: AccountId,
  name: z.string().min(1).max(80),
  memberIds: z.array(AccountId),
});
export type Circle = z.infer<typeof Circle>;

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

/** The public, read-only snapshot served when a note is published. */
export const Publication = z.object({
  id: Id,
  noteId: Id,
  authorId: AccountId,
  kind: NoteKind,
  title: z.string(),
  excerpt: z.string().max(500),
  publishedAt: Timestamp,
});
export type Publication = z.infer<typeof Publication>;

export const Reaction = z.enum(["like", "heart"]);
export type Reaction = z.infer<typeof Reaction>;

export const Rating = z.number().int().min(1).max(5);
