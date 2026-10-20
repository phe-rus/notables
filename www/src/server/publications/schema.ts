import type { NoteKind, Reaction } from "@notables/core";
import { desc, sql } from "drizzle-orm";
import { check, index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** Mirrors 0001_publications.sql; existing Wrangler migrations remain authoritative. */
export const publications = sqliteTable(
  "publications",
  {
    id: text().primaryKey(),
    note_id: text().notNull().unique(),
    key_hash: text().notNull(),
    kind: text().$type<NoteKind>().notNull(),
    title: text().notNull(),
    excerpt: text().notNull(),
    author_name: text().notNull(),
    reading_minutes: integer().notNull(),
    published_at: integer().notNull(),
    updated_at: integer().notNull(),
    view_count: integer().notNull().default(0),
    read_count: integer().notNull().default(0),
    like_count: integer().notNull().default(0),
    heart_count: integer().notNull().default(0),
    rating_sum: integer().notNull().default(0),
    rating_count: integer().notNull().default(0),
  },
  (table) => [index("publications_recent").on(desc(table.published_at))],
);

export const reactions = sqliteTable(
  "reactions",
  {
    publication_id: text()
      .notNull()
      .references(() => publications.id, { onDelete: "cascade" }),
    viewer_id: text().notNull(),
    reaction: text().$type<Reaction>().notNull(),
    created_at: integer().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.publication_id, table.viewer_id, table.reaction] }),
    check("reaction_kind", sql`${table.reaction} IN ('like', 'heart')`),
  ],
);

export const ratings = sqliteTable(
  "ratings",
  {
    publication_id: text()
      .notNull()
      .references(() => publications.id, { onDelete: "cascade" }),
    viewer_id: text().notNull(),
    stars: integer().notNull(),
    created_at: integer().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.publication_id, table.viewer_id] }),
    check("rating_range", sql`${table.stars} BETWEEN 1 AND 5`),
  ],
);
