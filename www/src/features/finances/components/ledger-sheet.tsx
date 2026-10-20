import { formatMoney } from "@notables/core";
import { CloseIcon, TrashIcon } from "@phe-rus/hino";
import { Button } from "@phe-rus/hino/button";
import { IconButton } from "@phe-rus/hino/icon-button";
import { Sheet } from "@phe-rus/hino/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@phe-rus/hino/table";
import type { LedgerSheetProps } from "@/features/finances/model/types";
import { t } from "@/i18n/i18n";

export function LedgerSheet({ open, rows, onClose, onExport, onEdit, onRemove }: LedgerSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} label={t("finances.ledger")} className="max-w-[1000px]">
      <header className="flex items-center gap-3 p-5">
        <h2 className="grow text-title3 font-semibold">{t("finances.ledger")}</h2>
        <Button size="sm" variant="ghost" onClick={() => void onExport()}>
          {t("finances.export")}
        </Button>
        <IconButton label={t("common.close")} variant="ghost" size="icon-sm" onClick={onClose}>
          <CloseIcon size={18} />
        </IconButton>
      </header>
      <p className="px-5 pb-4 text-footnote text-label-secondary">{t("finances.ledgerHint")}</p>
      <div className="overflow-auto px-5 pb-6">
        <Table className="w-full text-start text-subheadline">
          <TableHeader>
            <TableRow>
              {["date", "type", "description", "reference", "currency", "amount"].map((key) => (
                <TableHead
                  key={key}
                  className="border-b border-separator px-3 py-2 text-start text-caption font-semibold text-label-secondary"
                >
                  {t(
                    `finances.${key as "date" | "type" | "description" | "reference" | "currency" | "amount"}`,
                  )}
                </TableHead>
              ))}
              <TableHead>
                <span className="sr-only">{t("common.delete")}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} className="border-b border-separator/50">
                <TableCell className="whitespace-nowrap px-3 py-3">{row.date}</TableCell>
                <TableCell className="whitespace-normal px-3 py-3">
                  {t(`finances.${row.type}`)}
                </TableCell>
                <TableCell className="whitespace-normal px-3 py-3">
                  <Button
                    variant="ghost"
                    size="xs"
                    type="button"
                    className="h-auto min-w-32 justify-start whitespace-normal px-0 text-start text-accent-text [&>span]:justify-start"
                    onClick={() => onEdit(row)}
                  >
                    {row.description}
                  </Button>
                </TableCell>
                <TableCell className="whitespace-normal px-3 py-3">{row.reference}</TableCell>
                <TableCell className="whitespace-normal px-3 py-3">{row.currency}</TableCell>
                <TableCell className="whitespace-nowrap px-3 py-3 text-end tabular-nums">
                  {formatMoney(row.amount, row.currency)}
                </TableCell>
                <TableCell className="px-2">
                  <IconButton
                    label={t("common.delete")}
                    size="icon-xs"
                    variant="destructive"
                    onClick={() => void onRemove(row)}
                  >
                    <TrashIcon size={16} />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {rows.length === 0 && (
          <p className="py-10 text-center text-footnote text-label-secondary">
            {t("finances.empty")}
          </p>
        )}
      </div>
    </Sheet>
  );
}
