import { Button } from "@ultrapeach/ui";
import { t } from "../../../i18n/i18n";
import { initializeWallet, useWallet } from "../store/wallet-store";

export function WalletAccess() {
  const { status, busy } = useWallet();
  const initialized = status?.initialized ?? false;
  return (
    <div className="mx-auto flex w-full max-w-[440px] flex-col gap-5 rounded-5xl border border-separator bg-elevated p-6">
      <h2 className="font-serif text-2xl font-semibold">
        {initialized ? t("wallet.locked") : t("wallet.setupTitle")}
      </h2>
      <p className="text-sm leading-relaxed text-label-secondary">
        {initialized ? t("wallet.migrationPending") : t("wallet.setupHint")}
      </p>
      {!initialized &&
        (status?.secureStoreAvailable ? (
          <Button variant="primary" disabled={busy} onClick={() => void initializeWallet()}>
            {t("wallet.createWallet")}
          </Button>
        ) : (
          <p className="text-sm text-label-secondary">{t("wallet.secureStoreHint")}</p>
        ))}
    </div>
  );
}
