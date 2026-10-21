import type { Day } from "@notables/core";
import { Button, CloseIcon, IconButton, Sheet, SparkleIcon, toast } from "@phe-rus/hino";
import { TextField } from "@phe-rus/hino/text-field";
import { useState } from "react";
import { t } from "@/i18n/i18n";
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
      className="flex min-h-0 flex-col gap-4 overflow-y-auto p-5 pb-[max(20px,env(safe-area-inset-bottom))]"
      onSubmit={(event) => {
        event.preventDefault();
        add();
      }}
    >
      <div className="flex items-center gap-2">
        <div className="min-w-0 grow">
          <TextField
            label={t("calendar.quickAdd")}
            icon={<SparkleIcon size={18} />}
            autoFocus
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={t("calendar.quickAddPlaceholder")}
            aria-label={t("calendar.quickAdd")}
            className="h-9 text-subheadline"
          />
        </div>
        <IconButton size="icon-sm" variant="ghost" label={t("common.close")} onClick={onClose}>
          <CloseIcon size={18} />
        </IconButton>
      </div>
      <p className="text-footnote leading-snug text-label-secondary">
        {t("calendar.quickAddHint")}
      </p>
      {preview?.title && (
        <div className="flex items-center gap-3 rounded-2xl bg-fill/50 px-3.5 py-3">
          <span className="text-label-secondary">{kindIcons[preview.kind]}</span>
          <span className="flex min-w-0 grow flex-col">
            <span className="truncate text-subheadline font-semibold">{preview.title}</span>
            <span className="truncate text-footnote text-label-secondary">
              {t(`calendar.kind.${preview.kind}`)} · {describeDay(preview.date)}
              {preview.time ? ` · ${formatClock(preview.time)}` : ` · ${t("calendar.allDay")}`}
              {preview.repeat !== "never" ? ` · ${t(`calendar.repeat.${preview.repeat}`)}` : ""}
            </span>
          </span>
        </div>
      )}
      <Button variant="default" type="submit" disabled={!preview?.title}>
        {t("common.add")}
      </Button>
    </form>
  );
}
