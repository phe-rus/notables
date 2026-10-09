import { Section } from "@ultrapeach/ui";
import { useEffect, useState } from "react";
import { AppMark } from "../../../../components/brand/app-mark";
import { t } from "../../../../i18n/i18n";
import { isTauri } from "../../../../platform/runtime";

/** Which Notables this is, and where it keeps your things. */
export function AboutPage() {
  const version = useAppVersion();
  const stored = isTauri() ? t("settings.storedDevice") : t("settings.storedBrowser");
  return (
    <Section title={t("settings.about")}>
      <div className="flex items-center gap-4 px-4 py-4">
        <AppMark size={52} />
        <div className="flex flex-col">
          <span className="text-body font-semibold">Notables</span>
          <span className="text-footnote text-label-secondary">
            {version ? `${t("settings.version", { version })} · ${stored}` : stored}
          </span>
        </div>
      </div>
    </Section>
  );
}

/**
 * The installed app's version, as the store build stamped it. The web app is
 * always the latest deploy and has none to show.
 */
function useAppVersion(): string | null {
  const [version, setVersion] = useState<string | null>(null);
  useEffect(() => {
    if (!isTauri()) return;
    import("@tauri-apps/api/app").then(({ getVersion }) => getVersion()).then(setVersion, () => {});
  }, []);
  return version;
}
