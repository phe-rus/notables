import { TrashIcon } from "@phe-rus/hino";
import { Button } from "@phe-rus/hino/button";
import { IconButton } from "@phe-rus/hino/icon-button";
import type { ReceiptTileProps } from "@/features/finances/model/types";
import { t } from "@/i18n/i18n";
import { ReceiptImage } from "./receipt-image";

export function ReceiptTile({ src, onPreview, onRemove }: ReceiptTileProps) {
  return (
    <div className="relative rounded-xl border border-separator p-1">
      <Button
        variant="ghost"
        type="button"
        className="h-auto w-full overflow-hidden rounded-lg p-0 [&>span]:w-full"
        aria-label={t("finances.previewReceipt")}
        onClick={() => onPreview(src)}
      >
        <ReceiptImage src={src} />
      </Button>
      <div className="flex justify-end p-1">
        <IconButton
          label={t("finances.removeReceipt")}
          variant="destructive"
          size="icon-xs"
          onClick={onRemove}
        >
          <TrashIcon size={15} />
        </IconButton>
      </div>
    </div>
  );
}
