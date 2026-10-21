import { dayInMonth } from "@notables/core";
import { memo } from "react";
import { locale } from "@/i18n/i18n";
import { monthGrid } from "../lib/month-grid";
import type { CalendarYearPreviewProps } from "../model/types";

/** A calendar thumbnail, drawn from dates rather than a captured image. */
export const CalendarYearPreview = memo(function CalendarYearPreview({
  year,
  today,
  weekStart,
}: CalendarYearPreviewProps) {
  const format = new Intl.DateTimeFormat(locale(), { month: "short", timeZone: "UTC" });
  return (
    <svg data-brand aria-hidden="true" viewBox="0 0 300 340" className="block w-full">
      {Array.from({ length: 12 }, (_, month) => {
        const x = (month % 3) * 104;
        const y = Math.floor(month / 3) * 84;
        const name = format.format(new Date(`${dayInMonth(year, month, 1)}T00:00:00Z`));
        return (
          <g key={month} transform={`translate(${x} ${y})`}>
            <text x="0" y="11" fill="var(--color-accent-text)" fontSize="10" fontWeight="600">
              {name}
            </text>
            {monthGrid(year, month, weekStart)
              .flat()
              .map((day, index) => {
                if (Number(day.slice(5, 7)) - 1 !== month) return null;
                const dx = (index % 7) * 12 + 5;
                const dy = Math.floor(index / 7) * 10 + 27;
                return (
                  <g key={day}>
                    {day === today && (
                      <circle cx={dx} cy={dy - 2.5} r="6" fill="var(--color-accent)" />
                    )}
                    <text
                      x={dx}
                      y={dy}
                      textAnchor="middle"
                      fontSize="8"
                      fill={day === today ? "var(--color-on-accent)" : "currentColor"}
                    >
                      {Number(day.slice(8))}
                    </text>
                  </g>
                );
              })}
          </g>
        );
      })}
    </svg>
  );
});
