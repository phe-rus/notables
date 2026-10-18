import { Button, LockIcon } from "@phe-rus/hino";
import { t } from "../../../i18n/i18n";
import { initializeWallet, unlockWallet, useWallet } from "../store/wallet-store";

export function WalletAccess() {
  const { status, busy } = useWallet();
  const initialized = status?.initialized ?? false;
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-4 py-12 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-accent-soft text-accent-text">
        <LockIcon size={28} />
      </span>
      <h2 className="text-title3 font-semibold">
        {initialized ? t("wallet.locked") : t("wallet.setupTitle")}
      </h2>
      <p className="text-sm leading-relaxed text-label-secondary">
        {t(status?.systemAuthAvailable ? "wallet.authHint" : "wallet.authUnavailable")}
      </p>
      {initialized && status?.systemAuthAvailable && (
        <Button size="sm" disabled={busy} onClick={() => void unlockWallet()}>
          {t("wallet.unlock")}
        </Button>
      )}
      {!initialized &&
        status?.systemAuthAvailable &&
        (status?.secureStoreAvailable ? (
          <Button
            size="sm"
            variant="default"
            disabled={busy}
            onClick={() => void initializeWallet()}
          >
            {t("wallet.createWallet")}
          </Button>
        ) : (
          <p className="text-sm text-label-secondary">{t("wallet.secureStoreHint")}</p>
        ))}
    </div>
  );
}
