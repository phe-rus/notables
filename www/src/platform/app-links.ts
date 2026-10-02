/**
 * `notables://` links: shareable addresses that open the installed app at
 * a note, a book or a document check, on desktop and on phones.
 */
export const APP_SCHEME = "notables:";

/** The app link for a place in the app, e.g. "notes/0193…" → "notables://notes/0193…". */
export function appLinkFor(path: string): string {
  return `notables://${path.replace(/^\/+/, "")}`;
}

const ID = /^[\w-]{6,80}$/;

/**
 * Where in the app a link should go, as a path, or null for links it
 * doesn't know. Only known places are opened; anything else is ignored.
 */
export function routeForAppLink(link: string): string | null {
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    return null;
  }
  if (url.protocol !== APP_SCHEME) return null;
  // notables://notes/abc parses with "notes" as the host and "/abc" as the path.
  const parts = [url.hostname, ...url.pathname.split("/")].filter(Boolean).map(decodeURIComponent);
  const [place, id] = parts;
  switch (place) {
    case "notes":
    case "books":
    case "read":
    case "invoices":
    case "p":
      return id && ID.test(id)
        ? `/${place}/${id}`
        : place === "p"
          ? null
          : `/${place === "read" ? "books" : place}`;
    case "verify":
      return `/verify${url.hash}`;
    case "settings":
    case "trash":
      return `/${place}`;
    case undefined:
    case "home":
      return "/";
    default:
      return null;
  }
}
