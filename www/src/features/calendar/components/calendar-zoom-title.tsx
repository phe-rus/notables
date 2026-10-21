import { FIRST_YEAR, LAST_YEAR } from "@notables/core";
import { ChevronLeftIcon, cn } from "@phe-rus/hino";
import { Button } from "@phe-rus/hino/button";
import { TextField } from "@phe-rus/hino/text-field";
import { useState } from "react";
import type { CalendarZoomTitleProps } from "@/features/calendar/model/types";
import { t } from "@/i18n/i18n";

export function CalendarZoomTitle({
  title,
  back = false,
  year,
  zoomOut,
  onYear,
}: CalendarZoomTitleProps) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(String(year));
  if (editing) {
    return (
      <TextField
        label={t("calendar.jumpTo")}
        autoFocus
        aria-label={t("calendar.jumpTo")}
        inputMode="numeric"
        value={text}
        onChange={(event) => setText(event.target.value.replace(/\D/g, "").slice(0, 4))}
        onBlur={() => setEditing(false)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setEditing(false);
          if (event.key === "Enter") {
            const next = Number(text);
            if (next >= FIRST_YEAR && next <= LAST_YEAR) onYear(next);
            setEditing(false);
          }
        }}
        className="w-[7ch] rounded-lg control-field px-2 py-0.5 text-title2 font-bold tabular-nums"
      />
    );
  }
  return (
    <Button
      variant="ghost"
      type="button"
      data-tooltip={zoomOut ? undefined : t("calendar.jumpTo")}
      onClick={() => {
        if (zoomOut) zoomOut();
        else {
          setText(String(year));
          setEditing(true);
        }
      }}
      className={cn(
        "h-auto min-w-0 justify-start rounded-lg px-1.5 text-start [&>span]:min-w-0 [&>span]:justify-start",
        back
          ? "flex min-h-11 items-center gap-0.5 text-body text-accent-text"
          : "text-title2 font-bold tracking-tight",
      )}
    >
      {back && (
        <ChevronLeftIcon size={22} strokeWidth={2.2} className="shrink-0 rtl:-scale-x-100" />
      )}
      <span className="block truncate">{title}</span>
    </Button>
  );
}
