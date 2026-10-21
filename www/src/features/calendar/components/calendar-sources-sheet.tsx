import { calendarKinds } from "@notables/core";
import { CheckIcon, ChevronRightIcon, spring } from "@phe-rus/hino";
import { Button } from "@phe-rus/hino/button";
import { IconButton } from "@phe-rus/hino/icon-button";
import { Sheet } from "@phe-rus/hino/sheet";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { t } from "@/i18n/i18n";
import { describeWhen } from "../lib/describe-alert";
import { eventTitle, kindIcons } from "../lib/event-display";
import type { CalendarSourcesSheetProps } from "../model/types";

/** Calendar categories expand in place, then open the event's existing detail editor. */
export function CalendarSourcesSheet({
  open,
  onClose,
  events,
  onOpenEvent,
}: CalendarSourcesSheetProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const reducedMotion = useReducedMotion();
  return (
    <Sheet open={open} onClose={onClose} label={t("calendar.calendars")}>
      <div className="flex min-h-0 flex-col gap-4 p-5">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="text-title3 font-semibold">{t("calendar.calendars")}</h2>
            <p className="mt-0.5 text-caption text-label-secondary">
              {t("calendar.eventsCount", { count: events.length })}
            </p>
          </div>
          <IconButton size="icon-sm" label={t("common.done")} onClick={onClose}>
            <CheckIcon size={18} />
          </IconButton>
        </div>
        <div className="min-h-0 overflow-y-auto rounded-3xl bg-paper">
          {calendarKinds.map((kind) => {
            const items = events
              .filter((event) => event.kind === kind)
              .sort((a, b) => a.date.localeCompare(b.date));
            return (
              <section key={kind} className="border-b border-separator/30 last:border-0">
                <Button
                  variant="ghost"
                  aria-expanded={expanded === kind}
                  onClick={() => setExpanded((value) => (value === kind ? null : kind))}
                  className="h-auto w-full rounded-none px-3 py-2.5 text-start [&>span]:w-full [&>span]:justify-start"
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-text">
                    {kindIcons[kind]}
                  </span>
                  <span className="min-w-0 grow text-subheadline">
                    {t(`calendar.kind.${kind}`)}
                  </span>
                  <span className="text-caption text-label-secondary">{items.length}</span>
                  <ChevronRightIcon
                    size={16}
                    className={`transition-transform duration-normal ${expanded === kind ? "rotate-90" : "rtl:-scale-x-100"}`}
                  />
                </Button>
                <AnimatePresence initial={false}>
                  {expanded === kind && (
                    <motion.div
                      className="overflow-hidden"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={reducedMotion ? { duration: 0 } : spring.smooth}
                    >
                      <div className="flex flex-col gap-1 ps-10 pe-3 pb-3">
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
                                {eventTitle(event)}
                              </span>
                              <span className="text-caption text-label-secondary">
                                {describeWhen(event.date, event.time)}
                              </span>
                            </Button>
                          ))
                        ) : (
                          <p className="px-3 text-footnote text-label-secondary">
                            {t("calendar.nothingPlanned")}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>
            );
          })}
        </div>
      </div>
    </Sheet>
  );
}
