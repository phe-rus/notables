import { z } from "zod";

export const BrowserShareStatus = z.object({
  role: z.enum(["owner", "member", "unshared"]),
  mine: z.string(),
  online: z.array(z.string()),
  members: z.array(
    z.tuple([
      z.string(),
      z.object({
        name: z.string(),
        invitedAt: z.number(),
        joinedAt: z.number().nullable(),
        revokedAt: z.number().nullable(),
      }),
    ]),
  ),
});
export type BrowserShareStatus = z.infer<typeof BrowserShareStatus>;
