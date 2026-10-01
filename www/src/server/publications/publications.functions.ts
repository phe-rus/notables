import { Id, NoteKind, Rating, Reaction } from "@notables/core";
import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { z } from "zod";
import { PublicationError } from "./publications.service";

/** Server-only: loads the service with this request's bindings. */
async function service() {
  const [{ env }, { createPublications }] = await Promise.all([
    import("cloudflare:workers"),
    import("./publications.service"),
  ]);
  return createPublications(env.DB, env.MEDIA);
}

/** Maps domain errors to HTTP statuses and a message the client can show. */
async function run<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof PublicationError) {
      setResponseStatus(error.status);
      throw new Error(error.message);
    }
    throw error;
  }
}

const ViewerId = z.uuid();

export const publishNote = createServerFn({ method: "POST" })
  .validator(
    z.object({
      noteId: Id,
      kind: NoteKind,
      title: z.string().trim().min(1).max(300),
      excerpt: z.string().max(500),
      authorName: z.string().trim().min(1).max(80),
      readingMinutes: z.number().int().min(1).max(600),
      document: z.object({ root: z.object({ children: z.array(z.unknown()) }) }).loose(),
      key: z.string().max(100).optional(),
    }),
  )
  .handler(({ data }) => run(async () => (await service()).publish(data)));

export const unpublishNote = createServerFn({ method: "POST" })
  .validator(z.object({ id: Id, key: z.string().min(1).max(100) }))
  .handler(({ data }) => run(async () => (await service()).unpublish(data.id, data.key)));

export const getPublication = createServerFn({ method: "GET" })
  .validator(z.object({ id: Id }))
  .handler(({ data }) => run(async () => (await service()).get(data.id)));

export const getViewerState = createServerFn({ method: "GET" })
  .validator(z.object({ id: Id, viewerId: ViewerId }))
  .handler(({ data }) => run(async () => (await service()).viewerState(data.id, data.viewerId)));

export const recordView = createServerFn({ method: "POST" })
  .validator(z.object({ id: Id }))
  .handler(({ data }) => run(async () => (await service()).recordView(data.id)));

export const recordRead = createServerFn({ method: "POST" })
  .validator(z.object({ id: Id }))
  .handler(({ data }) => run(async () => (await service()).recordRead(data.id)));

export const reactToPublication = createServerFn({ method: "POST" })
  .validator(z.object({ id: Id, viewerId: ViewerId, reaction: Reaction, on: z.boolean() }))
  .handler(({ data }) =>
    run(async () => (await service()).react(data.id, data.viewerId, data.reaction, data.on)),
  );

export const ratePublication = createServerFn({ method: "POST" })
  .validator(z.object({ id: Id, viewerId: ViewerId, stars: Rating }))
  .handler(({ data }) =>
    run(async () => (await service()).rate(data.id, data.viewerId, data.stars)),
  );
