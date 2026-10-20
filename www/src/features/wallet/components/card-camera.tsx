import { CameraIcon } from "@phe-rus/hino";
import { Button } from "@phe-rus/hino/button";
import { IconButton } from "@phe-rus/hino/icon-button";
import { t } from "@/i18n/i18n";
import { useCardCamera } from "../hooks/use-card-camera";
import { hasCardDetails } from "../model/has-card-details";
import type { CardCameraProps } from "../model/types";
import { kindMessageKeys } from "../model/wallet-model";

export function CardCamera({ onClose, onRead }: CardCameraProps) {
  const { video, detected, phase, capture } = useCardCamera(onRead);
  return (
    <div className="flex flex-col gap-4">
      <div className="relative overflow-hidden rounded-3xl bg-black">
        <video ref={video} muted playsInline className="aspect-[85.6/54] w-full object-cover" />
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-[2%] rounded-2xl border-2 transition-colors ${phase === "detected" ? "border-accent" : "border-white/85"}`}
        />
      </div>
      <p role="status" className="min-h-10 text-center text-subheadline text-label-secondary">
        {phase === "opening"
          ? t("wallet.cameraStarting")
          : phase === "detected"
            ? t("wallet.holdSteady")
            : phase === "error"
              ? t("wallet.scanRetry")
              : t("wallet.autoScanHint")}
      </p>
      {!onRead && detected && (
        <div
          className="rounded-2xl bg-fill px-4 py-3 text-subheadline"
          aria-live="polite"
          aria-atomic="true"
        >
          <p className="font-medium text-label">
            {detected.suggestions.kind === "other"
              ? t("wallet.liveLooking")
              : t(kindMessageKeys[detected.suggestions.kind])}
          </p>
          {hasCardDetails(detected) ? (
            <dl className="mt-2 space-y-1 text-footnote text-label-secondary">
              {(["number", "meter", "account", "holder", "expiry"] as const).map((key) => {
                const value = detected.suggestions[key];
                if (!value) return null;
                return (
                  <div key={key} className="flex items-baseline justify-between gap-3">
                    <dt>{t(`wallet.${key}`)}</dt>
                    <dd className="max-w-[65%] truncate text-end tabular-nums">
                      {key === "number" || key === "meter" || key === "account"
                        ? `•••• ${value.slice(-4)}`
                        : value}
                    </dd>
                  </div>
                );
              })}
            </dl>
          ) : (
            <p className="mt-1 text-footnote text-label-secondary">{t("wallet.liveNoDetails")}</p>
          )}
        </div>
      )}
      <IconButton
        variant="default"
        className="size-14 self-center"
        label={t("capture.takePhoto")}
        disabled={phase === "opening"}
        onClick={capture}
      >
        <CameraIcon size={24} />
      </IconButton>
      <Button size="sm" variant="ghost" className="self-center" onClick={onClose}>
        {t("common.cancel")}
      </Button>
    </div>
  );
}
