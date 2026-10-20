import { hasCardDetails } from "../model/has-card-details";
import type { CardCameraObserver, CardCameraServices, CardCameraSource } from "../model/types";
import { suggestCardFields } from "./card-fields";
import { createCardStability } from "./create-card-stability";

/** Owns the camera and at most one frame until completion, cancellation or hiding. */
export function createCardCameraSession(
  source: CardCameraSource,
  observer: CardCameraObserver,
  services: CardCameraServices,
) {
  let active = true;
  let started = false;
  let requested = false;
  let media: MediaStream | undefined;
  let frame: HTMLCanvasElement | undefined;
  let cancelTimer: (() => void) | undefined;
  const stable = createCardStability(observer.back);
  const releaseMedia = () => {
    const released = media;
    media = undefined;
    released?.getTracks().forEach((track) => {
      track.stop();
    });
    source.clear(released);
  };
  const stop = () => {
    if (!active) return;
    active = false;
    requested = false;
    cancelTimer?.();
    services.reader.stop();
    releaseMedia();
    if (frame) frame.width = frame.height = 0;
    observer.onDetected(null);
  };
  const tick = async () => {
    if (!active) return;
    if (!source.ready()) {
      cancelTimer = services.schedule(tick, 150);
      return;
    }
    let captured: HTMLCanvasElement | undefined;
    try {
      captured = source.capture();
      frame = captured;
      const reading = await services.reader.read(captured);
      if (!active) return;
      observer.onDetected(reading);
      const automatic = stable(reading);
      observer.onPhase(
        reading.confidence >= 65 && hasCardDetails(reading) ? "detected" : "scanning",
      );
      if (automatic || requested) {
        requested = false;
        const codes = await services.readCodes(captured).catch(() => []);
        if (!active) return;
        const text = [reading.text, ...codes].join("\n");
        const complete = {
          ...reading,
          text,
          suggestions: { ...suggestCardFields(text), palette: reading.suggestions.palette },
        };
        if (!text.trim() || (!observer.back && !hasCardDetails(complete)))
          observer.onPhase("error");
        else {
          stop();
          observer.onRead(complete);
          return;
        }
      }
    } catch {
      if (active) observer.onPhase("error");
    } finally {
      if (captured) captured.width = captured.height = 0;
      frame = undefined;
    }
    if (active) cancelTimer = services.schedule(tick, 350);
  };
  return {
    async start() {
      if (started || !active) return;
      started = true;
      try {
        await services.systemPrompt(async () => {
          media = await services.openCamera();
          if (!active) {
            releaseMedia();
            return;
          }
          await services.resumeAccess();
        });
        if (!active) {
          releaseMedia();
          return;
        }
        if (!media) return;
        await source.attach(media);
        if (!active) return;
        observer.onPhase("scanning");
        void tick();
      } catch {
        releaseMedia();
        if (active) observer.onPhase("error");
      }
    },
    capture() {
      if (active) requested = true;
    },
    stop,
  };
}
