import { Button, confirmDialog, LinkIcon, Section } from "@phe-rus/hino";
import { useEffect, useState } from "react";
import { t } from "@/i18n/i18n";
import { ago } from "@/lib/time/relative-time";
import {
  type BrowserSessionRecord,
  endBrowserSession,
  useBrowserSessions,
  useLiveBrowsers,
} from "../lib/browser-sessions";
import { readLinkUrl } from "../lib/link-url";
import { servesBrowsers } from "../lib/serves-browsers";
import { LinkBrowserSheet, type LinkTarget } from "./link-browser-sheet";

/** Settings > Linked Devices: only the browsers showing this phone's notes. */
export function LinkedDevicesPage() {
  const sessions = useBrowserSessions();
  const live = useLiveBrowsers();
  const [linking, setLinking] = useState<LinkTarget | null | false>(false);

  // A scanned notables://link opens here with the code ready.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const link = params.get("link");
    const target = link ? readLinkUrl(link) : null;
    if (target) setLinking(target);
  }, []);

  const end = async (session: BrowserSessionRecord) => {
    const name = session.name || t("devices.unnamedBrowser");
    const confirmed = await confirmDialog({
      title: t("devices.endTitle", { name }),
      message: t("devices.endBody"),
      confirmLabel: t("devices.logOut"),
      destructive: true,
    });
    if (confirmed) endBrowserSession(session.id);
  };

  return (
    <>
      {servesBrowsers() && (
        <>
          <div className="flex items-center justify-between gap-3 px-1">
            <p className="max-w-md text-footnote leading-snug text-label-secondary">
              {t("devices.linkBrowserWhere")}
            </p>
            <Button size="sm" onClick={() => setLinking(null)}>
              {t("common.add")}
            </Button>
          </div>
          <Section footer={t("devices.browsersFooter")}>
            {sessions.map((session) => (
              <div key={session.id} className="flex min-h-14 items-center gap-3 px-4 py-2">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-text">
                  <LinkIcon size={18} />
                </span>
                <span className="min-w-0 grow">
                  <span className="block truncate text-subheadline font-medium">
                    {session.name || t("devices.unnamedBrowser")}
                  </span>
                  <span className="text-caption text-label-secondary">
                    {t("devices.linkedBrowser")} ·{" "}
                    {live.has(session.id)
                      ? t("devices.openNow")
                      : t("devices.lastActive", { when: ago(session.lastActive) })}
                  </span>
                </span>
                <Button size="xs" variant="destructive" onClick={() => void end(session)}>
                  {t("devices.logOut")}
                </Button>
              </div>
            ))}
          </Section>
        </>
      )}
      <LinkBrowserSheet
        open={linking !== false}
        initial={linking || null}
        onClose={() => setLinking(false)}
      />
    </>
  );
}
