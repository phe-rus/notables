import {
  Button,
  CameraIcon,
  ChevronRightIcon,
  IconButton,
  NfcReadIcon,
  PhotoIcon,
} from "@phe-rus/hino";
import { useEffect, useRef, useState } from "react";
import { t } from "../../../i18n/i18n";
import { captureCardFrame, openCardCamera } from "../lib/card-image";
import { walletNfcAvailable } from "../lib/card-nfc";
import {
  cancelWalletCapture,
  correctWalletCapture,
  importWalletImage,
  recognizeWalletCanvas,
  scanWalletNfc,
  showWallet,
  useWallet,
} from "../store/wallet-store";
import { ManualCardForm } from "./manual-card-form";

export function CardCapture() {
  const { captureReview: review, captureProgress: progress, captureError: error } = useWallet();
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
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const epoch = useRef(0);
  const [camera, setCamera] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const stopCamera = () => {
    stream.current?.getTracks().forEach((track) => {
      track.stop();
    });
    stream.current = null;
  };
  useEffect(
    () => () => {
      epoch.current++;
      stopCamera();
    },
    [],
  );
  useEffect(() => {
    if (camera && video.current) {
      video.current.srcObject = stream.current;
      void video.current.play().catch(() => {});
    }
  }, [camera]);
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
  const openCamera = async () => {
    const token = ++epoch.current;
    setCameraError(false);
    try {
      const media = await openCardCamera();
      if (token !== epoch.current) {
        media.getTracks().forEach((track) => {
          track.stop();
        });
        return;
      }
      stream.current = media;
      setCamera(true);
    } catch {
      if (token === epoch.current) setCameraError(true);
    }
  };
  const takePhoto = () => {
    const source = video.current;
    if (!source?.videoWidth) return;
    // Only what's inside the card guide is read.
    const canvas = captureCardFrame(source);
    stopCamera();
    setCamera(false);
    void recognizeWalletCanvas(canvas);
  };
  if (review)
    return (
      <div className="flex flex-col gap-4">
        {review.text && (
          <p className="text-sm text-label-secondary">
            {review.source === "nfc"
              ? t("wallet.nfcReviewHint")
              : t("wallet.reviewHint", { confidence: Math.round(review.confidence) })}
          </p>
        )}
        {review.text && (
          <details className="rounded-3xl bg-fill p-4">
            <summary>{t("wallet.recognizedText")}</summary>
            <p dir="auto" className="mt-3 whitespace-pre-wrap [overflow-wrap:anywhere]">
              {review.text}
            </p>
          </details>
        )}
        <ManualCardForm card={null} suggestions={review.suggestions} />
      </div>
    );
  return (
    <div className="mx-auto flex w-full max-w-[440px] flex-col gap-5">
      <h2 className="text-center text-title font-bold tracking-tight">{t("wallet.scanTitle")}</h2>
      <p className="px-3 text-center text-subheadline text-label-secondary">
        {t("wallet.scanHint")}
      </p>
      {(error || cameraError) && (
        <p role="alert" className="text-sm text-label-secondary">
          {t("wallet.captureError")}
        </p>
      )}
      {working ? (
        <>
          <p role="status">{t("wallet.recognizing")}</p>
          <progress className="w-full" value={progress ?? 0} max={1} />
          <Button
            onClick={() => {
              cancelWalletCapture();
            }}
          >
            {t("common.cancel")}
          </Button>
        </>
      ) : camera ? (
        <>
          <div className="relative overflow-hidden rounded-3xl bg-black">
            <video ref={video} muted playsInline className="aspect-[85.6/54] w-full object-cover" />
            {/* The card guide: what's inside it is what gets read. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-[2%] rounded-2xl border-2 border-white/85 shadow-[0_0_0_100vmax_rgb(0_0_0/0.35)]"
            />
            <p className="absolute inset-x-0 bottom-3 text-center text-footnote font-medium text-white drop-shadow">
              {t("wallet.alignCard")}
            </p>
          </div>
          <IconButton
            variant="default"
            className="size-16 self-center"
            label={t("capture.takePhoto")}
            onClick={takePhoto}
          >
            <CameraIcon size={28} />
          </IconButton>
          <Button
            onClick={() => {
              epoch.current++;
              stopCamera();
              setCamera(false);
            }}
          >
            {t("common.cancel")}
          </Button>
        </>
      ) : (
        <>
          <div className="overflow-hidden rounded-3xl border border-separator/50 bg-paper">
            <Button
              variant="ghost"
              className="h-auto min-h-16 w-full justify-start gap-4 rounded-none px-5 py-4 text-start [&>span]:w-full [&>span]:justify-start [&>span]:gap-4"
              onClick={() => void openCamera()}
            >
              <CameraIcon size={25} className="shrink-0 text-accent-text" />
              <span className="grow text-body font-medium">{t("wallet.scanCard")}</span>
              <ChevronRightIcon size={17} className="text-label-tertiary" />
            </Button>
            <div className="mx-5 border-t border-separator/50" />
            <Button
              variant="ghost"
              className="h-auto min-h-16 w-full justify-start gap-4 rounded-none px-5 py-4 text-start [&>span]:w-full [&>span]:justify-start [&>span]:gap-4"
              onClick={chooseImage}
            >
              <PhotoIcon size={25} className="shrink-0 text-accent-text" />
              <span className="grow text-body font-medium">{t("wallet.importImage")}</span>
              <ChevronRightIcon size={17} className="text-label-tertiary" />
            </Button>
            <div className="mx-5 border-t border-separator/50" />
            <Button
              variant="ghost"
              disabled={!nfc}
              className="h-auto min-h-16 w-full justify-start gap-4 rounded-none px-5 py-4 text-start [&>span]:w-full [&>span]:justify-start [&>span]:gap-4"
              onClick={() => void scanWalletNfc()}
            >
              <NfcReadIcon size={25} className="shrink-0 text-accent-text" />
              <span className="grow text-body font-medium">{t("wallet.readNfc")}</span>
              <ChevronRightIcon size={17} className="text-label-tertiary" />
            </Button>
          </div>
          {!nfc && (
            <p className="px-5 text-center text-footnote text-label-secondary">
              {t("wallet.nfcUnavailable")}
            </p>
          )}
          {(error || cameraError) && (
            <Button onClick={correctWalletCapture}>{t("wallet.correctManually")}</Button>
          )}
          <Button variant="ghost" onClick={() => showWallet("home")}>
            {t("common.cancel")}
          </Button>
        </>
      )}
    </div>
  );
}
