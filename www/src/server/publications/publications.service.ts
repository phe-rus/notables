import { createId, type NoteKind, type Reaction } from "@notables/core";
import {
  decodeBase64,
  MAX_MEDIA_BYTES,
  mediaKey,
  mediaPrefix,
  type PublicationMediaUpload,
  rewriteMediaSources,
} from "./publication-media";

/** Largest serialized document accepted for publishing (inline photos included). */
export const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024;

export class PublicationError extends Error {
  constructor(
    readonly status: 400 | 403 | 404 | 413,
    message: string,
  ) {
    super(message);
    this.name = "PublicationError";
  }
}

export interface PublicationStats {
  views: number;
  reads: number;
  likes: number;
  hearts: number;
  rating: number | null;
  ratings: number;
}

export interface Publication {
  id: string;
  kind: NoteKind;
  title: string;
  excerpt: string;
  authorName: string;
  readingMinutes: number;
  publishedAt: number;
  updatedAt: number;
  stats: PublicationStats;
}

export interface PublishInput {
  noteId: string;
  kind: NoteKind;
  title: string;
  excerpt: string;
  authorName: string;
  readingMinutes: number;
  document: unknown;
  /** Device media the document references, uploaded with it. */
  media?: PublicationMediaUpload[];
  /** The key from a previous publish of this note, to update it. */
  key?: string;
}

interface Row {
  id: string;
  note_id: string;
  key_hash: string;
  kind: NoteKind;
  title: string;
  excerpt: string;
  author_name: string;
  reading_minutes: number;
  published_at: number;
  updated_at: number;
  view_count: number;
  read_count: number;
  like_count: number;
  heart_count: number;
  rating_sum: number;
  rating_count: number;
}

const toPublication = (row: Row): Publication => ({
  id: row.id,
  kind: row.kind,
  title: row.title,
  excerpt: row.excerpt,
  authorName: row.author_name,
  readingMinutes: row.reading_minutes,
  publishedAt: row.published_at,
  updatedAt: row.updated_at,
  stats: {
    views: row.view_count,
    reads: row.read_count,
    likes: row.like_count,
    hearts: row.heart_count,
    rating: row.rating_count ? Math.round((row.rating_sum / row.rating_count) * 10) / 10 : null,
    ratings: row.rating_count,
  },
});

const contentKey = (id: string) => `publications/${id}.json`;

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

function newKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Constant-time comparison of two equal-length hex strings. */
function sameHash(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Publishing and social interactions. Takes its storage as arguments so it
 * runs unchanged in the Worker and in tests.
 */
export function createPublications(db: D1Database, storage: R2Bucket) {
  async function find(id: string): Promise<Row> {
    const row = await db.prepare("SELECT * FROM publications WHERE id = ?").bind(id).first<Row>();
    if (!row) throw new PublicationError(404, "Publication not found");
    return row;
  }

  async function authorize(row: Row, key: string | undefined): Promise<void> {
    if (!key || !sameHash(await sha256(key), row.key_hash)) {
      throw new PublicationError(403, "This device can't change that publication");
    }
  }

  /** Makes the publication's media exactly `uploads`, removing files no longer used. */
  async function replaceMedia(
    publicationId: string,
    uploads: Array<{ id: string; contentType: string; bytes: Uint8Array }>,
  ): Promise<void> {
    const keep = new Set(uploads.map((file) => mediaKey(publicationId, file.id)));
    const existing = await storage.list({ prefix: mediaPrefix(publicationId) });
    const stale = existing.objects.map((object) => object.key).filter((key) => !keep.has(key));
    if (stale.length) await storage.delete(stale);
    await Promise.all(
      uploads.map((file) =>
        storage.put(mediaKey(publicationId, file.id), file.bytes, {
          httpMetadata: {
            contentType: file.contentType,
            cacheControl: "public, max-age=31536000, immutable",
          },
        }),
      ),
    );
  }

  return {
    /** Publishes a note, or updates its publication when given its key. */
    async publish(input: PublishInput): Promise<{ publication: Publication; key: string }> {
      if (
        new TextEncoder().encode(JSON.stringify(input.document)).byteLength > MAX_DOCUMENT_BYTES
      ) {
        throw new PublicationError(413, "This note is too large to publish");
      }
      const uploads = (input.media ?? []).map((file) => ({
        ...file,
        bytes: decodeBase64(file.data),
      }));
      if (uploads.reduce((total, file) => total + file.bytes.byteLength, 0) > MAX_MEDIA_BYTES) {
        throw new PublicationError(
          413,
          "This note's recordings and photos are too large to publish",
        );
      }

      const existing = await db
        .prepare("SELECT * FROM publications WHERE note_id = ?")
        .bind(input.noteId)
        .first<Row>();
      if (existing) await authorize(existing, input.key);

      const id = existing?.id ?? createId();
      const key = existing && input.key ? input.key : newKey();
      const now = Date.now();

      await replaceMedia(id, uploads);
      await storage.put(contentKey(id), JSON.stringify(rewriteMediaSources(input.document, id)), {
        httpMetadata: { contentType: "application/json" },
      });
      await db
        .prepare(
          `INSERT INTO publications
             (id, note_id, key_hash, kind, title, excerpt, author_name, reading_minutes, published_at, updated_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?9)
           ON CONFLICT (note_id) DO UPDATE SET
             kind = excluded.kind, title = excluded.title, excerpt = excluded.excerpt,
             author_name = excluded.author_name, reading_minutes = excluded.reading_minutes,
             updated_at = excluded.updated_at`,
        )
        .bind(
          id,
          input.noteId,
          await sha256(key),
          input.kind,
          input.title,
          input.excerpt,
          input.authorName,
          input.readingMinutes,
          now,
        )
        .run();

      return { publication: toPublication(await find(id)), key };
    },

    /** Removes the publication, its content and all social data. */
    async unpublish(id: string, key: string): Promise<void> {
      const row = await find(id);
      await authorize(row, key);
      await db.batch([
        db.prepare("DELETE FROM reactions WHERE publication_id = ?").bind(id),
        db.prepare("DELETE FROM ratings WHERE publication_id = ?").bind(id),
        db.prepare("DELETE FROM publications WHERE id = ?").bind(id),
      ]);
      await storage.delete(contentKey(id));
      await replaceMedia(id, []);
    },

    /** A published media file, optionally a byte range of it (for audio seeking). */
    async media(publicationId: string, mediaId: string, range?: R2Range) {
      return storage.get(mediaKey(publicationId, mediaId), range ? { range } : undefined);
    },

    /** The publication and its serialized document, as JSON text. */
    async get(id: string): Promise<{ publication: Publication; document: string }> {
      const row = await find(id);
      const object = await storage.get(contentKey(id));
      if (!object) throw new PublicationError(404, "Publication not found");
      return { publication: toPublication(row), document: await object.text() };
    },

    async viewerState(id: string, viewerId: string) {
      const [reactions, rating] = await db.batch<{ reaction?: Reaction; stars?: number }>([
        db
          .prepare("SELECT reaction FROM reactions WHERE publication_id = ? AND viewer_id = ?")
          .bind(id, viewerId),
        db
          .prepare("SELECT stars FROM ratings WHERE publication_id = ? AND viewer_id = ?")
          .bind(id, viewerId),
      ]);
      return {
        reactions: (reactions?.results ?? []).map((r) => r.reaction as Reaction),
        rating: rating?.results[0]?.stars ?? null,
      };
    },

    async recordView(id: string): Promise<void> {
      await db
        .prepare("UPDATE publications SET view_count = view_count + 1 WHERE id = ?")
        .bind(id)
        .run();
    },

    async recordRead(id: string): Promise<void> {
      await db
        .prepare("UPDATE publications SET read_count = read_count + 1 WHERE id = ?")
        .bind(id)
        .run();
    },

    /** Adds or removes a like/heart; idempotent per viewer. */
    async react(
      id: string,
      viewerId: string,
      reaction: Reaction,
      on: boolean,
    ): Promise<PublicationStats> {
      await find(id);
      const column = reaction === "heart" ? "heart_count" : "like_count";
      const change = on
        ? await db
            .prepare(
              "INSERT OR IGNORE INTO reactions (publication_id, viewer_id, reaction, created_at) VALUES (?, ?, ?, ?)",
            )
            .bind(id, viewerId, reaction, Date.now())
            .run()
        : await db
            .prepare(
              "DELETE FROM reactions WHERE publication_id = ? AND viewer_id = ? AND reaction = ?",
            )
            .bind(id, viewerId, reaction)
            .run();
      if (change.meta.changes > 0) {
        await db
          .prepare(`UPDATE publications SET ${column} = ${column} + ? WHERE id = ?`)
          .bind(on ? 1 : -1, id)
          .run();
      }
      return toPublication(await find(id)).stats;
    },

    /** Rates 1–5 stars; rating again replaces the viewer's previous rating. */
    async rate(id: string, viewerId: string, stars: number): Promise<PublicationStats> {
      await find(id);
      const previous = await db
        .prepare("SELECT stars FROM ratings WHERE publication_id = ? AND viewer_id = ?")
        .bind(id, viewerId)
        .first<{ stars: number }>();
      await db.batch([
        db
          .prepare(
            `INSERT INTO ratings (publication_id, viewer_id, stars, created_at) VALUES (?, ?, ?, ?)
             ON CONFLICT (publication_id, viewer_id) DO UPDATE SET stars = excluded.stars`,
          )
          .bind(id, viewerId, stars, Date.now()),
        db
          .prepare(
            "UPDATE publications SET rating_sum = rating_sum + ?, rating_count = rating_count + ? WHERE id = ?",
          )
          .bind(stars - (previous?.stars ?? 0), previous ? 0 : 1, id),
      ]);
      return toPublication(await find(id)).stats;
    },
  };
}

export type Publications = ReturnType<typeof createPublications>;
