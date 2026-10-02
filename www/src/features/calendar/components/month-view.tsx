import type { CalendarEvent, Day } from "@notables/core";
import { cn, spring } from "@notables/ui";
import { motion } from "motion/react";
import { t } from "../../../i18n/i18n";
import { formatClock } from "../lib/describe-alert";
import { weekdayNames } from "../lib/month-grid";

const MAX_PILLS = 3;

/**
 * A month as six weeks of days. Larger screens list what's on each day;
 * phones show a dot per event. Swipe sideways to change month.
 */
export function MonthView({
  weeks,
  month,
  today,
  selected,
  weekStart,
  onDay,
  byDay,
  onSwipe,
}: {
  weeks: Day[][];
  /** 0-based month shown, to fade days from its neighbours. */
  month: number;
  today: Day;
  selected: Day;
  weekStart: number;
  onDay: (day: Day) => void;
  byDay: Map<Day, CalendarEvent[]>;
  onSwipe: (direction: 1 | -1) => void;
}) {
  const names = weekdayNames(weekStart);
  const narrow = weekdayNames(weekStart, "narrow");
  return (
    <div className="flex min-h-0 grow flex-col">
      <div className="grid grid-cols-7 px-2 pb-1.5 md:px-4">
        {names.map((name, index) => (
          <span
            key={name}
            className="text-center text-[11px] font-semibold tracking-wide text-label-tertiary uppercase md:text-right md:pr-2"
          >
            <span className="md:hidden">{narrow[index]}</span>
            <span className="hidden md:inline">{name}</span>
          </span>
        ))}
      </div>
      <motion.div
        className="grid grow touch-pan-y grid-rows-6 px-2 md:px-4 md:pb-4"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.18}
        dragSnapToOrigin
        transition={spring.smooth}
        onDragEnd={(_, info) => {
          if (Math.abs(info.offset.x) > 60) onSwipe(info.offset.x < 0 ? 1 : -1);
        }}
      >
        {weeks.map((week) => (
          <div
            key={week[0]}
            className="grid min-h-[52px] grid-cols-7 md:min-h-[92px] md:border-t md:border-separator/60"
          >
            {week.map((day) => (
              <DayCell
                key={day}
                day={day}
                outside={Number(day.slice(5, 7)) - 1 !== month}
                isToday={day === today}
                isSelected={day === selected}
                events={byDay.get(day) ?? []}
                onSelect={() => onDay(day)}
              />
            ))}
          </div>
        ))}
      </motion.div>
    </div>
  );
}

function DayCell({
  day,
  outside,
  isToday,
  isSelected,
  events,
  onSelect,
}: {
  day: Day;
  outside: boolean;
  isToday: boolean;
  isSelected: boolean;
  events: CalendarEvent[];
  onSelect: () => void;
}) {
  const date = Number(day.slice(8));
  const extra = events.length - MAX_PILLS;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      aria-label={`${day}${events.length ? `, ${t("calendar.eventsCount", { count: events.length })}` : ""}`}
      className={cn(
        "group relative flex min-w-0 flex-col items-center gap-1 overflow-hidden rounded-[12px] py-1 text-left transition-colors md:items-stretch md:rounded-[10px] md:px-1.5 md:py-1.5",
        isSelected ? "md:bg-accent/8" : "hover:bg-fill/50",
        outside && "opacity-40",
      )}
    >
      <span
        className={cn(
          "flex size-8 items-center justify-center self-center rounded-full text-[15px] tabular-nums transition-colors md:size-7 md:self-end md:text-[13px]",
          isToday
            ? "bg-accent font-semibold text-on-accent"
            : isSelected
              ? "bg-inverse font-semibold text-on-inverse md:bg-transparent md:text-accent-text"
              : "text-label",
        )}
      >
        {date}
      </span>

      {/* Phones: a dot per event. */}
      <span className="flex h-1.5 gap-0.5 md:hidden">
        {events.slice(0, 3).map((event) => (
          <span
            key={event.id}
            className="size-1.5 rounded-full"
            style={{ background: event.color }}
          />
        ))}
      </span>

      {/* Larger screens: what's on. */}
      <span className="hidden min-w-0 flex-col gap-0.5 md:flex">
        {events.slice(0, MAX_PILLS).map((event) => (
          <span
            key={event.id}
            className="flex min-w-0 items-center gap-1 truncate rounded-[5px] px-1.5 py-px text-[11.5px] leading-[16px]"
            style={{
              background: `color-mix(in srgb, ${event.color} 16%, transparent)`,
              color: `color-mix(in srgb, ${event.color} 75%, var(--color-label))`,
            }}
          >
            {event.time && (
              <span className="shrink-0 font-medium tabular-nums opacity-80">
                {formatClock(event.time)}
              </span>
            )}
            <span className="truncate font-medium">{event.title || "Untitled"}</span>
          </span>
        ))}
        {extra > 0 && (
          <span className="px-1.5 text-[11px] text-label-tertiary">
            {t("calendar.more", { count: extra })}
          </span>
        )}
      </span>
    </button>
  );
}
