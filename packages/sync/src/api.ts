import { createPublicationSnapshot, type NoteKind, type Reaction } from "@notables/core";
import type * as Y from "yjs";
import type { SyncConfig } from "./config";

export interface PublicationStats {
  views: number;
  reads: number;
  likes: number;
  hearts: number;
  comments: number;
  rating: number | null;
  ratings: number;
}

export interface PublicationSummary {
  id: string;
  noteId: string;
  authorId: string;
  kind: NoteKind;
  title: string;
  excerpt: string;
  publishedAt: number;
  updatedAt: number;
  stats: PublicationStats;
}

export interface Comment {
  id: string;
  authorId: string;
  parentId: string | null;
  body: string;
  createdAt: number;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

/** Typed client for the publishing and social API (`workers/api`). */
export function createApiClient(config: Pick<SyncConfig, "apiUrl" | "getToken">) {
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await config.getToken();
    const headers = new Headers(init.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (init.body) headers.set("Content-Type", "application/json");

    const res = await fetch(new URL(path, config.apiUrl), { ...init, headers });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      throw new ApiError(res.status, body.error ?? res.statusText);
    }
    return (res.status === 204 ? undefined : await res.json()) as T;
  }

  const pub = (id: string, suffix = "") => `/v1/publications/${encodeURIComponent(id)}${suffix}`;

  return {
    feed: (params: { before?: number; author?: string; limit?: number } = {}) => {
      const query = new URLSearchParams(
        Object.entries(params)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)]),
      );
      return request<{ items: PublicationSummary[] }>(`/v1/publications?${query}`);
    },

    get: (id: string) => request<PublicationSummary>(pub(id)),

    /** Publishes (or re-publishes) a snapshot of the note. */
    publish: (noteId: string, doc: Y.Doc, kind: NoteKind) => {
      const snapshot = createPublicationSnapshot(doc, kind);
      return request<PublicationSummary>("/v1/publications", {
        method: "POST",
        body: JSON.stringify({
          noteId,
          kind,
          title: snapshot.title,
          excerpt: snapshot.excerpt,
          state: toBase64(snapshot.state),
        }),
      });
    },

    unpublish: (id: string) => request<void>(pub(id), { method: "DELETE" }),

    content: async (id: string): Promise<Uint8Array> => {
      const res = await fetch(new URL(pub(id, "/content"), config.apiUrl));
      if (!res.ok) throw new ApiError(res.status, res.statusText);
      return new Uint8Array(await res.arrayBuffer());
    },

    react: (id: string, reaction: Reaction, on = true) =>
      request<void>(pub(id, `/reactions/${reaction}`), { method: on ? "PUT" : "DELETE" }),

    rate: (id: string, stars: number) =>
      request<void>(pub(id, "/rating"), { method: "PUT", body: JSON.stringify({ stars }) }),

    markRead: (id: string) => request<void>(pub(id, "/reads"), { method: "POST" }),

    comments: (id: string) => request<{ items: Comment[] }>(pub(id, "/comments")),

    comment: (id: string, body: string, parentId?: string) =>
      request<Comment>(pub(id, "/comments"), {
        method: "POST",
        body: JSON.stringify({ body, parentId }),
      }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
