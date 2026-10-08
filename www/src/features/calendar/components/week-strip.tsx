import { addDaysTo, type Day } from "@notables/core";
import { cn, haptic } from "@ultrapeach/ui";
import { motion } from "motion/react";
import { useRef } from "react";
import { locale } from "../../../i18n/i18n";

const SWIPE = 50;

const asDate = (day: Day) => new Date(`${day}T00:00:00Z`);
const narrowDay = () => new Intl.DateTimeFormat(locale(), { weekday: "narrow", timeZone: "UTC" });
const fullDay = () =>
  new Intl.DateTimeFormat(locale(), {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

/**
 * The phone's way between days, as in the system calendars: the week's days
 * in a row to tap, a swipe for the week before or after, and the chosen
 * day written out beneath.
 */
export function WeekStrip({
  weekFirst,
  selected,
  today,
  onDay,
}: {
  weekFirst: Day;
  selected: Day;
  today: Day;
  onDay: (day: Day) => void;
}) {
  const days = Array.from({ length: 7 }, (_, index) => addDaysTo(weekFirst, index));
  // Which way the last week change went, so the new week slides in from that side.
  const previous = useRef(weekFirst);
  const direction = weekFirst > previous.current ? 1 : weekFirst < previous.current ? -1 : 0;
  previous.current = weekFirst;
  const rtl = typeof document !== "undefined" && document.dir === "rtl";

  const toWeek = (step: 1 | -1) => {
    haptic("selection");
    onDay(addDaysTo(selected, step * 7));
  };

  return (
    <div className="flex flex-col border-b border-separator/70 pb-2">
      <motion.div
        key={weekFirst}
        className="grid touch-pan-y grid-cols-7 px-2"
        initial={{ x: direction * (rtl ? -40 : 40), opacity: direction ? 0 : 1 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 38 }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.25}
        onDragEnd={(_, info) => {
          const forward = rtl ? info.offset.x > SWIPE : info.offset.x < -SWIPE;
          const back = rtl ? info.offset.x < -SWIPE : info.offset.x > SWIPE;
          if (forward) toWeek(1);
          else if (back) toWeek(-1);
        }}
      >
        {days.map((day) => {
          const chosen = day === selected;
          const isToday = day === today;
          return (
            <button
              key={day}
              type="button"
              aria-pressed={chosen}
              aria-label={fullDay().format(asDate(day))}
              onClick={() => {
                if (chosen) return;
                haptic("selection");
                onDay(day);
              }}
              className="flex flex-col items-center gap-1 py-1"
            >
              <span className="text-caption2 font-medium text-label-tertiary">
                {narrowDay().format(asDate(day))}
              </span>
              <span
                className={cn(
                  "flex size-9 items-center justify-center rounded-full text-body tabular-nums transition-colors",
                  chosen
                    ? isToday
                      ? "bg-accent font-semibold text-on-accent"
                      : "bg-inverse font-semibold text-on-inverse"
                    : isToday
                      ? "font-semibold text-accent-text"
                      : "text-label",
                )}
              >
                {Number(day.slice(8))}
              </span>
            </button>
          );
        })}
      </motion.div>
      <p className="px-4 pt-1 text-center text-[14px] font-medium text-label-secondary">
        {fullDay().format(asDate(selected))}
      </p>
    </div>
  );
}
