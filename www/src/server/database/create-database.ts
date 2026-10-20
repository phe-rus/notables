import { drizzle } from "drizzle-orm/d1";

/** Request-owned connection: no bindings or I/O during module initialization. */
export function createDatabase(binding: D1Database) {
  return drizzle(binding);
}
