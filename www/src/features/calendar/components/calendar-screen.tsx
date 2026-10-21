import {
  addDaysTo,
  type CalendarEvent,
  type CalendarEventKind,
  type Day,
  dayInMonth,
  FIRST_YEAR,
  LAST_YEAR,
  localDay,
  occurrencesTouching,
  weekday,
} from "@notables/core";
import {
  CalendarIcon,
  ChaptersIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  cn,
  IconButton,
  LayoutIcon,
  MoreIcon,
  openMenu,
  PlusIcon,
  SidebarIcon,
  SparkleIcon,
  spring,
  useMediaQuery,
} from "@phe-rus/hino";
import { Button } from "@phe-rus/hino/button";
import { useNavigate } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FloatingSearchToolbar } from "@/components/navigation/floating-search-toolbar";
import { CollapsedSidebarControls } from "@/components/window/collapsed-sidebar-controls";
import { useHolidays } from "@/features/calendar/lib/holidays";
import { calendarDepth, outerCalendarView } from "@/features/calendar/model/calendar-views";
import type { CalendarScreenProps, CalendarView } from "@/features/calendar/model/types";
import { WorkspaceBackLink } from "@/features/library/components/workspace-back-link";
import { usePreferences } from "@/features/settings/store/preferences-store";
import { locale, t } from "@/i18n/i18n";
import { kindIcons } from "../lib/event-display";
import { firstWeekday } from "../lib/month-grid";
import { getCalendarStore, useCalendarEvents } from "../store/calendar-store";
import { CalendarSearchResults } from "./calendar-search-results";
import { CalendarSourcesSheet } from "./calendar-sources-sheet";
import { CalendarYears } from "./calendar-years";
import { CalendarZoomTitle } from "./calendar-zoom-title";
import { byStart, DayAgenda } from "./day-agenda";
import type { EventTarget } from "./event-form";
import { EventSheet } from "./event-sheet";
import { HolidayButton } from "./holiday-button";
import { MonthView } from "./month-view";
import { QuickAddSheet } from "./quick-add-sheet";
import { TimeGrid } from "./time-grid";
import { WeekStrip } from "./week-strip";
import { YearView } from "./year-view";

/** The Years view runs from here to a few years ahead of now. */

const clampDay = (day: Day): Day =>
  day < `${String(FIRST_YEAR).padStart(4, "0")}-01-01`
    ? "0001-01-01"
    : day > `${LAST_YEAR}-12-31`
      ? `${LAST_YEAR}-12-31`
      : day;

const format = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(locale(), { ...options, timeZone: "UTC" });
const asDate = (day: Day) => new Date(`${day}T00:00:00Z`);

/**
 * The calendar, after Apple's: a month with the chosen day beside it, a
 * title that zooms out to the year and to every year from 1 to 9999, a
 * double-click that zooms into a day's hours, and holidays from the
 * chosen country.
 */
export function CalendarScreen({
  day: requestedDay,
  view: requestedView,
  onOpenSidebar,
}: CalendarScreenProps) {
  const allEvents = useCalendarEvents();
  const [query, setQuery] = useState("");
  const [calendarsOpen, setCalendarsOpen] = useState(false);
  const [calendarLayout, setCalendarLayout] = useState<"gallery" | "list">("gallery");
  const events = useMemo(
    () =>
      allEvents.filter(
        (event) =>
          !query.trim() ||
          `${event.title} ${event.notes} ${event.location ?? ""}`
            .toLocaleLowerCase()
            .includes(query.trim().toLocaleLowerCase()),
      ),
    [allEvents, query],
  );
  const navigate = useNavigate();
  const { collapsed } = usePreferences().sidebar;
  const reducedMotion = useReducedMotion();
  const nativeTransitions = typeof document !== "undefined" && "startViewTransition" in document;
  const phone = useMediaQuery("(max-width: 639px)");
  const [today, setToday] = useState(localDay);
  const selected = requestedDay ?? today;
  const view = requestedView ?? (phone ? "day" : "month");
  const weekStart = useMemo(firstWeekday, []);
  const [target, setTarget] = useState<EventTarget | null>(null);
  // Which way the last change of view went, so the new one grows in or settles back.
  const [zoom, setZoom] = useState<"in" | "out" | null>(null);
  const [typing, setTyping] = useState(false);

  // Keep "today" right across midnight.
  useEffect(() => {
    const timer = window.setInterval(() => setToday(localDay()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const zoomTo = (day: Day, next: CalendarView, anchor?: HTMLElement) => {
    const region = document.querySelector<HTMLElement>("[data-calendar-surface]");
    const bounds = region?.getBoundingClientRect();
    const target = anchor?.getBoundingClientRect();
    document.documentElement.style.setProperty(
      "--calendar-origin",
      bounds && target
        ? `${Math.max(0, Math.min(100, ((target.left + target.width / 2 - bounds.left) / bounds.width) * 100))}% ${Math.max(0, Math.min(100, ((target.top + target.height / 2 - bounds.top) / bounds.height) * 100))}%`
        : "50% 35%",
    );
    setZoom(
      calendarDepth[next] > calendarDepth[view]
        ? "in"
        : calendarDepth[next] < calendarDepth[view]
          ? "out"
          : null,
    );
    setJumps((count) => count + 1);
    go(day, next);
  };

  const go = useCallback(
    (day: Day, nextView: CalendarView = view) =>
      void navigate({
        to: "/calendar",
        search: { day: day === today ? undefined : clampDay(day), view: nextView },
        viewTransition:
          nextView === view
            ? false
            : {
                types: [
                  calendarDepth[nextView] > calendarDepth[view] ? "calendar-in" : "calendar-out",
                ],
              },
      }),
    [navigate, today, view],
  );

  const year = Number(selected.slice(0, 4));
  const month = Number(selected.slice(5, 7)) - 1;
  const weekFirst = addDaysTo(selected, -((weekday(selected) - weekStart + 7) % 7));
  // The chosen day's holidays, for the agenda beside the calendar.
  const holidays = useHolidays(selected, selected);

  // In Year and Month the title follows what the scroll has reached.
  const [scrolledYear, setScrolledYear] = useState(year);
  const [scrolledMonth, setScrolledMonth] = useState(month);
  useEffect(() => {
    setScrolledYear(year);
    setScrolledMonth(month);
  }, [year, month]);
  const onVisibleMonth = useCallback((y: number, m: number) => {
    setScrolledYear(y);
    setScrolledMonth(m);
  }, []);
  // Arrows, Today and zooming jump the scrolling views; choosing a day doesn't.
  const [jumps, setJumps] = useState(0);

  const dayEvents = useMemo(
    () =>
      events
        .filter((event) => occurrencesTouching(event, selected, selected).length > 0)
        .sort(byStart),
    [events, selected],
  );

  const shift = (direction: 1 | -1) => {
    setJumps((count) => count + 1);
    if (view === "day") go(addDaysTo(selected, direction));
    else if (view === "week") go(addDaysTo(selected, direction * 7));
    else if (view === "month") {
      const next = scrolledMonth + direction;
      go(dayInMonth(scrolledYear + Math.floor(next / 12), (next + 12) % 12, 1));
    } else go(dayInMonth(year + direction, month, Number(selected.slice(8))));
  };

  const add = (kind: CalendarEventKind, day: Day = selected, time?: string | null) =>
    setTarget({ event: getCalendarStore().draft(kind, day, time), day, isNew: true });
  const open = (event: CalendarEvent, day: Day) => setTarget({ event, day, isNew: false });

  // Keys as on a Mac: T for today, arrows to page, D W M Y for the views.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const typing = (event.target as HTMLElement)?.closest?.("input, textarea, [contenteditable]");
      if (typing || event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === "t") go(today);
      else if (event.key === "ArrowLeft") shift(-1);
      else if (event.key === "ArrowRight") shift(1);
      else if (key === "d" || key === "w" || key === "m" || key === "y") {
        go(selected, ({ d: "day", w: "week", m: "month", y: "year" } as const)[key]);
      } else return;
      event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const pageStart = FIRST_YEAR;
  const pageEnd = LAST_YEAR;
  const title =
    view === "years"
      ? t("calendar.allYears")
      : view === "year"
        ? String(scrolledYear)
        : view === "day"
          ? format({ day: "numeric", month: "long", year: "numeric" }).format(asDate(selected))
          : view === "month"
            ? format({ month: "long", year: "numeric" }).format(
                asDate(dayInMonth(scrolledYear, scrolledMonth, 1)),
              )
            : format({ month: "long", year: "numeric" }).format(asDate(selected));

  // On a phone the title is the way back out, as the scroll and the strip say
  // where you are: a day goes back to its month, a month to its year.
  const backToMonth = phone && (view === "day" || view === "week");
  const scrollsItself = phone && (view === "month" || view === "year" || view === "years");
  const backTitle = backToMonth
    ? null
    : phone && view === "month"
      ? String(scrolledYear)
      : phone && view === "year"
        ? t("calendar.allYears")
        : null;
  const monthTitle = format({
    month: "long",
    ...(year === Number(today.slice(0, 4)) ? {} : { year: "numeric" }),
  }).format(asDate(selected));

  // Apple's way through time: the title zooms out a level, a tap zooms back in.
  const agenda = (
    <DayAgenda
      day={selected}
      today={today}
      events={events}
      dayEvents={dayEvents}
      holidays={holidays.get(selected) ?? []}
      onOpen={open}
      onAdd={(kind) => add(kind)}
    />
  );

  return (
    <div className="flex min-h-0 grow flex-col">
      <header
        data-tauri-drag-region
        className="flex flex-col gap-3 px-4 pt-[max(12px,env(safe-area-inset-top))] pb-3 md:px-5"
      >
        {collapsed && <CollapsedSidebarControls />}
        <div data-tauri-drag-region className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1">
            <WorkspaceBackLink />
            <IconButton
              size="icon-sm"
              variant="ghost"
              label={t("nav.showLibrary")}
              className="hidden md:inline-flex lg:hidden"
              onClick={onOpenSidebar}
            >
              <SidebarIcon size={20} />
            </IconButton>
            <CalendarZoomTitle
              title={backToMonth ? monthTitle : (backTitle ?? title)}
              back={false}
              year={view === "year" ? scrolledYear : year}
              zoomOut={
                outerCalendarView[view]
                  ? () =>
                      zoomTo(
                        view === "year" || view === "month"
                          ? dayInMonth(scrolledYear, scrolledMonth, 1)
                          : selected,
                        outerCalendarView[view] as CalendarView,
                      )
                  : null
              }
              onYear={(next) => go(dayInMonth(next, month, Number(selected.slice(8))), "year")}
            />
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => zoomTo(today, view === "day" || view === "week" ? view : "month")}
              disabled={
                selected === today && (view === "month" || view === "day" || view === "week")
              }
              data-tooltip={t("calendar.goToToday")}
              className="rounded-full px-3 py-1.5 text-subheadline font-medium text-accent-text transition-colors hover:bg-fill/60 disabled:text-label-tertiary disabled:hover:bg-transparent"
            >
              {t("calendar.today")}
            </Button>
            {view !== "years" && (
              <>
                <IconButton
                  size="icon-sm"
                  variant="ghost"
                  label={t("calendar.previous")}
                  className="max-sm:hidden"
                  onClick={() => shift(-1)}
                >
                  <ChevronLeftIcon size={18} className="rtl:-scale-x-100" />
                </IconButton>
                <IconButton
                  size="icon-sm"
                  variant="ghost"
                  label={t("calendar.next")}
                  className="max-sm:hidden"
                  onClick={() => shift(1)}
                >
                  <ChevronRightIcon size={18} className="rtl:-scale-x-100" />
                </IconButton>
              </>
            )}
            {view === "years" && (
              <IconButton
                size="icon-xs"
                variant="ghost"
                label={t("notes.more")}
                onClick={(event) =>
                  openMenu(
                    event.currentTarget,
                    [
                      {
                        label: t(
                          calendarLayout === "gallery"
                            ? "workspace.viewAsList"
                            : "workspace.viewAsGallery",
                        ),
                        icon:
                          calendarLayout === "gallery" ? (
                            <ChaptersIcon size={18} />
                          ) : (
                            <LayoutIcon size={18} />
                          ),
                        onSelect: () =>
                          setCalendarLayout((value) => (value === "gallery" ? "list" : "gallery")),
                      },
                    ],
                    { edge: "trailing" },
                  )
                }
              >
                <MoreIcon size={18} />
              </IconButton>
            )}
            <HolidayButton />
            <IconButton
              size="icon-sm"
              label={t("calendar.newEvent")}
              variant="link"
              onClick={(event) => {
                openMenu(
                  event.currentTarget,
                  [
                    {
                      label: t("calendar.quickAdd"),
                      icon: <SparkleIcon size={18} />,
                      onSelect: () => setTyping(true),
                    },
                    "divider" as const,
                    ...(
                      ["plan", "reminder", "birthday", "anniversary", "deadline", "trip"] as const
                    ).map((kind) => ({
                      label: t(`calendar.newOf.${kind}`),
                      icon: kindIcons[kind],
                      onSelect: () => add(kind),
                    })),
                  ],
                  { edge: "trailing" },
                );
              }}
            >
              <PlusIcon size={20} strokeWidth={2} />
            </IconButton>
          </div>
        </div>
      </header>

      {backToMonth && (
        <WeekStrip
          weekFirst={weekFirst}
          selected={selected}
          today={today}
          onDay={(day) => go(day)}
        />
      )}

      {/* Phones scroll the hours and the day's list together, clear of the tab bar. */}
      <div
        className={cn(
          "flex min-h-0 grow flex-col overflow-y-auto md:flex-row md:overflow-hidden",
          !scrollsItself && "max-md:pb-[calc(env(safe-area-inset-bottom)+96px)]",
        )}
      >
        <motion.div
          data-calendar-surface
          key={`${view}:${view === "day" || view === "week" ? weekFirst : jumps}`}
          initial={
            reducedMotion || nativeTransitions
              ? false
              : { opacity: 0, scale: zoom === "in" ? 0.97 : zoom === "out" ? 1.03 : 1 }
          }
          animate={{ opacity: 1, scale: 1 }}
          transition={spring.smooth}
          className={cn(
            "flex flex-col md:min-h-0 md:shrink md:grow",
            // On a phone the months and years fill the screen and scroll themselves;
            // a day's hours and its list scroll together.
            scrollsItself || query.trim() ? "min-h-0 shrink grow" : "shrink-0",
          )}
        >
          {query.trim() ? (
            <CalendarSearchResults
              events={events}
              onOpenEvent={(event) => setTarget({ event, day: selected, isNew: false })}
            />
          ) : view === "years" ? (
            <CalendarYears
              layout={calendarLayout}
              first={pageStart}
              last={pageEnd}
              current={Number(today.slice(0, 4))}
              today={today}
              weekStart={weekStart}
              selected={year}
              onYear={(next, anchor) =>
                zoomTo(dayInMonth(next, month, Number(selected.slice(8))), "year", anchor)
              }
            />
          ) : view === "year" ? (
            <YearView
              year={year}
              today={today}
              weekStart={weekStart}
              events={events}
              onVisibleYear={setScrolledYear}
              onMonth={(y, m, anchor) => zoomTo(dayInMonth(y, m, 1), "month", anchor)}
            />
          ) : view === "month" ? (
            <MonthView
              year={year}
              month={month}
              today={today}
              selected={selected}
              weekStart={weekStart}
              events={events}
              onDay={(day, anchor) => (phone ? zoomTo(day, "day", anchor) : go(day))}
              onZoomIn={(day, anchor) => zoomTo(day, "day", anchor)}
              onVisibleMonth={onVisibleMonth}
            />
          ) : (
            <TimeGrid
              days={
                view === "day"
                  ? [selected]
                  : Array.from({ length: 7 }, (_, i) => addDaysTo(weekFirst, i))
              }
              today={today}
              events={events}
              selectedId={target?.event.id ?? null}
              onCreate={(day, time) => add("plan", day, time)}
              onOpen={open}
              onDayTitle={(day) => zoomTo(day, "day")}
              dayNames={!(backToMonth && view === "day")}
            />
          )}
        </motion.div>
        {!query.trim() && (
          <aside
            aria-label={t("calendar.day")}
            className={cn(
              "border-t border-separator/60 md:w-[340px] md:shrink-0 md:overflow-y-auto md:border-t-0 md:border-l",
              scrollsItself && "hidden md:block",
            )}
          >
            {agenda}
          </aside>
        )}
      </div>

      <FloatingSearchToolbar
        leading={
          view === "years" ? (
            <IconButton
              size="icon-lg"
              variant="ghost"
              className="glass"
              label={t(
                calendarLayout === "gallery" ? "workspace.viewAsList" : "workspace.viewAsGallery",
              )}
              onClick={() =>
                setCalendarLayout((value) => (value === "gallery" ? "list" : "gallery"))
              }
            >
              {calendarLayout === "gallery" ? <ChaptersIcon size={20} /> : <LayoutIcon size={20} />}
            </IconButton>
          ) : undefined
        }
        label={t("calendar.title")}
        placeholder={t("common.search")}
        value={query}
        onChange={setQuery}
        action={{
          label: t("calendar.calendars"),
          icon: <CalendarIcon size={21} />,
          onPress: () => setCalendarsOpen(true),
        }}
      />
      <CalendarSourcesSheet
        open={calendarsOpen}
        onClose={() => setCalendarsOpen(false)}
        events={allEvents}
        onOpenEvent={(event) => setTarget({ event, day: selected, isNew: false })}
      />
      <EventSheet target={target} onClose={() => setTarget(null)} />
      <QuickAddSheet
        open={typing}
        today={today}
        onClose={() => setTyping(false)}
        onAdded={(day) => zoomTo(day, view === "year" || view === "years" ? "month" : view)}
      />
    </div>
  );
}
