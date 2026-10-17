import { Section, TextField } from "@phe-rus/hino";
import { t } from "../../../../i18n/i18n";
import { setAuthorName, useAuthorName } from "../../../../platform/author-preferences";
import { SpaceIdSection } from "../../../devices/components/space-id-section";

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
