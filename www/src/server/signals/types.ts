import type { signals } from "./schema";

export type SignalInsert = typeof signals.$inferInsert;
export type StoredSignal = Pick<typeof signals.$inferSelect, "id" | "sender" | "payload">;
