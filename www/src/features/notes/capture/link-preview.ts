import { publicUrl } from "@/platform/public-url";

export async function fetchLinkPreview(url: string) {
  const response = await fetch(publicUrl("/api/link-preview"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("preview-unavailable");
  const data: unknown = await response.json();
  if (!data || typeof data !== "object") throw new Error("invalid-preview");
  const result = data as Record<string, unknown>;
  if (!["url", "title", "description", "image"].every((key) => typeof result[key] === "string"))
    throw new Error("invalid-preview");
  return {
    url: String(result.url),
    title: String(result.title),
    description: String(result.description),
    image: String(result.image),
  };
}
