import { calendarKinds } from "@notables/core";
import { ChevronRightIcon } from "@phe-rus/hino";
import { Button } from "@phe-rus/hino/button";
import { Sheet } from "@phe-rus/hino/sheet";
import { useState } from "react";
import { t } from "@/i18n/i18n";
import { describeDay } from "../lib/describe-alert";
import { kindIcons } from "../lib/event-display";
import type { CalendarSourcesSheetProps } from "../model/types";

/** Calendar categories expand in place, then open the event's existing detail editor. */
export function CalendarSourcesSheet({
  open,
  onClose,
  events,
  onOpenEvent,
}: CalendarSourcesSheetProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <Sheet open={open} onClose={onClose} label={t("calendar.calendars")}>
      <div className="flex min-h-0 flex-col gap-4 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-title3 font-semibold">{t("calendar.calendars")}</h2>
          <Button size="xs" variant="ghost" onClick={onClose}>
            {t("common.done")}
          </Button>
        </div>
        <div className="min-h-0 overflow-y-auto rounded-3xl bg-paper">
          {calendarKinds.map((kind) => {
            const items = events.filter((event) => event.kind === kind);
            return (
              <section key={kind} className="border-b border-separator/30 last:border-0">
                <Button
                  variant="ghost"
                  aria-expanded={expanded === kind}
                  onClick={() => setExpanded((value) => (value === kind ? null : kind))}
                  className="h-auto w-full rounded-none px-3 py-3 text-start [&>span]:w-full [&>span]:justify-start"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-text">
                    {kindIcons[kind]}
                  </span>
                  <span className="min-w-0 grow text-subheadline">
                    {t(`calendar.kind.${kind}`)}
                  </span>
                  <span className="text-caption text-label-secondary">{items.length}</span>
                  <ChevronRightIcon
                    size={16}
                    className={expanded === kind ? "rotate-90" : "rtl:-scale-x-100"}
                  />
                </Button>
                {expanded === kind && (
                  <div className="flex flex-col gap-1 px-3 pb-3">
                    {items.length ? (
                      items.map((event) => (
                        <Button
                          key={event.id}
                          variant="ghost"
                          onClick={() => {
                            onClose();
                            onOpenEvent(event);
                          }}
                          className="h-auto w-full justify-start rounded-xl px-3 py-2 text-start [&>span]:min-w-0 [&>span]:flex-col [&>span]:items-start"
                        >
                          <span className="max-w-full truncate text-subheadline">
                            {event.title || t("common.untitled")}
                          </span>
                          <span className="text-caption text-label-secondary">
                            {describeDay(event.date)}
                          </span>
                        </Button>
                      ))
                    ) : (
                      <p className="px-3 text-footnote text-label-secondary">
                        {t("calendar.nothingPlanned")}
                      </p>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </Sheet>
  );
}
