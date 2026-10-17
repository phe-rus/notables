import { Button, CameraIcon, ChevronRightIcon, NfcReadIcon, PhotoIcon } from "@phe-rus/hino";
import { useEffect, useState } from "react";
import { t } from "../../../i18n/i18n";
import { walletNfcAvailable } from "../lib/card-nfc";
import {
  cancelWalletCapture,
  correctWalletCapture,
  importWalletImage,
  scanWalletNfc,
  showWallet,
  useWallet,
} from "../store/wallet-store";
import { CardCamera } from "./card-camera";
import { ManualCardForm } from "./manual-card-form";
import { WalletIllustration } from "./wallet-illustration";

export function CardCapture() {
  const {
    captureReview: review,
    captureProgress: progress,
    captureError: error,
    captureMethod,
    captureNfcUnsupported,
  } = useWallet();
  const [nfc, setNfc] = useState(false);
  useEffect(() => {
    let current = true;
    void walletNfcAvailable().then((value) => {
      if (current) setNfc(value);
    });
    return () => {
      current = false;
    };
  }, []);
  const working = progress !== null;
  const [camera, setCamera] = useState(false);
  const chooseImage = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/webp";
    input.hidden = true;
    document.body.appendChild(input);
    // This empty input survives a native picker background transition. It owns
    // no sensitive draft. A selection starts a new, authenticated capture job.
    input.addEventListener(
      "change",
      () => {
        const file = input.files?.[0];
        input.remove();
        if (file) void importWalletImage(file);
      },
      { once: true },
    );
    input.addEventListener("cancel", () => input.remove(), { once: true });
    input.click();
  };
  if (review)
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-4">
        <ManualCardForm card={null} suggestions={review.suggestions} />
        {review.text && (
          <details className="px-4 py-2">
            <summary className="cursor-pointer text-footnote text-label-secondary">
              {t("wallet.recognizedText")}
            </summary>
            <p dir="auto" className="mt-3 whitespace-pre-wrap [overflow-wrap:anywhere]">
              {review.text}
            </p>
          </details>
        )}
      </div>
    );
  return (
    <div className="mx-auto flex w-full max-w-[440px] flex-col gap-5">
      {!camera && !working && <WalletIllustration />}
      {!camera && !working && (
        <p className="px-3 text-center text-subheadline text-label-secondary">
          {t("wallet.scanHint")}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-label-secondary">
          {t(captureNfcUnsupported ? "wallet.nfcUnsupported" : "wallet.captureError")}
        </p>
      )}
      {working ? (
        <>
          {captureMethod === "nfc" && (
            <NfcReadIcon size={40} className="self-center text-accent-text" />
          )}
          <p role="status" className="text-center text-subheadline text-label-secondary">
            {t(captureMethod === "nfc" ? "wallet.nfcWaiting" : "wallet.recognizing")}
          </p>
          {captureMethod !== "nfc" && <progress className="w-full" value={progress ?? 0} max={1} />}
          <Button
            onClick={() => {
              cancelWalletCapture();
            }}
          >
            {t("common.cancel")}
          </Button>
        </>
      ) : camera ? (
        <CardCamera onClose={() => setCamera(false)} />
      ) : (
        <>
          <div className="overflow-hidden rounded-3xl border border-separator/50 bg-paper">
            <Button
              variant="ghost"
              className="h-auto min-h-12 w-full justify-start gap-3 rounded-none px-4 py-3 text-start [&>span]:w-full [&>span]:justify-start [&>span]:gap-4"
              onClick={() => setCamera(true)}
            >
              <CameraIcon size={21} className="shrink-0 text-accent-text" />
              <span className="grow text-body font-medium">{t("wallet.scanCard")}</span>
              <ChevronRightIcon size={17} className="text-label-tertiary" />
            </Button>
            <div className="mx-4 border-t border-separator/50" />
            <Button
              variant="ghost"
              className="h-auto min-h-12 w-full justify-start gap-3 rounded-none px-4 py-3 text-start [&>span]:w-full [&>span]:justify-start [&>span]:gap-4"
              onClick={chooseImage}
            >
              <PhotoIcon size={21} className="shrink-0 text-accent-text" />
              <span className="grow text-body font-medium">{t("wallet.importImage")}</span>
              <ChevronRightIcon size={17} className="text-label-tertiary" />
            </Button>
            <div className="mx-4 border-t border-separator/50" />
            <Button
              variant="ghost"
              disabled={!nfc}
              className="h-auto min-h-12 w-full justify-start gap-3 rounded-none px-4 py-3 text-start [&>span]:w-full [&>span]:justify-start [&>span]:gap-4"
              onClick={() => void scanWalletNfc()}
            >
              <NfcReadIcon size={21} className="shrink-0 text-accent-text" />
              <span className="grow text-body font-medium">{t("wallet.readNfc")}</span>
              <ChevronRightIcon size={17} className="text-label-tertiary" />
            </Button>
          </div>
          {!nfc && (
            <p className="px-5 text-center text-footnote text-label-secondary">
              {t("wallet.nfcUnavailable")}
            </p>
          )}
          {error && <Button onClick={correctWalletCapture}>{t("wallet.correctManually")}</Button>}
          <Button variant="ghost" onClick={() => showWallet("home")}>
            {t("common.cancel")}
          </Button>
        </>
      )}
    </div>
  );
}
