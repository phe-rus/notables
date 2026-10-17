import { toast } from "@phe-rus/hino";
import { openUrl } from "@tauri-apps/plugin-opener";
import { t } from "../i18n/i18n";
import { isTauri } from "./runtime";

/** Native navigation stays inside Notables; external destinations use their system handler. */
export function externalDestination(href: string, origin: string): string | null {
  try {
    const url = new URL(href, origin);
    if (url.origin === origin || !["http:", "https:", "mailto:", "tel:"].includes(url.protocol))
      return null;
    return url.href;
  } catch {
    return null;
  }
}

export async function openExternalUrl(url: string) {
  if (isTauri()) await openUrl(url);
  else window.open(url, "_blank", "noopener,noreferrer");
}

export function startExternalLinks() {
  if (!isTauri()) return;
  const onClick = (event: MouseEvent) => {
    if (!(event.target instanceof Element)) return;
    const anchor = event.target.closest("a[href]");
    const href = anchor?.getAttribute("href");
    const destination = href ? externalDestination(href, window.location.origin) : null;
    if (!destination || anchor?.hasAttribute("download")) return;
    event.preventDefault();
    event.stopPropagation();
    void openExternalUrl(destination).catch(() => toast.error(t("devices.externalFailed")));
  };
  document.addEventListener("click", onClick, true);
  return () => document.removeEventListener("click", onClick, true);
}
