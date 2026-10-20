import { createSignalRepository } from "./signal-repository";

/** Messages older than this are of no use to a connecting device. */
export const SIGNAL_TTL_MS = 2 * 60 * 1000;
const MAX_BATCH = 100;

/** Expiry policy for encrypted introductions. Documents travel between devices. */
export function createSignals(db: D1Database, now = () => Date.now()) {
  const repository = createSignalRepository(db);
  return {
    async post(room: string, sender: string, recipient: string | null, payload: string) {
      const at = now();
      await repository.post(
        { room, sender, recipient, payload, created_at: at },
        at - SIGNAL_TTL_MS,
      );
    },
    poll: (room: string, me: string, after: number) =>
      repository.poll(room, me, after, now() - SIGNAL_TTL_MS, MAX_BATCH),
  };
}
