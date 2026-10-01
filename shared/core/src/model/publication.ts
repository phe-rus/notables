import { z } from "zod";
import { NoteKind } from "./note";
import { AccountId, Id, Timestamp } from "./primitives";

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
