import { localDay } from "@notables/core";
import { spring } from "@phe-rus/hino";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { locale } from "@/i18n/i18n";
import { eventTitle } from "../lib/event-display";
import { upcomingDates } from "../lib/upcoming-dates";
import { useCalendarEvents } from "../store/calendar-store";

/** A quiet, cycling preview of dates rather than a count of all stored events. */
export function CalendarDatePreview() {
  const events = useCalendarEvents();
  const reducedMotion = useReducedMotion();
  const [today, setToday] = useState(localDay);
  const [page, setPage] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const root = useRef<HTMLSpanElement>(null);
  const paused = hovered || focused;
  const dates = useMemo(() => upcomingDates(events, today), [events, today]);
  useEffect(() => {
    const link = root.current?.closest("a");
    const focus = () => setFocused(true);
    const blur = () => setFocused(false);
    link?.addEventListener("focus", focus);
    link?.addEventListener("blur", blur);
    return () => {
      link?.removeEventListener("focus", focus);
      link?.removeEventListener("blur", blur);
    };
  }, [dates.length]);
  const pages = Math.ceil(dates.length / 2);
  useEffect(() => {
    if (paused) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = undefined;
    };
    const start = () => {
      stop();
      if (document.hidden) return;
      setToday(localDay());
      timer = setInterval(
        () => {
          setToday(localDay());
          if (!reducedMotion && pages > 1) setPage((value) => (value + 1) % pages);
        },
        reducedMotion || pages < 2 ? 60_000 : 6_000,
      );
    };
    start();
    document.addEventListener("visibilitychange", start);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", start);
    };
  }, [paused, reducedMotion, pages]);
  const shown = reducedMotion ? 0 : page % Math.max(1, pages);
  const format = new Intl.DateTimeFormat(locale(), {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  if (!dates.length) return null;
  return (
    <span
      ref={root}
      className="relative flex h-7 min-w-0 max-w-[50%] items-center overflow-hidden"
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <span className="sr-only">
        {dates
          .map(
            ({ day, events: entries }) =>
              `${format.format(new Date(`${day}T00:00:00Z`))}: ${entries.map((event) => eventTitle(event, day)).join(", ")}`,
          )
          .join("; ")}
      </span>
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={shown}
          aria-hidden
          className="flex items-center gap-2.5"
          initial={{ opacity: 0, y: reducedMotion ? 0 : 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reducedMotion ? 0 : -12 }}
          transition={reducedMotion ? { duration: 0 } : spring.smooth}
        >
          {dates.slice(shown * 2, shown * 2 + 2).map(({ day, events: entries }) => (
            <span
              key={day}
              className="flex items-center gap-1 whitespace-nowrap text-caption tabular-nums text-label-secondary"
            >
              <span
                className="size-1 shrink-0 rounded-full"
                style={{ backgroundColor: entries[0]?.color }}
              />
              {format.format(new Date(`${day}T00:00:00Z`))}
            </span>
          ))}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
