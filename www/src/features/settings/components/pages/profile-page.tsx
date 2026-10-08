import { LabeledContent, Section } from "@ultrapeach/ui";
import { t } from "../../../../i18n/i18n";
import { setAuthorName, useAuthorName } from "../../../../platform/author-preferences";

/** Your name, as it appears on what you write and share. */
export function ProfilePage() {
  const authorName = useAuthorName();
  return (
    <Section title={t("settings.you")} footer={t("settings.youFooter")}>
      <LabeledContent label={t("settings.name")} stacked>
        <input
          value={authorName}
          onChange={(event) => setAuthorName(event.target.value)}
          maxLength={80}
          placeholder={t("settings.namePlaceholder")}
          aria-label={t("settings.name")}
          className="w-full rounded-lg control-field px-3 py-2 text-subheadline text-label placeholder:text-label-tertiary"
        />
      </LabeledContent>
    </Section>
  );
}
