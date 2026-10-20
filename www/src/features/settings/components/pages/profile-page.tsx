import { Section, TextField } from "@phe-rus/hino";
import { SpaceIdSection } from "@/features/devices/components/space-id-section";
import { t } from "@/i18n/i18n";
import { setAuthorName, useAuthorName } from "@/platform/author-preferences";

/** Your name, as it appears on what you write and share. */
export function ProfilePage() {
  const authorName = useAuthorName();
  return (
    <>
      <Section footer={t("settings.youFooter")}>
        <div className="settings-name px-4 py-3">
          <TextField
            label={t("settings.name")}
            value={authorName}
            onChange={(event) => setAuthorName(event.target.value)}
            maxLength={80}
            placeholder={t("settings.namePlaceholder")}
          />
        </div>
      </Section>
      <SpaceIdSection />
    </>
  );
}
