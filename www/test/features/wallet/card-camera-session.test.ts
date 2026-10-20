import { describe, expect, it, mock } from "bun:test";
import { suggestCardFields } from "@/features/wallet/lib/card-fields";
import { createCardCameraSession } from "@/features/wallet/lib/create-card-camera-session";
import type {
  CardCameraObserver,
  CardCameraServices,
  CardCameraSource,
  CardReading,
} from "@/features/wallet/model/types";

function deferred<T>() {
  const resolvers = Promise.withResolvers<T>();
  return resolvers;
}

const reading = (text = "UMEME\nMeter No 00123456789"): CardReading => ({
  text,
  confidence: 95,
  suggestions: suggestCardFields(text),
});

function fixture(back = false) {
  const trackStop = mock(() => {});
  // Lifecycle tests use only track stopping and canvas dimensions, never image pixels.
  const media = { getTracks: () => [{ stop: trackStop }] } as unknown as MediaStream;
  const frame = { width: 1600, height: 1000 } as HTMLCanvasElement;
  const scheduled: Array<{ work: () => Promise<void>; cancelled: boolean }> = [];
  const source = {
    ready: mock(() => true),
    capture: mock(() => frame),
    attach: mock(async (_stream: MediaStream) => {}),
    clear: mock((_stream: MediaStream | undefined) => {}),
  } satisfies CardCameraSource;
  const observer = {
    back,
    onDetected: mock((_value: CardReading | null) => {}),
    onPhase: mock((_phase: string) => {}),
    onRead: mock((_value: CardReading) => {}),
  } satisfies CardCameraObserver;
  const services = {
    reader: { read: mock(async (_frame: HTMLCanvasElement) => reading()), stop: mock(() => {}) },
    openCamera: mock(async () => media),
    resumeAccess: mock(async () => {}),
    systemPrompt: async (work: () => Promise<void>) => work(),
    readCodes: mock(async (_frame: HTMLCanvasElement): Promise<string[]> => []),
    schedule: (work: () => Promise<void>, _delay: number) => {
      const job = { work, cancelled: false };
      scheduled.push(job);
      return () => {
        job.cancelled = true;
      };
    },
  } satisfies CardCameraServices;
  const session = createCardCameraSession(source, observer, services);
  const flush = async () => {
    for (let i = 0; i < 12; i++) await Promise.resolve();
  };
  const nextFrame = async () => {
    const next = scheduled.shift();
    if (!next) throw new Error("No scheduled frame");
    if (!next.cancelled) {
      frame.width = 1600;
      frame.height = 1000;
      await next.work();
    }
  };
  return {
    session,
    source,
    observer,
    services,
    media,
    frame,
    trackStop,
    scheduled,
    flush,
    nextFrame,
  };
}

describe("wallet camera session ownership", () => {
  it("stops a late camera grant without resuming access or cancelling the reader twice", async () => {
    const f = fixture();
    const opening = deferred<MediaStream>();
    f.services.openCamera.mockImplementation(() => opening.promise);
    const started = f.session.start();
    f.session.stop();
    f.session.stop();
    opening.resolve(f.media);
    await started;
    expect(f.trackStop).toHaveBeenCalledTimes(1);
    expect(f.services.reader.stop).toHaveBeenCalledTimes(1);
    expect(f.services.resumeAccess).not.toHaveBeenCalled();
    expect(f.source.attach).not.toHaveBeenCalled();
    expect(f.observer.onRead).not.toHaveBeenCalled();
  });

  it("discards a late OCR result and clears its image after cancellation", async () => {
    const f = fixture();
    const result = deferred<CardReading>();
    f.services.reader.read.mockImplementation(() => result.promise);
    await f.session.start();
    f.session.capture();
    f.session.stop();
    expect(f.frame.width).toBe(0);
    result.resolve(reading());
    await f.flush();
    expect(f.observer.onRead).not.toHaveBeenCalled();
    expect(f.services.readCodes).not.toHaveBeenCalled();
    expect(f.scheduled).toHaveLength(0);
    expect(f.observer.onDetected.mock.calls.at(-1)?.[0]).toBeNull();
  });

  it("discards barcode completion after cancellation", async () => {
    const f = fixture();
    const codes = deferred<string[]>();
    f.services.readCodes.mockImplementation(() => codes.promise);
    f.session.capture();
    await f.session.start();
    await f.flush();
    expect(f.services.readCodes).toHaveBeenCalledTimes(1);
    f.session.stop();
    codes.resolve(["late result"]);
    await f.flush();
    expect(f.observer.onRead).not.toHaveBeenCalled();
    expect(f.trackStop).toHaveBeenCalledTimes(1);
  });

  it("never queues another frame while recognition is pending", async () => {
    const f = fixture();
    const result = deferred<CardReading>();
    f.services.reader.read.mockImplementation(() => result.promise);
    await f.session.start();
    await f.session.start();
    expect(f.services.reader.read).toHaveBeenCalledTimes(1);
    expect(f.scheduled).toHaveLength(0);
    result.resolve(reading());
    await f.flush();
    expect(f.scheduled).toHaveLength(1);
    f.session.stop();
    expect(f.scheduled[0]?.cancelled).toBe(true);
  });

  it("retries after frame capture throws instead of abandoning the scanning loop", async () => {
    const f = fixture();
    f.source.capture.mockImplementationOnce(() => {
      throw new Error("camera-not-ready");
    });
    await f.session.start();
    await f.flush();
    expect(f.observer.onPhase).toHaveBeenLastCalledWith("error");
    await f.nextFrame();
    expect(f.services.reader.read).toHaveBeenCalledTimes(1);
    expect(f.observer.onDetected).toHaveBeenCalledWith(reading());
    f.session.stop();
  });

  it("does not capture manually when only a logo is detected", async () => {
    const f = fixture();
    f.services.reader.read.mockResolvedValue(reading("VISA\nCONTACTLESS"));
    f.session.capture();
    await f.session.start();
    await f.flush();
    expect(f.observer.onRead).not.toHaveBeenCalled();
    expect(f.observer.onPhase).toHaveBeenLastCalledWith("error");
    expect(f.scheduled).toHaveLength(1);
    f.session.stop();
  });

  it("captures after two agreeing frames and releases resources before review", async () => {
    const f = fixture();
    f.observer.onRead.mockImplementation(() => {
      expect(f.trackStop).toHaveBeenCalledTimes(1);
      expect(f.services.reader.stop).toHaveBeenCalledTimes(1);
      expect(f.frame.width).toBe(0);
    });
    await f.session.start();
    await f.flush();
    await f.nextFrame();
    expect(f.observer.onRead).toHaveBeenCalledTimes(1);
    expect(f.scheduled).toHaveLength(0);
  });

  it("releases the camera if Wallet access has expired while permission was open", async () => {
    const f = fixture();
    f.services.resumeAccess.mockRejectedValue(new Error("locked"));
    await f.session.start();
    expect(f.trackStop).toHaveBeenCalledTimes(1);
    expect(f.source.attach).not.toHaveBeenCalled();
    expect(f.observer.onRead).not.toHaveBeenCalled();
    expect(f.observer.onPhase).toHaveBeenLastCalledWith("error");
    f.session.stop();
  });

  it("does not attach or accept a frame after cancellation during the access check", async () => {
    const f = fixture();
    const access = deferred<void>();
    f.services.resumeAccess.mockImplementation(() => access.promise);
    const started = f.session.start();
    await f.flush();
    f.session.stop();
    access.resolve();
    await started;
    expect(f.source.attach).not.toHaveBeenCalled();
    expect(f.services.reader.read).not.toHaveBeenCalled();
    expect(f.trackStop).toHaveBeenCalledTimes(1);
  });

  it("does not start reading after cancelled video playback finishes", async () => {
    const f = fixture();
    const play = deferred<void>();
    f.source.attach.mockImplementation(() => play.promise);
    const started = f.session.start();
    await f.flush();
    f.session.stop();
    play.resolve();
    await started;
    expect(f.services.reader.read).not.toHaveBeenCalled();
    expect(f.source.clear).toHaveBeenCalledWith(f.media);
    expect(f.trackStop).toHaveBeenCalledTimes(1);
  });

  it("allows a manual back capture containing only a security code", async () => {
    const f = fixture(true);
    f.services.reader.read.mockResolvedValue(reading("CVV: 123"));
    f.session.capture();
    await f.session.start();
    await f.flush();
    expect(f.observer.onRead).toHaveBeenCalledTimes(1);
    expect(f.observer.onRead.mock.calls[0]?.[0].suggestions.cvv).toBe("123");
  });

  it("does not start a session already stopped while the document was hidden", async () => {
    const f = fixture();
    f.session.stop();
    await f.session.start();
    expect(f.services.openCamera).not.toHaveBeenCalled();
    expect(f.observer.onRead).not.toHaveBeenCalled();
  });
});
