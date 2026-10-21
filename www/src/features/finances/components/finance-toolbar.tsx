import {
  CameraIcon,
  CommentIcon,
  InvoiceIcon,
  LayoutIcon,
  openMenu,
  PenIcon,
  PhotoIcon,
  PlusIcon,
} from "@phe-rus/hino";
import { IconButton } from "@phe-rus/hino/icon-button";
import { t } from "@/i18n/i18n";
import type { FinanceToolbarProps } from "../model/types";

export function FinanceToolbar({
  onOpenLedger,
  onScan,
  onImportReceipt,
  onImportMessage,
  onNewTransaction,
  onCreateDocument,
}: FinanceToolbarProps) {
  return (
    <>
      <IconButton
        label={t("finances.ledger")}
        variant="ghost"
        size="icon-xs"
        onClick={onOpenLedger}
      >
        <LayoutIcon size={19} />
      </IconButton>
      <IconButton label={t("finances.scanReceipt")} variant="ghost" size="icon-xs" onClick={onScan}>
        <CameraIcon size={19} />
      </IconButton>
      <IconButton
        label={t("finances.add")}
        size="icon-xs"
        onClick={(event) =>
          openMenu(
            event.currentTarget,
            [
              ...(onCreateDocument
                ? (["invoice", "receipt", "quote"] as const).map((kind) => ({
                    label: t(`finances.${kind}`),
                    icon: kind === "quote" ? <PenIcon size={18} /> : <InvoiceIcon size={18} />,
                    onSelect: () => onCreateDocument(kind),
                  }))
                : []),
              {
                label: t("finances.transaction"),
                icon: <PlusIcon size={18} />,
                onSelect: onNewTransaction,
              },
              {
                label: t("finances.scanReceipt"),
                icon: <CameraIcon size={18} />,
                onSelect: onScan,
              },
              {
                label: t("finances.importReceipt"),
                icon: <PhotoIcon size={18} />,
                onSelect: onImportReceipt,
              },
              {
                label: t("finances.importMessage"),
                icon: <CommentIcon size={18} />,
                onSelect: onImportMessage,
              },
            ],
            { edge: "trailing" },
          )
        }
      >
        <PlusIcon size={17} />
      </IconButton>
    </>
  );
}
