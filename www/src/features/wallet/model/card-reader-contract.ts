import { z } from "zod";

/** Both native engines return bounded plain text and a percentage confidence. */
export const nativeCardTextSchema = z.strictObject({
  text: z.string().max(20_000),
  confidence: z.number().min(0).max(100),
});
