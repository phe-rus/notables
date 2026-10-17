import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getLinkPreview = createServerFn({ method: "POST" })
  .validator(z.object({ url: z.url().max(2048) }))
  .handler(async ({ data }) => {
    const { loadLinkPreview } = await import("./link-preview.service");
    return loadLinkPreview(data.url);
  });
