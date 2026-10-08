import { Section } from "@ultrapeach/ui";
import { AppMark } from "../../../../components/brand/app-mark";
import { t } from "../../../../i18n/i18n";
import { isTauri } from "../../../../platform/runtime";

/** Which Notables this is, and where it keeps your things. */
export function AboutPage() {
  return (
    <Section title={t("settings.about")}>
      <div className="flex items-center gap-4 px-4 py-4">
        <AppMark size={52} />
        <div className="flex flex-col">
          <span className="text-body font-semibold">Notables</span>
          <span className="text-footnote text-label-secondary">
            {t("settings.version", { version: "0.1" })} ·{" "}
            {isTauri() ? t("settings.storedDevice") : t("settings.storedBrowser")}
          </span>
        </div>
      </div>
    </Section>
  );
}
