import type { Reaction } from "@notables/core";
import { and, count, eq, sql, sum } from "drizzle-orm";
import { createDatabase } from "@/server/database/create-database";
import { publications, ratings, reactions } from "./schema";
import type { PublicationInsert } from "./types";

/** Owns D1 queries and atomic counter updates; never handles private note storage. */
export function createPublicationRepository(binding: D1Database) {
  const db = createDatabase(binding);
  return {
    find: (id: string) => db.select().from(publications).where(eq(publications.id, id)).get(),
    findByNote: (id: string) =>
      db.select().from(publications).where(eq(publications.note_id, id)).get(),
    save: (record: PublicationInsert) =>
      db
        .insert(publications)
        .values(record)
        .onConflictDoUpdate({
          target: publications.note_id,
          set: {
            kind: record.kind,
            title: record.title,
            excerpt: record.excerpt,
            author_name: record.author_name,
            reading_minutes: record.reading_minutes,
            updated_at: record.updated_at,
          },
        })
        .run(),
    remove: (id: string) =>
      db.batch([
        db.delete(reactions).where(eq(reactions.publication_id, id)),
        db.delete(ratings).where(eq(ratings.publication_id, id)),
        db.delete(publications).where(eq(publications.id, id)),
      ]),
    async viewerState(id: string, viewerId: string) {
      const [reacted, rated] = await db.batch([
        db
          .select({ reaction: reactions.reaction })
          .from(reactions)
          .where(and(eq(reactions.publication_id, id), eq(reactions.viewer_id, viewerId))),
        db
          .select({ stars: ratings.stars })
          .from(ratings)
          .where(and(eq(ratings.publication_id, id), eq(ratings.viewer_id, viewerId))),
      ]);
      return { reactions: reacted.map((row) => row.reaction), rating: rated[0]?.stars ?? null };
    },
    recordView: (id: string) =>
      db
        .update(publications)
        .set({ view_count: sql`${publications.view_count} + 1` })
        .where(eq(publications.id, id))
        .run(),
    recordRead: (id: string) =>
      db
        .update(publications)
        .set({ read_count: sql`${publications.read_count} + 1` })
        .where(eq(publications.id, id))
        .run(),
    async react(id: string, viewerId: string, reaction: Reaction, on: boolean) {
      const change = on
        ? db
            .insert(reactions)
            .values({ publication_id: id, viewer_id: viewerId, reaction, created_at: Date.now() })
            .onConflictDoNothing()
        : db
            .delete(reactions)
            .where(
              and(
                eq(reactions.publication_id, id),
                eq(reactions.viewer_id, viewerId),
                eq(reactions.reaction, reaction),
              ),
            );
      const total = db
        .select({ count: count() })
        .from(reactions)
        .where(and(eq(reactions.publication_id, id), eq(reactions.reaction, reaction)));
      await db.batch([
        change,
        db
          .update(publications)
          .set(
            reaction === "heart"
              ? { heart_count: sql`(${total})` }
              : { like_count: sql`(${total})` },
          )
          .where(eq(publications.id, id)),
      ]);
    },
    async rate(id: string, viewerId: string, stars: number) {
      const total = db
        .select({ sum: sum(ratings.stars) })
        .from(ratings)
        .where(eq(ratings.publication_id, id));
      const votes = db
        .select({ count: count() })
        .from(ratings)
        .where(eq(ratings.publication_id, id));
      // D1 executes this batch atomically. Totals use the rows inside that batch,
      // so concurrent requests cannot reuse a stale, separately read rating.
      await db.batch([
        db
          .insert(ratings)
          .values({ publication_id: id, viewer_id: viewerId, stars, created_at: Date.now() })
          .onConflictDoUpdate({
            target: [ratings.publication_id, ratings.viewer_id],
            set: { stars },
          }),
        db
          .update(publications)
          .set({ rating_sum: sql`COALESCE((${total}), 0)`, rating_count: sql`(${votes})` })
          .where(eq(publications.id, id)),
      ]);
    },
  };
}
