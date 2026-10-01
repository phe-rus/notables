import { createId, NoteKind, Rating, Reaction } from "@notables/core";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import type { AppEnv } from "../env";
import { requireAccount } from "../middleware";

const MAX_STATE_BYTES = 10 * 1024 * 1024;

const PublishBody = z.object({
  noteId: z.uuid(),
  kind: NoteKind,
  title: z.string().min(1).max(300),
  excerpt: z.string().max(500),
  /** Base64-encoded Yjs update produced by `createPublicationSnapshot`. */
  state: z.base64(),
});

const CommentBody = z.object({
  body: z.string().trim().min(1).max(5000),
  parentId: z.uuid().optional(),
});

interface PublicationRow {
  id: string;
  note_id: string;
  author_id: string;
  kind: string;
  title: string;
  excerpt: string;
  published_at: number;
  updated_at: number;
  view_count: number;
  read_count: number;
  like_count: number;
  heart_count: number;
  rating_sum: number;
  rating_count: number;
  comment_count: number;
}

const toPublication = (row: PublicationRow) => ({
  id: row.id,
  noteId: row.note_id,
  authorId: row.author_id,
  kind: row.kind,
  title: row.title,
  excerpt: row.excerpt,
  publishedAt: row.published_at,
  updatedAt: row.updated_at,
  stats: {
    views: row.view_count,
    reads: row.read_count,
    likes: row.like_count,
    hearts: row.heart_count,
    comments: row.comment_count,
    rating: row.rating_count ? Math.round((row.rating_sum / row.rating_count) * 10) / 10 : null,
    ratings: row.rating_count,
  },
});

const stateKey = (id: string) => `publications/${id}.yjs`;

async function parse<T extends z.ZodType>(schema: T, request: Request): Promise<z.infer<T>> {
  const result = schema.safeParse(await request.json().catch(() => null));
  if (!result.success) throw new HTTPException(400, { message: z.prettifyError(result.error) });
  return result.data;
}

async function findPublication(db: D1Database, id: string): Promise<PublicationRow> {
  const row = await db
    .prepare("SELECT * FROM publications WHERE id = ?")
    .bind(id)
    .first<PublicationRow>();
  if (!row) throw new HTTPException(404, { message: "publication not found" });
  return row;
}

export const publications = new Hono<AppEnv>()
  /** Recent publications, newest first. Cursor is the last `publishedAt`. */
  .get("/", async (c) => {
    const limit = Math.min(Number(c.req.query("limit") ?? 20) || 20, 50);
    const before = Number(c.req.query("before")) || Number.MAX_SAFE_INTEGER;
    const author = c.req.query("author");

    const query = author
      ? c.env.DB.prepare(
          "SELECT * FROM publications WHERE author_id = ? AND published_at < ? ORDER BY published_at DESC LIMIT ?",
        ).bind(author, before, limit)
      : c.env.DB.prepare(
          "SELECT * FROM publications WHERE published_at < ? ORDER BY published_at DESC LIMIT ?",
        ).bind(before, limit);

    const { results } = await query.all<PublicationRow>();
    return c.json({ items: results.map(toPublication) });
  })

  /** Publish or re-publish a note. Re-publishing keeps the id and stats. */
  .post("/", async (c) => {
    const accountId = requireAccount(c.get("principal"));
    const body = await parse(PublishBody, c.req.raw);
    const state = Uint8Array.from(atob(body.state), (ch) => ch.charCodeAt(0));
    if (state.byteLength > MAX_STATE_BYTES) {
      throw new HTTPException(413, { message: "publication too large" });
    }

    const existing = await c.env.DB.prepare(
      "SELECT id, author_id FROM publications WHERE note_id = ?",
    )
      .bind(body.noteId)
      .first<{ id: string; author_id: string }>();
    if (existing && existing.author_id !== accountId) {
      throw new HTTPException(403, { message: "not the author of this note" });
    }

    const id = existing?.id ?? createId();
    const now = Date.now();
    await c.env.MEDIA.put(stateKey(id), state, {
      httpMetadata: { contentType: "application/octet-stream" },
    });
    await c.env.DB.prepare(
      `INSERT INTO publications (id, note_id, author_id, kind, title, excerpt, published_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)
       ON CONFLICT (note_id) DO UPDATE SET
         kind = excluded.kind, title = excluded.title, excerpt = excluded.excerpt,
         updated_at = excluded.updated_at`,
    )
      .bind(id, body.noteId, accountId, body.kind, body.title, body.excerpt, now)
      .run();

    return c.json(toPublication(await findPublication(c.env.DB, id)), existing ? 200 : 201);
  })

  /** Publication details. Each fetch counts as a view. */
  .get("/:id", async (c) => {
    const id = c.req.param("id");
    await findPublication(c.env.DB, id);
    const row = await c.env.DB.prepare(
      "UPDATE publications SET view_count = view_count + 1 WHERE id = ? RETURNING *",
    )
      .bind(id)
      .first<PublicationRow>();
    return c.json(toPublication(row as PublicationRow));
  })

  /** The frozen Yjs snapshot readers render. */
  .get("/:id/content", async (c) => {
    const object = await c.env.MEDIA.get(stateKey(c.req.param("id")));
    if (!object) throw new HTTPException(404, { message: "publication not found" });
    return new Response(object.body, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Cache-Control": "public, max-age=60",
        ETag: object.httpEtag,
      },
    });
  })

  /** Unpublish: removes the public snapshot and its social data. */
  .delete("/:id", async (c) => {
    const accountId = requireAccount(c.get("principal"));
    const row = await findPublication(c.env.DB, c.req.param("id"));
    if (row.author_id !== accountId) throw new HTTPException(403, { message: "not the author" });

    await c.env.DB.batch([
      c.env.DB.prepare("DELETE FROM comments WHERE publication_id = ?").bind(row.id),
      c.env.DB.prepare("DELETE FROM reactions WHERE publication_id = ?").bind(row.id),
      c.env.DB.prepare("DELETE FROM ratings WHERE publication_id = ?").bind(row.id),
      c.env.DB.prepare("DELETE FROM publications WHERE id = ?").bind(row.id),
    ]);
    await c.env.MEDIA.delete(stateKey(row.id));
    return c.body(null, 204);
  })

  /** Record that a reader finished the piece. */
  .post("/:id/reads", async (c) => {
    const id = c.req.param("id");
    await findPublication(c.env.DB, id);
    await c.env.DB.prepare("UPDATE publications SET read_count = read_count + 1 WHERE id = ?")
      .bind(id)
      .run();
    return c.body(null, 204);
  })

  .put("/:id/reactions/:reaction", async (c) => {
    const accountId = requireAccount(c.get("principal"));
    const reaction = Reaction.safeParse(c.req.param("reaction"));
    if (!reaction.success) throw new HTTPException(400, { message: "unknown reaction" });
    const id = c.req.param("id");
    await findPublication(c.env.DB, id);

    const column = `${reaction.data}_count`;
    const inserted = await c.env.DB.prepare(
      "INSERT OR IGNORE INTO reactions (publication_id, account_id, reaction, created_at) VALUES (?, ?, ?, ?)",
    )
      .bind(id, accountId, reaction.data, Date.now())
      .run();
    if (inserted.meta.changes > 0) {
      await c.env.DB.prepare(`UPDATE publications SET ${column} = ${column} + 1 WHERE id = ?`)
        .bind(id)
        .run();
    }
    return c.body(null, 204);
  })

  .delete("/:id/reactions/:reaction", async (c) => {
    const accountId = requireAccount(c.get("principal"));
    const reaction = Reaction.safeParse(c.req.param("reaction"));
    if (!reaction.success) throw new HTTPException(400, { message: "unknown reaction" });
    const id = c.req.param("id");

    const column = `${reaction.data}_count`;
    const deleted = await c.env.DB.prepare(
      "DELETE FROM reactions WHERE publication_id = ? AND account_id = ? AND reaction = ?",
    )
      .bind(id, accountId, reaction.data)
      .run();
    if (deleted.meta.changes > 0) {
      await c.env.DB.prepare(`UPDATE publications SET ${column} = ${column} - 1 WHERE id = ?`)
        .bind(id)
        .run();
    }
    return c.body(null, 204);
  })

  /** Rate 1–5 stars; rating again replaces the previous rating. */
  .put("/:id/rating", async (c) => {
    const accountId = requireAccount(c.get("principal"));
    const { stars } = await parse(z.object({ stars: Rating }), c.req.raw);
    const id = c.req.param("id");
    await findPublication(c.env.DB, id);

    const previous = await c.env.DB.prepare(
      "SELECT stars FROM ratings WHERE publication_id = ? AND account_id = ?",
    )
      .bind(id, accountId)
      .first<{ stars: number }>();

    await c.env.DB.batch([
      c.env.DB.prepare(
        `INSERT INTO ratings (publication_id, account_id, stars, created_at) VALUES (?, ?, ?, ?)
         ON CONFLICT (publication_id, account_id) DO UPDATE SET stars = excluded.stars`,
      ).bind(id, accountId, stars, Date.now()),
      c.env.DB.prepare(
        "UPDATE publications SET rating_sum = rating_sum + ?, rating_count = rating_count + ? WHERE id = ?",
      ).bind(stars - (previous?.stars ?? 0), previous ? 0 : 1, id),
    ]);
    return c.body(null, 204);
  })

  .get("/:id/comments", async (c) => {
    const { results } = await c.env.DB.prepare(
      "SELECT id, author_id, parent_id, body, created_at FROM comments WHERE publication_id = ? ORDER BY created_at LIMIT 500",
    )
      .bind(c.req.param("id"))
      .all<{
        id: string;
        author_id: string;
        parent_id: string | null;
        body: string;
        created_at: number;
      }>();
    return c.json({
      items: results.map((r) => ({
        id: r.id,
        authorId: r.author_id,
        parentId: r.parent_id,
        body: r.body,
        createdAt: r.created_at,
      })),
    });
  })

  .post("/:id/comments", async (c) => {
    const accountId = requireAccount(c.get("principal"));
    const body = await parse(CommentBody, c.req.raw);
    const publicationId = c.req.param("id");
    await findPublication(c.env.DB, publicationId);

    const comment = {
      id: createId(),
      authorId: accountId,
      parentId: body.parentId ?? null,
      body: body.body,
      createdAt: Date.now(),
    };
    await c.env.DB.batch([
      c.env.DB.prepare(
        "INSERT INTO comments (id, publication_id, author_id, parent_id, body, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      ).bind(
        comment.id,
        publicationId,
        accountId,
        comment.parentId,
        comment.body,
        comment.createdAt,
      ),
      c.env.DB.prepare(
        "UPDATE publications SET comment_count = comment_count + 1 WHERE id = ?",
      ).bind(publicationId),
    ]);
    return c.json(comment, 201);
  });
