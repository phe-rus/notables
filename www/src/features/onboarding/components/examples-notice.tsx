import { Button, CloseIcon, confirmDialog, IconButton } from "@phe-rus/hino";
import { useState } from "react";
import { t } from "../../../i18n/i18n";
import { removeExamples, useExampleCount } from "../lib/examples";

/** Set once the person chooses to keep the examples, on this device. */
const KEPT = "notables:examples-kept";

function wasKept(): boolean {
  try {
    return localStorage.getItem(KEPT) !== null;
  } catch {
    return false;
  }
}

/**
 * Says the welcome's examples are in the library, where people see them,
 * with one tap to remove them all (they go to Recently Deleted, with Undo).
 * Settings › Notes list keeps the same choice for later.
 */
export function ExamplesNotice() {
  const count = useExampleCount();
  const [kept, setKept] = useState(wasKept);
  if (count === 0 || kept) return null;

  const remove = async () => {
    const confirmed = await confirmDialog({
      title: t("examples.removeTitle"),
      message: t("examples.removeBody"),
      confirmLabel: t("examples.remove"),
      destructive: true,
    });
    if (confirmed) removeExamples();
  };
  const keep = () => {
    try {
      localStorage.setItem(KEPT, new Date().toISOString());
    } catch {
      // Without storage it simply shows again next time.
    }
    setKept(true);
  };

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-accent-soft py-2.5 ps-3.5 pe-1.5">
      <div className="flex min-w-0 grow flex-col">
        <span className="text-subheadline font-semibold text-label">
          {t("examples.noticeTitle")}
        </span>
        <span className="text-footnote text-label-secondary">{t("examples.noticeBody")}</span>
      </div>
      <Button size="sm" variant="secondary" className="shrink-0" onClick={() => void remove()}>
        {t("examples.removeAll")}
      </Button>
      <IconButton size="icon-sm" variant="ghost" label={t("examples.keep")} onClick={keep}>
        <CloseIcon size={16} />
      </IconButton>
    </div>
  );
}
