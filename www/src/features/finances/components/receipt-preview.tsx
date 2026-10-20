import { CloseIcon } from "@phe-rus/hino";
import { IconButton } from "@phe-rus/hino/icon-button";
import { Sheet } from "@phe-rus/hino/sheet";
import type { ReceiptPreviewProps } from "@/features/finances/model/types";
import { t } from "@/i18n/i18n";
import { ReceiptImage } from "./receipt-image";

export function ReceiptPreview({ src, onClose }: ReceiptPreviewProps) {
  return (
    <Sheet
      open={src !== null}
      onClose={onClose}
      label={t("finances.receipt")}
      className="max-w-[1000px]"
    >
      <header className="flex items-center justify-between p-3">
        <h2 className="text-headline">{t("finances.receipt")}</h2>
        <IconButton label={t("common.close")} size="icon-sm" onClick={onClose}>
          <CloseIcon size={18} />
        </IconButton>
      </header>
      {src && <ReceiptImage src={src} />}
    </Sheet>
  );
}
