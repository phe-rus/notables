import { localDay, localMediaSrc } from "@notables/core";
import { BlockToolbar, useEditorCommands } from "@notables/pluraliti";
import { Button, Sheet, toast } from "@phe-rus/hino";
import { useRef, useState } from "react";
import type { EventTarget } from "@/features/calendar/components/event-form";
import { EventSheet } from "@/features/calendar/components/event-sheet";
import { getCalendarStore } from "@/features/calendar/store/calendar-store";
import { DocumentScanner } from "@/features/capture/components/document-scanner";
import { t } from "@/i18n/i18n";
import { saveMedia } from "@/platform/storage/media-store";
import { editorLabels } from "../lib/editor-labels";
import { fetchLinkPreview } from "./link-preview";

/** Captures content into the current editor and reuses the calendar's reminder editor. */
export function NoteCaptureToolbar({
  noteId,
  title,
  browser,
  onRecord,
  resolvePhoto,
  className,
  menuPlacement,
}: {
  noteId: string;
  title: string;
  browser: boolean;
  onRecord: () => void;
  resolvePhoto: (file: File) => Promise<string>;
  className?: string;
  menuPlacement?: "above" | "below";
}) {
  const { insertAttachment, insertLinkCard, appendContent } = useEditorCommands();
  const file = useRef<HTMLInputElement>(null);
  const [scanMode, setScanMode] = useState<"text" | "document" | null>(null);
  const [scannedText, setScannedText] = useState<string | null>(null);
  const [reminder, setReminder] = useState<EventTarget | null>(null);
  const previewJob = useRef(0);
  const closePreview = () => {
    previewJob.current++;
    setLinking(false);
    setPreviewing(false);
  };
  const [linking, setLinking] = useState(false);
  const [link, setLink] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [busy, setBusy] = useState(false);
  const addFiles = async (files: File[]) => {
    for (const item of files) {
      try {
        if (item.size > 128 * 1024 * 1024) throw new Error("file-too-large");
        insertAttachment({
          src: localMediaSrc(
            await saveMedia(
              item.type ? item : new Blob([item], { type: "application/octet-stream" }),
            ),
          ),
          name: item.name,
          mime: item.type,
          size: item.size,
        });
      } catch {
        toast.error(t("editor.photoFailed"));
      }
    }
  };
  const scanFiles = async (files: File[]) => {
    if (!files.length || busy) return;
    setBusy(true);
    try {
      const { prepareCardImage, recognizeCard } = await import(
        "@/features/wallet/lib/card-recognition"
      );
      if (scanMode === "document") {
        const { PDFDocument } = await import("pdf-lib");
        const pdf = await PDFDocument.create();
        for (const file of files.slice(0, 10)) {
          const canvas = await prepareCardImage(file);
          try {
            const blob = await new Promise<Blob>((resolve, reject) =>
              canvas.toBlob(
                (value) => (value ? resolve(value) : reject(new Error("capture-failed"))),
                "image/jpeg",
                0.9,
              ),
            );
            const image = await pdf.embedJpg(await blob.arrayBuffer());
            const page = pdf.addPage([595.28, 841.89]);
            const fit = Math.min(555.28 / image.width, 801.89 / image.height);
            const width = image.width * fit;
            const height = image.height * fit;
            page.drawImage(image, {
              x: (595.28 - width) / 2,
              y: (841.89 - height) / 2,
              width,
              height,
            });
          } finally {
            canvas.width = 0;
            canvas.height = 0;
          }
        }
        const bytes = await pdf.save();
        const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
        insertAttachment({
          src: localMediaSrc(await saveMedia(blob)),
          name: `${t("capture.scannedDocument")}.pdf`,
          mime: blob.type,
          size: blob.size,
        });
      } else {
        const { currentLanguage } = await import("@/i18n/i18n");
        const first = files[0];
        if (!first) return;
        const canvas = await prepareCardImage(first);
        const result = await recognizeCard(canvas, currentLanguage(), () => {}, "document").result;
        if (!result.text.trim()) throw new Error("no-text");
        setScannedText(result.text.trim());
      }
    } catch (error) {
      toast.error(t("capture.scanFailed"));
      throw error;
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <BlockToolbar
        labels={editorLabels()}
        onLinkPreview={() => setLinking(true)}
        onRecord={browser ? undefined : onRecord}
        resolvePhoto={resolvePhoto}
        onAttach={() => file.current?.click()}
        onReminder={() => {
          const event = getCalendarStore().draft("reminder");
          setReminder({
            event: { ...event, title, related: { type: "note", id: noteId } },
            day: localDay(),
            isNew: true,
          });
        }}
        onScanText={
          browser || busy
            ? undefined
            : () => {
                setScanMode("text");
              }
        }
        onScanDocument={
          browser || busy
            ? undefined
            : () => {
                setScanMode("document");
              }
        }
        className={className}
        menuPlacement={menuPlacement}
      />
      <input
        ref={file}
        type="file"
        multiple
        hidden
        onChange={(event) => {
          void addFiles(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />
      <DocumentScanner mode={scanMode} onClose={() => setScanMode(null)} onCapture={scanFiles} />
      <Sheet
        open={scannedText !== null}
        onClose={() => setScannedText(null)}
        label={t("capture.reviewText")}
        className="max-w-[540px]"
      >
        <div className="flex flex-col gap-4 p-5">
          <h2 className="text-title3 font-semibold">{t("capture.reviewText")}</h2>
          <textarea
            aria-label={t("capture.reviewText")}
            value={scannedText ?? ""}
            rows={10}
            onChange={(event) => setScannedText(event.target.value)}
            className="rounded-xl control-field p-3 text-body"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setScannedText(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              disabled={!scannedText?.trim()}
              onClick={() => {
                appendContent({ paragraphs: (scannedText ?? "").split(/\n\s*\n/) });
                setScannedText(null);
              }}
            >
              {t("editor.apply")}
            </Button>
          </div>
        </div>
      </Sheet>
      <Sheet
        open={linking}
        onClose={closePreview}
        label={t("editor.linkPreview")}
        className="max-w-[480px]"
      >
        <form
          className="flex flex-col gap-4 p-6"
          onSubmit={async (event) => {
            event.preventDefault();
            let url: URL;
            try {
              url = new URL(link.includes("://") ? link : `https://${link}`);
              if (url.protocol !== "https:" || url.username || url.password)
                throw new Error("unsupported-link");
            } catch {
              return;
            }
            const job = ++previewJob.current;
            setPreviewing(true);
            try {
              const preview = await fetchLinkPreview(url.href);
              if (previewJob.current === job) {
                insertLinkCard(preview);
                setLinking(false);
                setLink("");
              }
            } catch {
              if (previewJob.current === job) toast.error(t("capture.previewFailed"));
            } finally {
              if (previewJob.current === job) {
                setPreviewing(false);
              }
            }
          }}
        >
          <h2 className="text-title3 font-semibold">{t("editor.linkPreview")}</h2>
          <input
            aria-label={t("editor.link")}
            type="text"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            placeholder="https://"
            value={link}
            onChange={(event) => setLink(event.target.value)}
            className="rounded-xl control-field px-3 py-3 text-body"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={closePreview}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={previewing || !link.trim()}>
              {previewing ? t("editor.previewLoading") : t("editor.apply")}
            </Button>
          </div>
        </form>
      </Sheet>
      <EventSheet target={reminder} onClose={() => setReminder(null)} />
    </>
  );
}
