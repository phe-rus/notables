import { loadLinkPreview } from "./link-preview.service";

const headers = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
  "cache-control": "no-store",
};

/** A stable endpoint also serves installed apps whose server-function hashes are older. */
export async function linkPreviewRequest(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (request.method !== "POST") return new Response(null, { status: 405, headers });
  const reader = request.body?.getReader();
  if (!reader) return new Response(null, { status: 400, headers });
  try {
    const parts: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 4096) return new Response(null, { status: 413, headers });
      parts.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const part of parts) {
      bytes.set(part, offset);
      offset += part.length;
    }
    const data: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (
      !data ||
      typeof data !== "object" ||
      !("url" in data) ||
      typeof data.url !== "string" ||
      data.url.length > 2048
    )
      return new Response(null, { status: 400, headers });
    return Response.json(await loadLinkPreview(data.url), { headers });
  } catch {
    return Response.json({ error: "preview-unavailable" }, { status: 422, headers });
  } finally {
    await reader.cancel().catch(() => {});
  }
}
