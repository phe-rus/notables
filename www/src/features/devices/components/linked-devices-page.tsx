import { Button, confirmDialog, LabeledContent, Section } from "@phe-rus/hino";
import { useEffect, useState } from "react";
import { t } from "../../../i18n/i18n";
import { ago } from "../../../lib/time/relative-time";
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
        <Section title={t("devices.browsers")} footer={t("devices.browsersFooter")}>
          {sessions.map((session) => (
            <LabeledContent
              key={session.id}
              label={session.name || t("devices.unnamedBrowser")}
              description={
                live.has(session.id)
                  ? t("devices.openNow")
                  : t("devices.lastActive", { when: ago(session.lastActive) })
              }
            >
              <Button variant="ghost" onClick={() => void end(session)}>
                {t("devices.logOut")}
              </Button>
            </LabeledContent>
          ))}
          <LabeledContent label={t("devices.linkBrowserWhere")}>
            <Button variant="secondary" onClick={() => setLinking(null)}>
              {t("devices.linkBrowser")}
            </Button>
          </LabeledContent>
        </Section>
      )}
      <LinkBrowserSheet
        open={linking !== false}
        initial={linking || null}
        onClose={() => setLinking(false)}
      />
    </>
  );
}
