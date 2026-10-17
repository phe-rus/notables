import { Button, CameraIcon, IconButton } from "@phe-rus/hino";
import { useEffect, useRef, useState } from "react";
import { currentLanguage, t } from "../../../i18n/i18n";
import { readCardCodes } from "../lib/card-codes";
import { captureCardFrame, openCardCamera } from "../lib/card-image";
import { createCardReader, createCardStability } from "../lib/card-reader";
import { suggestCardFields } from "../lib/card-recognition";
import { reviewWalletReading } from "../store/wallet-store";

/** Keep the preview alive while recognizing; never queue camera frames. */
export function CardCamera({ onClose }: { onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const shutter = useRef(false);
  const [phase, setPhase] = useState<"opening" | "scanning" | "detected" | "error">("opening");
  useEffect(() => {
    let active = true;
    let stream: MediaStream | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const reader = createCardReader(currentLanguage());
    const stable = createCardStability();
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
        const automatic = stable(reading);
        setPhase(reading.confidence >= 65 && reading.text.trim() ? "detected" : "scanning");
        if (automatic || shutter.current) {
          shutter.current = false;
          if (!reading.text.trim()) {
            setPhase("error");
          } else {
            const codes = await readCardCodes(canvas).catch(() => []);
            if (!active) return;
            const text = [reading.text, ...codes].join("\n");
            stop();
            reviewWalletReading({ ...reading, text, suggestions: suggestCardFields(text) });
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
    void openCardCamera()
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
      <Button variant="ghost" onClick={onClose}>
        {t("common.cancel")}
      </Button>
    </div>
  );
}
