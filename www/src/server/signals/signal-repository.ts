import { and, asc, eq, gt, gte, isNull, lt, max, ne, or, sql } from "drizzle-orm";
import { createDatabase } from "@/server/database/create-database";
import { signals } from "./schema";
import type { SignalInsert } from "./types";

/** Only encrypted, expiring introductions live in this repository. */
export function createSignalRepository(binding: D1Database) {
  const db = createDatabase(binding);
  return {
    post: (record: SignalInsert, expiresBefore: number) =>
      db.batch([
        db.insert(signals).values(record),
        db.delete(signals).where(lt(signals.created_at, expiresBefore)),
      ]),
    async poll(room: string, me: string, after: number, since: number, limit: number) {
      // Read the messages and cursor together: an arrival between separate reads
      // must not advance the cursor past a message we never delivered.
      const [messages, latest] = await db.batch([
        db
          .select({ id: signals.id, sender: signals.sender, payload: signals.payload })
          .from(signals)
          .where(
            and(
              eq(signals.room, room),
              gt(signals.id, after),
              gte(signals.created_at, since),
              ne(signals.sender, me),
              or(isNull(signals.recipient), eq(signals.recipient, me)),
            ),
          )
          .orderBy(asc(signals.id))
          .limit(limit),
        db
          .select({ id: sql<number>`COALESCE(${max(signals.id)}, 0)` })
          .from(signals)
          .where(eq(signals.room, room)),
      ]);
      return {
        signals: messages,
        cursor:
          messages.length === limit ? (messages.at(-1)?.id ?? after) : (latest[0]?.id ?? after),
      };
    },
  };
}
