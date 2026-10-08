import { Link } from "@tanstack/react-router";
import { LabeledContent, Section, Toggle } from "@ultrapeach/ui";
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
      <Section title={t("lock.unlockWith")}>
        {[t("lock.device"), t("lock.passPin"), t("lock.password"), t("lock.passkey")].map(
          (method) => (
            <LabeledContent key={method} label={method} description={soon}>
              <Toggle label={method} checked={false} disabled onChange={() => {}} />
            </LabeledContent>
          ),
        )}
      </Section>
      <Section footer={t("lock.recoveryHint")}>
        <LabeledContent label={t("lock.appLock")} description={soon}>
          <Toggle label={t("lock.appLock")} checked={false} disabled onChange={() => {}} />
        </LabeledContent>
        <LabeledContent label={t("lock.recoveryKey")} description={soon}>
          <span className="text-subheadline text-label-tertiary">{t("lock.off")}</span>
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
