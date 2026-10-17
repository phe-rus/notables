import { CameraIcon, CloseIcon, IconButton, PhotoIcon, PlusIcon, TrashIcon } from "@phe-rus/hino";
import { Button } from "@phe-rus/hino/button";
import { Sheet } from "@phe-rus/hino/sheet";
import { useEffect, useRef, useState } from "react";
import { t } from "../../../i18n/i18n";

interface Page {
  file: File;
  url: string;
}

/** Camera capture with a review step. Files are a separate, explicit acquisition choice. */
export function DocumentScanner({
  mode,
  onClose,
  onCapture,
}: {
  mode: "text" | "document" | null;
  onClose: () => void;
  onCapture: (files: File[]) => Promise<void>;
}) {
  return (
    <Sheet
      open={mode !== null}
      onClose={onClose}
      label={mode === "text" ? t("editor.scanText") : t("editor.scanDocument")}
      className="max-w-[540px]"
    >
      {mode && <CameraCapture mode={mode} onClose={onClose} onCapture={onCapture} />}
    </Sheet>
  );
}

function CameraCapture({
  mode,
  onClose,
  onCapture,
}: {
  mode: "text" | "document";
  onClose: () => void;
  onCapture: (files: File[]) => Promise<void>;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const pagesRef = useRef<Page[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cameraVersion, setCameraVersion] = useState(0);
  const [reviewing, setReviewing] = useState(false);
  const stop = () => {
    stream.current?.getTracks().forEach((track) => {
      track.stop();
    });
    stream.current = null;
  };
  useEffect(() => {
    if (reviewing) return;
    let cancelled = false;
    setReady(false);
    setError(false);
    void navigator.mediaDevices
      .getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1920 },
        },
      })
      .then(async (media) => {
        if (cancelled || document.hidden) {
          media.getTracks().forEach((track) => {
            track.stop();
          });
          return;
        }
        stream.current = media;
        if (video.current) {
          video.current.srcObject = media;
          await video.current.play();
        }
        if (!cancelled) setReady(true);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    const hide = () => {
      if (document.hidden) {
        stop();
        setReady(false);
      }
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      cancelled = true;
      stop();
      document.removeEventListener("visibilitychange", hide);
    };
  }, [reviewing, cameraVersion]);
  useEffect(
    () => () => {
      for (const page of pagesRef.current) URL.revokeObjectURL(page.url);
    },
    [],
  );
  const remember = (files: File[]) => {
    const available = (mode === "text" ? 1 : 10) - pagesRef.current.length;
    const next = [
      ...pagesRef.current,
      ...files.slice(0, available).map((file) => ({ file, url: URL.createObjectURL(file) })),
    ];
    pagesRef.current = next;
    setPages(next);
    setReviewing(true);
  };
  const take = async () => {
    const source = video.current;
    if (!source?.videoWidth || !ready || busy) return;
    setBusy(true);
    try {
      const canvas = document.createElement("canvas");
      // Match the viewfinder's cover crop exactly, including portrait cameras.
      const aspect = 3 / 4;
      const width = Math.min(source.videoWidth, source.videoHeight * aspect);
      const height = width / aspect;
      const inset = 0.07;
      const scale = Math.min(1, 1800 / height);
      canvas.width = Math.round(width * (1 - 2 * inset) * scale);
      canvas.height = Math.round(height * (1 - 2 * inset) * scale);
      canvas
        .getContext("2d")
        ?.drawImage(
          source,
          (source.videoWidth - width) / 2 + width * inset,
          (source.videoHeight - height) / 2 + height * inset,
          width * (1 - 2 * inset),
          height * (1 - 2 * inset),
          0,
          0,
          canvas.width,
          canvas.height,
        );
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.9),
      );
      canvas.width = 0;
      canvas.height = 0;
      if (!blob) throw new Error("capture-failed");
      remember([new File([blob], `scan-${pages.length + 1}.jpg`, { type: blob.type })]);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };
  const finish = async () => {
    setBusy(true);
    try {
      await onCapture(pages.map((page) => page.file));
      onClose();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-col gap-4 p-4">
      <header className="flex items-center gap-3">
        <h2 className="grow text-title3 font-semibold">
          {mode === "text" ? t("editor.scanText") : t("editor.scanDocument")}
        </h2>
        <IconButton variant="ghost" label={t("common.close")} onClick={onClose}>
          <CloseIcon size={21} />
        </IconButton>
      </header>
      {error && (
        <p role="alert" className="rounded-xl bg-fill p-3 text-footnote text-label-secondary">
          {t("capture.cameraError")}
        </p>
      )}
      {reviewing ? (
        <>
          <div className="no-scrollbar flex gap-3 overflow-x-auto rounded-2xl bg-fill p-3">
            {pages.map((page, index) => (
              <div key={page.url} className="relative w-44 shrink-0">
                <img
                  src={page.url}
                  alt={t("capture.page", { count: index + 1 })}
                  className="aspect-[3/4] w-full rounded-lg object-contain"
                />
                <IconButton
                  variant="secondary"
                  className="absolute end-1 top-1"
                  label={t("capture.removePage")}
                  onClick={() => {
                    URL.revokeObjectURL(page.url);
                    const next = pages.filter((item) => item !== page);
                    pagesRef.current = next;
                    setPages(next);
                    if (!next.length) setReviewing(false);
                  }}
                >
                  <TrashIcon size={17} />
                </IconButton>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            {mode === "document" && pages.length < 10 && (
              <Button variant="ghost" disabled={busy} onClick={() => setReviewing(false)}>
                <PlusIcon size={19} />
                {t("capture.addPage")}
              </Button>
            )}
            <Button disabled={busy || !pages.length} onClick={() => void finish()}>
              {busy ? t("capture.processing") : t("capture.useScan")}
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="relative mx-auto w-[min(100%,37.5dvh)] max-w-[360px] overflow-hidden rounded-3xl bg-black aspect-[3/4]">
            <video ref={video} playsInline muted className="size-full object-cover" />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-[7%] rounded-xl border border-white/80"
            />
            <p className="absolute inset-x-4 bottom-5 text-center text-footnote text-white">
              {ready ? t("capture.alignPage") : t("capture.starting")}
            </p>
          </div>
          <div className="flex items-center justify-center gap-8">
            <IconButton
              variant="ghost"
              label={t("capture.importImages")}
              onClick={() => file.current?.click()}
            >
              <PhotoIcon size={24} />
            </IconButton>
            <IconButton
              variant="default"
              label={t("capture.takePhoto")}
              disabled={!ready || busy}
              className="size-16 rounded-full"
              onClick={() => void take()}
            >
              <CameraIcon size={28} />
            </IconButton>
            <IconButton
              variant="ghost"
              label={t("capture.retryCamera")}
              onClick={() => setCameraVersion((value) => value + 1)}
            >
              <CameraIcon size={24} />
            </IconButton>
          </div>
        </>
      )}
      <input
        ref={file}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple={mode === "document"}
        hidden
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          if (files.length) remember(files);
        }}
      />
    </div>
  );
}
