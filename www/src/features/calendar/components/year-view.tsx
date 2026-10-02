import { type Day, dayInMonth } from "@notables/core";
import { cn } from "@notables/ui";
import { locale } from "../../../i18n/i18n";
import type { Holiday } from "../lib/holidays";
import { monthGrid, weekdayNames } from "../lib/month-grid";

const monthTitle = (year: number, month: number) =>
  new Intl.DateTimeFormat(locale(), { month: "long", timeZone: "UTC" }).format(
    new Date(`${dayInMonth(year, month, 1)}T00:00:00Z`),
  );

/**
 * Twelve small months, as in Apple's Year view: busy days carry a dot,
 * holidays are red. A month's name opens it; a day opens that day.
 */
export function YearView({
  year,
  today,
  weekStart,
  busy,
  holidays,
  onMonth,
  onDay,
}: {
  year: number;
  today: Day;
  weekStart: number;
  /** Days with something on them. */
  busy: Set<Day>;
  holidays: Map<Day, Holiday[]>;
  onMonth: (month: number) => void;
  onDay: (day: Day) => void;
}) {
  const narrow = weekdayNames(weekStart, "narrow");
  return (
    <div className="@container/year min-h-0 grow overflow-y-auto px-4 pb-28 md:pb-8">
      <div className="grid grid-cols-1 gap-x-6 gap-y-5 @min-[440px]/year:grid-cols-2 @min-[680px]/year:grid-cols-3 @min-[960px]/year:grid-cols-4">
        {Array.from({ length: 12 }, (_, month) => (
          <section key={month} className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => onMonth(month)}
              className={cn(
                "self-start text-[16px] font-semibold tracking-tight hover:text-accent-text",
                today.startsWith(
                  `${String(year).padStart(4, "0")}-${String(month + 1).padStart(2, "0")}`,
                ) && "text-accent-text",
              )}
            >
              {monthTitle(year, month)}
            </button>
            <div className="grid grid-cols-7 text-center text-[10px] font-semibold text-label-tertiary">
              {narrow.map((name, index) => (
                <span key={index}>{name}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-y-0.5">
              {monthGrid(year, month, weekStart)
                .flat()
                .map((day) => {
                  const inMonth = Number(day.slice(5, 7)) - 1 === month;
                  if (!inMonth) return <span key={day} />;
                  const holiday = holidays.get(day)?.some((h) => h.closed);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => onDay(day)}
                      className="relative flex aspect-square items-center justify-center rounded-full text-[12px] tabular-nums hover:bg-fill/70"
                    >
                      <span
                        className={cn(
                          "flex size-6 items-center justify-center rounded-full",
                          day === today && "bg-accent font-semibold text-on-accent",
                          holiday && day !== today && "text-danger",
                        )}
                      >
                        {Number(day.slice(8))}
                      </span>
                      {busy.has(day) && day !== today && (
                        <span className="absolute bottom-0 size-1 rounded-full bg-label-tertiary" />
                      )}
                    </button>
                  );
                })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
