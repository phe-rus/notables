import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** Mirrors 0002_signals.sql, including its expiry and room indexes. */
export const signals = sqliteTable(
  "signals",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    room: text().notNull(),
    sender: text().notNull(),
    recipient: text(),
    payload: text().notNull(),
    created_at: integer().notNull(),
  },
  (table) => [
    index("signals_room").on(table.room, table.id),
    index("signals_age").on(table.created_at),
  ],
);
