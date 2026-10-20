import { Button, CameraIcon, IconButton } from "@phe-rus/hino";
import { useEffect, useRef, useState } from "react";
import { currentLanguage, t } from "@/i18n/i18n";
import { readCardCodes } from "../lib/card-codes";
import { captureCardFrame, openCardCamera } from "../lib/card-image";
import {
  type CardReading,
  createCardReader,
  createCardStability,
  hasCardDetails,
} from "../lib/card-reader";
import { suggestCardFields } from "../lib/card-recognition";
import { withWalletSystemPrompt } from "../lib/wallet-auth";
import { kindMessageKeys } from "../model/wallet-model";
import { resumeWalletCapture, reviewWalletReading } from "../store/wallet-store";

/** Keep the preview alive while recognizing; never queue camera frames. */
export function CardCamera({
  onClose,
  onRead,
}: {
  onClose: () => void;
  onRead?: (reading: CardReading) => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const shutter = useRef(false);
  const [detected, setDetected] = useState<CardReading | null>(null);
  const [phase, setPhase] = useState<"opening" | "scanning" | "detected" | "error">("opening");
  useEffect(() => {
    let active = true;
    let stream: MediaStream | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const reader = createCardReader(currentLanguage());
    const stable = createCardStability(!!onRead);
    const stop = () => {
      active = false;
      clearTimeout(timer);
      reader.stop();
      stream?.getTracks().forEach((track) => {
        track.stop();
      });
      if (video.current) video.current.srcObject = null;
    };
    const tick = async () => {
      if (!active) return;
      const source = video.current;
      if (!source?.videoWidth || source.readyState < 2) {
        timer = setTimeout(() => void tick(), 150);
        return;
      }
      const canvas = captureCardFrame(source, 1600);
      try {
        const reading = await reader.read(canvas);
        if (!active) return;
        setDetected(reading);
        const automatic = stable(reading);
        setPhase(reading.confidence >= 65 && hasCardDetails(reading) ? "detected" : "scanning");
        if (automatic || shutter.current) {
          shutter.current = false;
          const codes = await readCardCodes(canvas).catch(() => []);
          if (!active) return;
          const text = [reading.text, ...codes].join("\n");
          const complete = {
            ...reading,
            text,
            suggestions: { ...suggestCardFields(text), palette: reading.suggestions.palette },
          };
          if (!text.trim() || (!onRead && !hasCardDetails(complete))) setPhase("error");
          else {
            stop();
            if (onRead) onRead(complete);
            else reviewWalletReading(complete);
            return;
          }
        }
      } catch {
        if (active) setPhase("error");
      } finally {
        canvas.width = 0;
        canvas.height = 0;
      }
      if (active) timer = setTimeout(() => void tick(), 350);
    };
    void withWalletSystemPrompt(async () => {
      stream = await openCardCamera();
      await resumeWalletCapture();
      return stream;
    })
      .then(async (media) => {
        stream = media;
        if (!active || !video.current) {
          stop();
          return;
        }
        video.current.srcObject = media;
        await video.current.play();
        if (!active) return;
        setPhase("scanning");
        void tick();
      })
      .catch(() => {
        if (active) {
          stream?.getTracks().forEach((track) => {
            track.stop();
          });
          setPhase("error");
        }
      });
    const visibility = () => {
      if (document.hidden) stop();
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      stop();
    };
  }, []);
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
        onClick={() => {
          shutter.current = true;
        }}
      >
        <CameraIcon size={24} />
      </IconButton>
      <Button size="sm" variant="ghost" className="self-center" onClick={onClose}>
        {t("common.cancel")}
      </Button>
    </div>
  );
}
