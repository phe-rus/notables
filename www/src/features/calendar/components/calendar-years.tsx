import { cn } from "@phe-rus/hino";
import { Button } from "@phe-rus/hino/button";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CalendarYearsProps } from "@/features/calendar/model/types";
import { CalendarYearPreview } from "./calendar-year-preview";

export function CalendarYears({
  first,
  last,
  current,
  selected,
  today,
  weekStart,
  onYear,
  layout = "gallery",
}: CalendarYearsProps) {
  const grid = useRef<HTMLDivElement>(null);
  const center = Math.max(first, Math.min(last, selected));
  const [range, setRange] = useState(() => ({
    first: Math.max(first, center - 1),
    last: Math.min(last, center + 2),
  }));
  const before = useRef<number | null>(null);
  useLayoutEffect(() => {
    grid.current?.querySelector(`[data-year="${center}"]`)?.scrollIntoView({ block: "start" });
  }, []);
  useLayoutEffect(() => {
    const element = grid.current;
    if (element && before.current !== null) {
      const height = element.firstElementChild?.getBoundingClientRect().height ?? 0;
      element.scrollTop += height - before.current;
      before.current = null;
    }
  }, [range.first]);
  useEffect(() => {
    const element = grid.current;
    if (!element) return;
    const fill = () => {
      if (
        !element.clientHeight ||
        element.scrollHeight > element.clientHeight + 120 ||
        before.current !== null ||
        range.first <= first
      )
        return;
      const columns = element.firstElementChild
        ? getComputedStyle(element.firstElementChild).gridTemplateColumns.split(" ").length
        : 2;
      before.current = element.firstElementChild?.getBoundingClientRect().height ?? 0;
      setRange((value) => ({ ...value, first: Math.max(first, value.first - columns) }));
    };
    fill();
    const observer = new ResizeObserver(fill);
    observer.observe(element);
    return () => observer.disconnect();
  }, [first, range.first, range.last, layout]);
  return (
    <div
      ref={grid}
      className="@container/years scroll-surface min-h-0 grow px-4 [overflow-anchor:none]"
      onScroll={() => {
        const element = grid.current;
        if (!element || before.current !== null) return;
        const columns = element.firstElementChild
          ? getComputedStyle(element.firstElementChild).gridTemplateColumns.split(" ").length
          : 2;
        if (element.scrollTop < 120 && range.first > first && before.current === null) {
          before.current = element.firstElementChild?.getBoundingClientRect().height ?? 0;
          setRange((value) => ({ ...value, first: Math.max(first, value.first - columns) }));
        } else if (
          element.scrollHeight - element.scrollTop - element.clientHeight < 240 &&
          range.last < last
        ) {
          setRange((value) => ({ ...value, last: Math.min(last, value.last + columns) }));
        }
      }}
    >
      <div
        className={
          layout === "list"
            ? "mx-auto grid max-w-sm grid-cols-1 gap-6"
            : "grid grid-cols-2 gap-x-5 gap-y-6 @min-[600px]/years:grid-cols-3 @min-[980px]/years:grid-cols-4"
        }
      >
        {Array.from(
          { length: range.last - range.first + 1 },
          (_, index) => range.first + index,
        ).map((value) => (
          <Button
            variant="ghost"
            key={value}
            data-year={value}
            aria-label={String(value)}
            aria-current={value === current ? "date" : undefined}
            aria-pressed={value === selected}
            onClick={(event) => onYear(value, event.currentTarget)}
            className={cn(
              "h-auto min-w-0 rounded-2xl px-2 py-3 text-start [&>span]:w-full [&>span]:min-w-0 [&>span]:flex-col [&>span]:items-stretch [&>span]:gap-3",
              value === selected && "bg-fill/30",
            )}
          >
            <span
              className={cn(
                "text-title3 font-semibold tracking-tight tabular-nums",
                value === current ? "text-accent-text" : "text-label",
              )}
            >
              {value}
            </span>
            <CalendarYearPreview year={value} today={today} weekStart={weekStart} />
          </Button>
        ))}
      </div>
    </div>
  );
}
