import { LabeledContent, Section } from "@ultrapeach/ui";
import { type ReactNode, useEffect, useState } from "react";
import { AppMark } from "../../../../components/brand/app-mark";
import { t } from "../../../../i18n/i18n";
import { browserNames, type DeviceInfo, deviceInfo } from "../../../../platform/device-info";
import { isTauri } from "../../../../platform/runtime";
import { useBooks } from "../../../books/store/book-store";
import { useCalendarEvents } from "../../../calendar/store/calendar-store";
import { useInvoices } from "../../../invoices/store/invoice-store";
import { isListedNote, useLibrary } from "../../../library/store/library-store";

const links = [
  { key: "settings.aboutWebsite", href: "https://notables.pherus.org" },
  { key: "settings.aboutPrivacy", href: "https://pherus.org/legal/privacy-policy" },
  { key: "settings.aboutSource", href: "https://github.com/phe-rus/notables" },
  { key: "settings.aboutSupport", href: "mailto:support@pherus.org" },
] as const;

/** Which Notables this is, on what, holding what, and who makes it. */
export function AboutPage() {
  const version = useAppVersion();
  const device = useDeviceInfo();
  const notes = useLibrary().filter(isListedNote).length;
  const books = useBooks().length;
  const invoices = useInvoices().length;
  const events = useCalendarEvents().length;
  const build = import.meta.env.VITE_BUILD_NUMBER as string | undefined;

  return (
    <>
      <div className="flex flex-col items-center gap-2 px-4 pt-4 pb-2 text-center">
        <AppMark size={88} />
        <h2 className="mt-2 text-title2 font-bold tracking-tight">Notables</h2>
        <p className="text-subheadline text-label-secondary">{t("settings.aboutTagline")}</p>
        {version && (
          <p className="text-footnote text-label-tertiary tabular-nums">
            {build
              ? t("settings.versionBuild", { version, build })
              : t("settings.version", { version })}
          </p>
        )}
      </div>

      <Section title={t("settings.aboutDevice")}>
        {device?.device && <Row label={t("settings.aboutDeviceName")}>{device.device}</Row>}
        {device?.system && <Row label={t("settings.aboutSystem")}>{device.system}</Row>}
        {device?.architecture && (
          <Row label={t("settings.aboutArchitecture")}>{device.architecture}</Row>
        )}
        <Row label={t("settings.aboutRunning")}>
          {device?.browser
            ? t("settings.aboutInBrowser", { browser: browserNames[device.browser] || "Web" })
            : t("settings.aboutApp")}
        </Row>
      </Section>

      <Section
        title={t("settings.aboutLibrary")}
        footer={isTauri() ? t("settings.storedDevice") : t("settings.storedBrowser")}
      >
        <Row label={t("nav.notes")}>{notes}</Row>
        <Row label={t("nav.books")}>{books}</Row>
        <Row label={t("nav.invoices")}>{invoices}</Row>
        <Row label={t("nav.calendar")}>{t("calendar.eventsCount", { count: events })}</Row>
      </Section>

      <Section title={t("settings.aboutPromises")}>
        <Row label={t("settings.aboutNoAccount")}>✓</Row>
        <Row label={t("settings.aboutOnDevice")}>✓</Row>
        <Row label={t("settings.aboutAiOptIn")}>✓</Row>
      </Section>

      <Section footer={t("settings.aboutMadeBy")}>
        {links.map((link) => (
          <a
            key={link.key}
            href={link.href}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between px-4 py-3 text-body text-accent-text no-underline transition-colors hover:bg-fill/50"
          >
            {t(link.key)}
            <span aria-hidden className="text-label-tertiary rtl:-scale-x-100">
              ›
            </span>
          </a>
        ))}
      </Section>
    </>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <LabeledContent label={label}>
      <span className="text-body text-label-secondary tabular-nums">{children}</span>
    </LabeledContent>
  );
}

function useDeviceInfo(): DeviceInfo | null {
  const [info, setInfo] = useState<DeviceInfo | null>(null);
  useEffect(() => {
    void deviceInfo().then(setInfo, () => {});
  }, []);
  return info;
}

/** The installed app's version; the web app is always the latest deploy and has none. */
function useAppVersion(): string | null {
  const [version, setVersion] = useState<string | null>(null);
  useEffect(() => {
    if (!isTauri()) return;
    import("@tauri-apps/api/app").then(({ getVersion }) => getVersion()).then(setVersion, () => {});
  }, []);
  return version;
}
