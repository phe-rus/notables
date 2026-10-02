import type { Day } from "@notables/core";
import { Button, CloseIcon, IconButton, Sheet, SparkleIcon, toast } from "@notables/ui";
import { useState } from "react";
import { t } from "../../../i18n/i18n";
import { describeDay, formatClock } from "../lib/describe-alert";
import { kindIcons } from "../lib/event-display";
import { parseQuickEvent } from "../lib/quick-add";
import { getCalendarStore } from "../store/calendar-store";

/** Add by writing a sentence, seeing what was understood before adding it. */
export function QuickAddSheet({
  open,
  today,
  onClose,
  onAdded,
}: {
  open: boolean;
  today: Day;
  onClose: () => void;
  onAdded: (day: Day) => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} label={t("calendar.quickAdd")} className="max-w-[460px]">
      {open && <QuickAddForm today={today} onClose={onClose} onAdded={onAdded} />}
    </Sheet>
  );
}

function QuickAddForm({
  today,
  onClose,
  onAdded,
}: {
  today: Day;
  onClose: () => void;
  onAdded: (day: Day) => void;
}) {
  const [text, setText] = useState("");
  const preview = text.trim() ? parseQuickEvent(text, today) : null;

  const add = () => {
    if (!preview?.title) return;
    const store = getCalendarStore();
    const event = {
      ...store.draft(preview.kind, preview.date, preview.time),
      title: preview.title,
      duration: preview.duration,
      repeat: preview.repeat,
      endDate: preview.endDate,
    };
    store.save(event);
    onClose();
    onAdded(event.date);
    toast.success(t("calendar.addedQuick"), {
      description: `${event.title} · ${describeDay(event.date)}`,
      action: { label: t("common.undo"), onClick: () => store.remove(event.id) },
    });
  };

  return (
    <form
      className="flex flex-col gap-4 p-5 pb-[max(20px,env(safe-area-inset-bottom))]"
      onSubmit={(event) => {
        event.preventDefault();
        add();
      }}
    >
      <div className="flex items-center gap-2">
        <SparkleIcon size={18} className="shrink-0 text-accent-text" />
        <input
          // biome-ignore lint/a11y/noAutofocus: the sheet opens to type
          autoFocus
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={t("calendar.quickAddPlaceholder")}
          aria-label={t("calendar.quickAdd")}
          className="min-w-0 grow bg-transparent text-[18px] font-semibold outline-none placeholder:text-label-tertiary"
        />
        <IconButton label={t("common.close")} onClick={onClose}>
          <CloseIcon size={18} />
        </IconButton>
      </div>
      <p className="text-[13px] leading-snug text-label-secondary">{t("calendar.quickAddHint")}</p>
      {preview?.title && (
        <div className="flex items-center gap-3 rounded-[14px] bg-fill/50 px-3.5 py-3">
          <span className="text-label-secondary">{kindIcons[preview.kind]}</span>
          <span className="flex min-w-0 grow flex-col">
            <span className="truncate text-[15px] font-semibold">{preview.title}</span>
            <span className="truncate text-[13px] text-label-secondary">
              {t(`calendar.kind.${preview.kind}`)} · {describeDay(preview.date)}
              {preview.time ? ` · ${formatClock(preview.time)}` : ` · ${t("calendar.allDay")}`}
              {preview.repeat !== "never" ? ` · ${t(`calendar.repeat.${preview.repeat}`)}` : ""}
            </span>
          </span>
        </div>
      )}
      <Button variant="primary" type="submit" disabled={!preview?.title}>
        {t("common.add")}
      </Button>
    </form>
  );
}
