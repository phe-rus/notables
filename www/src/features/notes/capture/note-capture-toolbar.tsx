import { localDay, localMediaSrc } from "@notables/core";
import { BlockToolbar, useEditorCommands } from "@notables/pluraliti";
import { Button, Sheet, toast } from "@phe-rus/hino";
import { useRef, useState } from "react";
import { t } from "../../../i18n/i18n";
import { saveMedia } from "../../../platform/storage/media-store";
import { getLinkPreview } from "../../../server/link-preview/link-preview.functions";
import type { EventTarget } from "../../calendar/components/event-form";
import { EventSheet } from "../../calendar/components/event-sheet";
import { getCalendarStore } from "../../calendar/store/calendar-store";
import { editorLabels } from "../lib/editor-labels";

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
  const { insertAttachment, insertImage, insertLinkCard, appendContent } = useEditorCommands();
  const file = useRef<HTMLInputElement>(null);
  const scan = useRef<HTMLInputElement>(null);
  const mode = useRef<"text" | "document">("text");
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
  const scanFile = async (item?: File) => {
    if (!item || busy) return;
    setBusy(true);
    try {
      if (mode.current === "document") {
        const { prepareCardImage } = await import("../../wallet/lib/card-recognition");
        const canvas = await prepareCardImage(item);
        const blob = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob(
            (value) => (value ? resolve(value) : reject(new Error("image-failed"))),
            "image/jpeg",
            0.92,
          ),
        );
        canvas.width = 0;
        canvas.height = 0;
        insertImage({
          src: localMediaSrc(await saveMedia(blob)),
          alt: item.name,
          layout: { aspect: "original", fit: "contain" },
        });
      } else {
        const { prepareCardImage, recognizeCard } = await import(
          "../../wallet/lib/card-recognition"
        );
        const { currentLanguage } = await import("../../../i18n/i18n");
        const canvas = await prepareCardImage(item);
        const result = await recognizeCard(canvas, currentLanguage(), () => {}).result;
        if (!result.text.trim()) throw new Error("no-text");
        appendContent({ paragraphs: result.text.trim().split(/\n\s*\n/) });
      }
    } catch {
      toast.error(t("editor.photoFailed"));
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
                mode.current = "text";
                scan.current?.click();
              }
        }
        onScanDocument={
          browser || busy
            ? undefined
            : () => {
                mode.current = "document";
                scan.current?.click();
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
      <input
        ref={scan}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        hidden
        onChange={(event) => {
          void scanFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
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
              const preview = await getLinkPreview({ data: { url: url.href } });
              if (previewJob.current === job) insertLinkCard(preview);
            } catch {
              if (previewJob.current === job)
                insertLinkCard({ url: url.href, title: url.hostname, description: "", image: "" });
            } finally {
              if (previewJob.current === job) {
                setPreviewing(false);
                setLinking(false);
                setLink("");
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
