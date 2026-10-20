import { LabeledContent, Picker, Section, Toggle, toast } from "@phe-rus/hino";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { withWalletAuthentication } from "@/features/wallet/lib/wallet-auth";
import { walletService } from "@/features/wallet/lib/wallet-service";
import { t } from "@/i18n/i18n";
import { isTauri } from "@/platform/runtime";

/**
 * The Lock (spec 0004) and the secret places it protects. Until its native
 * adapters ship, the controls show where they will be, switched off and
 * saying so, rather than pretending to protect anything.
 */
export function PrivacyPage() {
  const soon = t("lock.soon");
  const [minutes, setMinutes] = useState("30");
  const [busy, setBusy] = useState(true);
  useEffect(() => {
    if (!isTauri()) return;
    let active = true;
    void walletService
      .status()
      .then((status) => {
        if (active) {
          setMinutes(String(status.unlockMinutes ?? 30));
          setBusy(false);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  return (
    <>
      <Section title={t("lock.title")} footer={t("lock.hint")}>
        <LabeledContent label={t("lock.title")} description={soon}>
          <Toggle label={t("lock.title")} checked={false} disabled onChange={() => {}} />
        </LabeledContent>
      </Section>
      {isTauri() && (
        <Section title={t("wallet.title")} footer={t("wallet.sessionHint")}>
          <LabeledContent label={t("wallet.title")} description={t("wallet.settingsHint")}>
            <Link to="/wallet" className="text-subheadline font-semibold text-accent-text">
              {t("wallet.open")}
            </Link>
          </LabeledContent>
          <LabeledContent label={t("wallet.relockAfter")}>
            <fieldset disabled={busy} className="min-w-0">
              <Picker
                label={t("wallet.relockAfter")}
                value={minutes}
                options={[1, 5, 15, 30, 60, 120].map((value) => ({
                  value: String(value),
                  label: t("wallet.minutes", { count: value }),
                }))}
                onChange={(value) => {
                  setBusy(true);
                  void withWalletAuthentication(() => walletService.configure(Number(value)))
                    .then((status) => setMinutes(String(status.unlockMinutes ?? 30)))
                    .catch(() => toast.error(t("wallet.error")))
                    .finally(() => setBusy(false));
                }}
              />
            </fieldset>
          </LabeledContent>
        </Section>
      )}
    </>
  );
}
