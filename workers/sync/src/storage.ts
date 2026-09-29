/**
 * Persists a Yjs state vector in Durable Object SQLite, split into chunks to
 * stay well below the per-row size limit for large notes.
 */
const CHUNK_SIZE = 512 * 1024;

export class DocumentStore {
  constructor(private readonly sql: SqlStorage) {
    sql.exec(`
      CREATE TABLE IF NOT EXISTS doc_chunks (idx INTEGER PRIMARY KEY, data BLOB NOT NULL);
      CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    `);
  }

  loadState(): Uint8Array | null {
    const chunks = this.sql
      .exec<{ data: ArrayBuffer }>("SELECT data FROM doc_chunks ORDER BY idx")
      .toArray()
      .map((row) => new Uint8Array(row.data));
    if (chunks.length === 0) return null;

    const state = new Uint8Array(chunks.reduce((n, c) => n + c.byteLength, 0));
    let offset = 0;
    for (const chunk of chunks) {
      state.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return state;
  }

  saveState(state: Uint8Array): void {
    this.sql.exec("DELETE FROM doc_chunks");
    for (let idx = 0, offset = 0; offset < state.byteLength; idx++, offset += CHUNK_SIZE) {
      this.sql.exec(
        "INSERT INTO doc_chunks (idx, data) VALUES (?, ?)",
        idx,
        state.slice(offset, offset + CHUNK_SIZE),
      );
    }
  }

  getMeta(key: string): string | null {
    const row = this.sql
      .exec<{ value: string }>("SELECT value FROM meta WHERE key = ?", key)
      .toArray()[0];
    return row?.value ?? null;
  }

  setMeta(key: string, value: string): void {
    this.sql.exec(
      "INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      key,
      value,
    );
  }
}
