/**
 * The signalling mailbox for peer-to-peer sharing. It only stores
 * encrypted introductions for a couple of minutes; notes themselves
 * travel directly between devices.
 */

/** Messages older than this are of no use to a connecting device. */
export const SIGNAL_TTL_MS = 2 * 60 * 1000;
const MAX_BATCH = 100;

export interface StoredSignal {
  id: number;
  sender: string;
  payload: string;
}

export function createSignals(db: D1Database, now = () => Date.now()) {
  return {
    async post(room: string, sender: string, recipient: string | null, payload: string) {
      const at = now();
      await db.batch([
        db
          .prepare(
            "INSERT INTO signals (room, sender, recipient, payload, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
          )
          .bind(room, sender, recipient, payload, at),
        // Tidy as we go: nothing here is worth keeping.
        db.prepare("DELETE FROM signals WHERE created_at < ?1").bind(at - SIGNAL_TTL_MS),
      ]);
    },

    /** New messages for `me` after `after`, and the id to ask from next time. */
    async poll(room: string, me: string, after: number) {
      const since = now() - SIGNAL_TTL_MS;
      const { results } = await db
        .prepare(
          `SELECT id, sender, payload FROM signals
           WHERE room = ?1 AND id > ?2 AND created_at >= ?3 AND sender != ?4
             AND (recipient IS NULL OR recipient = ?4)
           ORDER BY id LIMIT ${MAX_BATCH}`,
        )
        .bind(room, after, since, me)
        .all<StoredSignal>();
      const latest = await db
        .prepare("SELECT COALESCE(MAX(id), 0) AS id FROM signals WHERE room = ?1")
        .bind(room)
        .first<{ id: number }>();
      return {
        signals: results,
        cursor:
          results.length === MAX_BATCH ? (results.at(-1)?.id ?? after) : (latest?.id ?? after),
      };
    },
  };
}
