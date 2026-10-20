import { Dialog } from "@phe-rus/hino/dialog";
import { locale, t } from "@/i18n/i18n";
import type { UpdateAvailableDialogProps } from "../model/types";
import { UpdateActions } from "./update-actions";

export function UpdateAvailableDialog({
  open,
  version,
  deadline,
  openFailed,
  onOpenChange,
  onUpdate,
  onDismiss,
}: UpdateAvailableDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("updates.available")}
      footer={<UpdateActions required={false} onUpdate={onUpdate} onDismiss={onDismiss} />}
    >
      <p className="text-callout text-label-secondary">
        {t("updates.availableHint", {
          version,
          date: new Date(deadline).toLocaleDateString(locale(), { month: "short", day: "numeric" }),
        })}
      </p>
      {openFailed && (
        <p role="status" className="text-footnote text-danger">
          {t("updates.openFailed")}
        </p>
      )}
    </Dialog>
  );
}
