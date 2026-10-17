import { LabeledContent, Section, Toggle } from "@phe-rus/hino";
import { Link } from "@tanstack/react-router";
import { t } from "../../../../i18n/i18n";

/**
 * The Lock (spec 0004) and the secret places it protects. Until its native
 * adapters ship, the controls show where they will be, switched off and
 * saying so, rather than pretending to protect anything.
 */
export function PrivacyPage() {
  const soon = t("lock.soon");
  return (
    <>
      <Section title={t("lock.title")} footer={t("lock.hint")}>
        <LabeledContent label={t("lock.title")} description={soon}>
          <Toggle label={t("lock.title")} checked={false} disabled onChange={() => {}} />
        </LabeledContent>
      </Section>
      <Section title={t("wallet.title")}>
        <LabeledContent label={t("wallet.title")} description={t("wallet.settingsHint")}>
          <Link to="/wallet" className="text-subheadline font-semibold text-accent-text">
            {t("wallet.open")}
          </Link>
        </LabeledContent>
      </Section>
    </>
  );
}
