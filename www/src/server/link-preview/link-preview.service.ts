import { previewUrl, publicAddress } from "./public-url";

export interface LinkPreview {
  url: string;
  title: string;
  description: string;
  image: string;
}

async function boundedText(response: Response, limit: number): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    while (size < limit) {
      const { done, value } = await reader.read();
      if (done) break;
      const piece = value.subarray(0, limit - size);
      parts.push(piece);
      size += piece.length;
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  const all = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    all.set(part, offset);
    offset += part.length;
  }
  return new TextDecoder().decode(all);
}
async function assertPublicHost(host: string, signal: AbortSignal) {
  const answers = await Promise.all(
    ["A", "AAAA"].map(async (type) => {
      const url = new URL("https://cloudflare-dns.com/dns-query");
      url.searchParams.set("name", host);
      url.searchParams.set("type", type);
      const response = await fetch(url, {
        headers: { accept: "application/dns-json" },
        signal,
        redirect: "manual",
      });
      if (!response.ok) throw new Error("dns-failed");
      const result: unknown = JSON.parse(await boundedText(response, 32768));
      const records =
        result && typeof result === "object" && (result as { Answer?: unknown }).Answer;
      return Array.isArray(records)
        ? records.flatMap((record: unknown) => {
            if (!record || typeof record !== "object") return [];
            const value = record as { type?: unknown; data?: unknown };
            return (value.type === 1 || value.type === 28) && typeof value.data === "string"
              ? [value.data]
              : [];
          })
        : [];
    }),
  );
  const addresses = answers.flat();
  if (!addresses.length || addresses.some((ip) => !publicAddress(ip)))
    throw new Error("non-public-link");
}

/** Fetch only a small public page head, checking every redirect and using no app credentials. */
export async function loadLinkPreview(input: string): Promise<LinkPreview> {
  let url = previewUrl(input);
  const signal = AbortSignal.timeout(6000);
  let response: Response | null = null;
  for (let redirects = 0; redirects < 4; redirects++) {
    await assertPublicHost(url.hostname, signal);
    response = await fetch(url, {
      signal,
      redirect: "manual",
      headers: { accept: "text/html,application/xhtml+xml", "user-agent": "Notables link preview" },
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (!location) throw new Error("invalid-redirect");
      url = previewUrl(location, url.href);
      response = null;
      continue;
    }
    break;
  }
  if (
    !response?.ok ||
    !/(?:text\/html|application\/xhtml\+xml)/i.test(response.headers.get("content-type") ?? "")
  ) {
    await response?.body?.cancel();
    throw new Error("no-preview");
  }
  const html = await boundedText(response, 256 * 1024);
  let title = "";
  let ogTitle = "";
  let description = "";
  let image = "";
  const rewriter = new HTMLRewriter()
    .on("title", {
      text(chunk) {
        title = (title + chunk.text).slice(0, 300);
      },
    })
    .on("meta", {
      element(element) {
        const key = (
          element.getAttribute("property") ??
          element.getAttribute("name") ??
          ""
        ).toLowerCase();
        const content = element.getAttribute("content") ?? "";
        if (key === "og:title") ogTitle = content.slice(0, 300);
        if (key === "og:description" || (key === "description" && !description))
          description = content.slice(0, 500);
        if (key === "og:image" && !image) image = content.slice(0, 2048);
      },
    });
  await boundedText(
    rewriter.transform(new Response(html, { headers: { "content-type": "text/html" } })),
    256 * 1024,
  );
  if (image) {
    try {
      const source = previewUrl(image, url.href);
      await assertPublicHost(source.hostname, signal);
      image = source.href;
    } catch {
      image = "";
    }
  }
  return {
    url: url.href,
    title: (ogTitle || title || url.hostname).trim(),
    description: description.trim(),
    image,
  };
}
