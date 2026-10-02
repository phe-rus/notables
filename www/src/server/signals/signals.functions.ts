import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function signals() {
  const [{ env }, { createSignals }] = await Promise.all([
    import("cloudflare:workers"),
    import("./signals.service"),
  ]);
  return createSignals(env.DB);
}

/** Rooms are SHA-256 hashes; peers are random ids. */
const Room = z.string().regex(/^[0-9a-f]{64}$/);
const PeerId = z.string().regex(/^[\w-]{8,64}$/);

export const postSignal = createServerFn({ method: "POST" })
  .validator(
    z.object({
      room: Room,
      sender: PeerId,
      recipient: PeerId.nullable(),
      // Encrypted offers and answers; SDP with candidates fits easily.
      payload: z.string().min(1).max(24_000),
    }),
  )
  .handler(async ({ data }) => {
    await (await signals()).post(data.room, data.sender, data.recipient, data.payload);
    return { ok: true };
  });

export const pollSignals = createServerFn({ method: "GET" })
  .validator(z.object({ room: Room, me: PeerId, after: z.number().int().min(0) }))
  .handler(async ({ data }) => (await signals()).poll(data.room, data.me, data.after));
