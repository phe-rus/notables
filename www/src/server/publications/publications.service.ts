import { createId, type Reaction } from "@notables/core";
import { PublicationError } from "./publication-error";
import {
  decodeBase64,
  MAX_MEDIA_BYTES,
  mediaKey,
  mediaPrefix,
  rewriteMediaSources,
} from "./publication-media";
import { createPublicationRepository } from "./publication-repository";
import { toPublication } from "./to-publication";
import type {
  Publication,
  PublicationMediaBytes,
  PublicationRecord,
  PublicationStats,
  PublishInput,
} from "./types";

/** Largest serialized document accepted for publishing (inline photos included). */
export const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024;

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
  const repository = createPublicationRepository(db);
  async function find(id: string): Promise<PublicationRecord> {
    const row = await repository.find(id);
    if (!row) throw new PublicationError(404, "Publication not found");
    return row;
  }

  async function authorize(row: PublicationRecord, key: string | undefined): Promise<void> {
    if (!key || !sameHash(await sha256(key), row.key_hash)) {
      throw new PublicationError(403, "This device can't change that publication");
    }
  }

  /** Makes the publication's media exactly `uploads`, removing files no longer used. */
  async function replaceMedia(
    publicationId: string,
    uploads: PublicationMediaBytes[],
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

      const existing = await repository.findByNote(input.noteId);
      if (existing) await authorize(existing, input.key);

      const id = existing?.id ?? createId();
      const key = existing && input.key ? input.key : newKey();
      const now = Date.now();

      await replaceMedia(id, uploads);
      await storage.put(contentKey(id), JSON.stringify(rewriteMediaSources(input.document, id)), {
        httpMetadata: { contentType: "application/json" },
      });
      await repository.save({
        id,
        note_id: input.noteId,
        key_hash: await sha256(key),
        kind: input.kind,
        title: input.title,
        excerpt: input.excerpt,
        author_name: input.authorName,
        reading_minutes: input.readingMinutes,
        published_at: now,
        updated_at: now,
      });

      return { publication: toPublication(await find(id)), key };
    },

    /** Removes the publication, its content and all social data. */
    async unpublish(id: string, key: string): Promise<void> {
      const row = await find(id);
      await authorize(row, key);
      await repository.remove(id);
      await storage.delete(contentKey(id));
      await replaceMedia(id, []);
    },

    /** The publication and its serialized document, as JSON text. */
    async get(id: string): Promise<{ publication: Publication; document: string }> {
      const row = await find(id);
      const object = await storage.get(contentKey(id));
      if (!object) throw new PublicationError(404, "Publication not found");
      return { publication: toPublication(row), document: await object.text() };
    },

    viewerState: repository.viewerState,
    async recordView(id: string): Promise<void> {
      await repository.recordView(id);
    },
    async recordRead(id: string): Promise<void> {
      await repository.recordRead(id);
    },

    /** Adds or removes a like/heart; idempotent per viewer. */
    async react(
      id: string,
      viewerId: string,
      reaction: Reaction,
      on: boolean,
    ): Promise<PublicationStats> {
      await find(id);
      await repository.react(id, viewerId, reaction, on);
      return toPublication(await find(id)).stats;
    },

    /** Rates 1–5 stars; rating again replaces the viewer's previous rating. */
    async rate(id: string, viewerId: string, stars: number): Promise<PublicationStats> {
      await find(id);
      await repository.rate(id, viewerId, stars);
      return toPublication(await find(id)).stats;
    },
  };
}
