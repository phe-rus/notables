import { useEffect, useRef, useState } from "react";
import { currentLanguage } from "@/i18n/i18n";
import { readCardCodes } from "../lib/card-codes";
import { captureCardFrame, openCardCamera } from "../lib/card-image";
import { createCardReader } from "../lib/card-reader";
import { createCardCameraSession } from "../lib/create-card-camera-session";
import { withWalletSystemPrompt } from "../lib/wallet-auth";
import type { CardCameraPhase, CardCameraProps, CardReading } from "../model/types";
import { resumeWalletCapture, reviewWalletReading } from "../store/wallet-store";

export function useCardCamera(onRead: CardCameraProps["onRead"]) {
  const video = useRef<HTMLVideoElement>(null);
  const session = useRef<ReturnType<typeof createCardCameraSession> | null>(null);
  const accepted = useRef(onRead);
  const [detected, setDetected] = useState<CardReading | null>(null);
  const [phase, setPhase] = useState<CardCameraPhase>("opening");
  const back = !!onRead;
  useEffect(() => {
    accepted.current = onRead;
  }, [onRead]);
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    setPhase("opening");
    setDetected(null);
    const current = createCardCameraSession(
      {
        ready: () => !!element.videoWidth && element.readyState >= 2,
        capture: () => captureCardFrame(element, 1600),
        attach: async (media) => {
          element.srcObject = media;
          await element.play();
        },
        clear: (media) => {
          if (media && element.srcObject === media) element.srcObject = null;
        },
      },
      {
        back,
        onDetected: setDetected,
        onPhase: setPhase,
        onRead: (reading) => {
          if (accepted.current) accepted.current(reading);
          else reviewWalletReading(reading);
        },
      },
      {
        reader: createCardReader(currentLanguage()),
        openCamera: openCardCamera,
        resumeAccess: resumeWalletCapture,
        systemPrompt: withWalletSystemPrompt,
        readCodes: readCardCodes,
        schedule: (work, delay) => {
          const timer = setTimeout(() => void work(), delay);
          return () => clearTimeout(timer);
        },
      },
    );
    session.current = current;
    const visibility = () => {
      if (document.hidden) current.stop();
    };
    document.addEventListener("visibilitychange", visibility);
    if (document.hidden) current.stop();
    else void current.start();
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      current.stop();
      if (session.current === current) session.current = null;
    };
  }, [back]);
  return { video, detected, phase, capture: () => session.current?.capture() };
}
