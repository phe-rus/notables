import {
  type CalendarEvent,
  type CalendarEventKind,
  calendarKindLabels,
  type Day,
  localDay,
  occurrencesBetween,
} from "@notables/core";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  IconButton,
  openContextMenu,
  PlusIcon,
  SidebarIcon,
} from "@notables/ui";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CollapsedSidebarControls } from "../../../components/window/collapsed-sidebar-controls";
import { locale, t } from "../../../i18n/i18n";
import { usePreferences } from "../../settings/store/preferences-store";
import { firstWeekday, monthGrid } from "../lib/month-grid";
import { getCalendarStore, useCalendarEvents } from "../store/calendar-store";
import { byStart, DayAgenda } from "./day-agenda";
import { EventSheet, type EventSheetTarget } from "./event-sheet";
import { MonthView } from "./month-view";

const monthFormat = () =>
  new Intl.DateTimeFormat(locale(), {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

/** Plans, birthdays and reminders on a month, with the chosen day beside it. */
export function CalendarScreen({
  day: requestedDay,
  onOpenSidebar,
}: {
  day?: Day;
  onOpenSidebar: () => void;
}) {
  const events = useCalendarEvents();
  const navigate = useNavigate();
  const { collapsed } = usePreferences().sidebar;
  const [today, setToday] = useState(localDay);
  const selected = requestedDay ?? today;
  const [shown, setShown] = useState(() => ({
    year: Number(selected.slice(0, 4)),
    month: Number(selected.slice(5, 7)) - 1,
  }));
  const [sheet, setSheet] = useState<EventSheetTarget | null>(null);
  const weekStart = useMemo(firstWeekday, []);

  // Keep "today" right across midnight.
  useEffect(() => {
    const timer = window.setInterval(() => setToday(localDay()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  // Follow a day chosen from outside, such as a reminder.
  useEffect(() => {
    setShown({ year: Number(selected.slice(0, 4)), month: Number(selected.slice(5, 7)) - 1 });
  }, [selected]);

  const weeks = useMemo(
    () => monthGrid(shown.year, shown.month, weekStart),
    [shown.year, shown.month, weekStart],
  );
  const byDay = useMemo(() => {
    const first = weeks[0]?.[0] ?? selected;
    const last = weeks.at(-1)?.at(-1) ?? selected;
    const map = new Map<Day, CalendarEvent[]>();
    for (const event of events) {
      for (const on of occurrencesBetween(event, first, last)) {
        map.set(on, [...(map.get(on) ?? []), event]);
      }
    }
    for (const list of map.values()) list.sort(byStart);
    return map;
  }, [events, weeks, selected]);
  const dayEvents = useMemo(() => {
    if (byDay.has(selected)) return byDay.get(selected) ?? [];
    return events.filter((event) => occurrencesBetween(event, selected, selected).length > 0);
  }, [byDay, events, selected]);

  const select = (day: Day) =>
    void navigate({ to: "/calendar", search: { day: day === today ? undefined : day } });
  const shift = (direction: 1 | -1) =>
    setShown(({ year, month }) => {
      const next = month + direction;
      return { year: year + Math.floor(next / 12), month: (next + 12) % 12 };
    });
  const add = (kind: CalendarEventKind) =>
    setSheet({ event: getCalendarStore().draft(kind, selected), day: selected, isNew: true });
  const open = (event: CalendarEvent, day: Day) => setSheet({ event, day, isNew: false });

  const label = monthFormat().format(new Date(Date.UTC(shown.year, shown.month, 1)));
  const showingToday = selected === today && Number(today.slice(5, 7)) - 1 === shown.month;

  return (
    <div className="flex min-h-0 grow flex-col">
      <header
        data-tauri-drag-region
        className="flex flex-col gap-3 px-4 pt-[max(12px,env(safe-area-inset-top))] pb-3 md:px-5"
      >
        {collapsed && <CollapsedSidebarControls />}
        <div data-tauri-drag-region className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1">
            <IconButton label={t("nav.showLibrary")} className="lg:hidden" onClick={onOpenSidebar}>
              <SidebarIcon size={20} />
            </IconButton>
            <h1 className="truncate text-[22px] font-bold tracking-tight">{label}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              disabled={showingToday}
              onClick={() => {
                select(today);
                setShown({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) - 1 });
              }}
              className="rounded-full px-3 py-1.5 text-[14px] font-medium text-accent-text transition-colors hover:bg-fill/60 disabled:text-label-tertiary disabled:hover:bg-transparent"
            >
              {t("calendar.today")}
            </button>
            <IconButton label={t("calendar.previousMonth")} onClick={() => shift(-1)}>
              <ChevronLeftIcon size={18} />
            </IconButton>
            <IconButton label={t("calendar.nextMonth")} onClick={() => shift(1)}>
              <ChevronRightIcon size={18} />
            </IconButton>
            <IconButton
              label={t("calendar.newEvent")}
              tone="accent"
              onClick={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                openContextMenu(
                  rect.right - 200,
                  rect.bottom + 6,
                  (["plan", "reminder", "birthday"] as const).map((kind) => ({
                    label: t(`calendar.newOf.${kind}`),
                    onSelect: () => add(kind),
                  })),
                );
              }}
            >
              <PlusIcon size={20} strokeWidth={2} />
            </IconButton>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 grow flex-col overflow-y-auto md:flex-row md:overflow-hidden">
        <div className="flex shrink-0 flex-col md:min-h-0 md:shrink md:grow">
          <MonthView
            weeks={weeks}
            month={shown.month}
            today={today}
            selected={selected}
            weekStart={weekStart}
            byDay={byDay}
            onDay={select}
            onSwipe={shift}
          />
        </div>
        <aside
          aria-label={t("calendar.day")}
          className="border-t border-separator/60 md:w-[340px] md:shrink-0 md:overflow-y-auto md:border-t-0 md:border-l"
        >
          <DayAgenda
            day={selected}
            today={today}
            events={events}
            dayEvents={dayEvents}
            onOpen={open}
            onAdd={add}
          />
        </aside>
      </div>

      <EventSheet target={sheet} onClose={() => setSheet(null)} />
    </div>
  );
}
