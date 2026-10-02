import {
  addDaysTo,
  type CalendarEvent,
  type Day,
  isDone,
  type Occurrence,
  occurrencesTouching,
} from "@notables/core";
import { CheckIcon, cn } from "@notables/ui";
import {
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { locale, t } from "../../../i18n/i18n";
import { layoutDay } from "../lib/day-layout";
import { formatClock } from "../lib/describe-alert";
import { eventTitle, kindIcons, minutesOf, timeOf } from "../lib/event-display";
import { getCalendarStore } from "../store/calendar-store";

/** How tall an hour is, from packed to roomy; pinching moves between them. */
const HOUR_MIN = 28;
const HOUR_MAX = 160;
const HOUR_DEFAULT = 52;
const HOUR_KEY = "notables:calendar-hour";

function storedHour(): number {
  try {
    const value = Number(localStorage.getItem(HOUR_KEY));
    return value >= HOUR_MIN && value <= HOUR_MAX ? value : HOUR_DEFAULT;
  } catch {
    return HOUR_DEFAULT;
  }
}
const SNAP = 15;
const DAY_MINUTES = 24 * 60;

const hourLabel = (hour: number) =>
  new Intl.DateTimeFormat(locale(), { hour: "numeric" }).format(new Date(2000, 0, 1, hour));

const headerFormat = () => new Intl.DateTimeFormat(locale(), { weekday: "short", timeZone: "UTC" });

/** A drag in progress: where the block started and how far it has gone. */
interface Drag {
  key: string;
  event: CalendarEvent;
  day: Day;
  mode: "move" | "resize";
  startX: number;
  startY: number;
  dx: number;
  dy: number;
  moved: boolean;
}

/**
 * Days as columns of hours, as in Apple's Day and Week views: all-day
 * things across the top, timed ones placed by their hours, side by side
 * where they overlap, and a line at the current time. Click an empty
 * time to add something there; drag to move, drag the bottom edge to
 * change how long it lasts.
 */
export function TimeGrid({
  days,
  today,
  events,
  selectedId,
  onCreate,
  onOpen,
  onDayTitle,
}: {
  days: Day[];
  today: Day;
  events: CalendarEvent[];
  selectedId: string | null;
  onCreate: (day: Day, time: string | null) => void;
  onOpen: (event: CalendarEvent, day: Day) => void;
  onDayTitle: (day: Day) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const columns = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(() => new Date());
  const [drag, setDrag] = useState<Drag | null>(null);
  const [hourHeight, setHourHeight] = useState(storedHour);

  // Pinch to zoom the hours: a trackpad pinch arrives as a ctrl+wheel, a
  // phone's as two fingers. The time under the pinch stays where it was.
  useEffect(() => {
    const element = scroller.current;
    if (!element) return;
    let height = hourHeight;
    const zoom = (factor: number, anchorY: number) => {
      const next = Math.min(HOUR_MAX, Math.max(HOUR_MIN, height * factor));
      if (next === height) return;
      const rect = element.getBoundingClientRect();
      const minutes = ((element.scrollTop + anchorY - rect.top) / height) * 60;
      height = next;
      setHourHeight(next);
      requestAnimationFrame(() => {
        element.scrollTop = (minutes / 60) * next - (anchorY - rect.top);
      });
      try {
        localStorage.setItem(HOUR_KEY, String(Math.round(next)));
      } catch {
        // Remembered for this session.
      }
    };
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return;
      event.preventDefault();
      zoom(Math.exp(-event.deltaY * 0.01), event.clientY);
    };
    let pinch: number | null = null;
    const distance = (touches: TouchList) => {
      const [a, b] = [touches[0], touches[1]];
      return a && b ? Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) : 0;
    };
    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 2) pinch = distance(event.touches);
    };
    const onTouchMove = (event: TouchEvent) => {
      if (pinch === null || event.touches.length !== 2) return;
      event.preventDefault();
      const now = distance(event.touches);
      const [a, b] = [event.touches[0], event.touches[1]];
      if (pinch > 0 && a && b) zoom(now / pinch, (a.clientY + b.clientY) / 2);
      pinch = now;
    };
    const onTouchEnd = () => {
      pinch = null;
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    element.addEventListener("touchstart", onTouchStart, { passive: true });
    element.addEventListener("touchmove", onTouchMove, { passive: false });
    element.addEventListener("touchend", onTouchEnd);
    return () => {
      element.removeEventListener("wheel", onWheel);
      element.removeEventListener("touchstart", onTouchStart);
      element.removeEventListener("touchmove", onTouchMove);
      element.removeEventListener("touchend", onTouchEnd);
    };
  }, []);
  const first = days[0] ?? today;
  const last = days.at(-1) ?? today;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  // Open on the working day, or an hour before now when today is shown.
  useEffect(() => {
    const hour = days.includes(today) ? Math.max(0, now.getHours() - 1) : 7;
    scroller.current?.scrollTo({ top: hour * hourHeight });
  }, [first]);

  const occurrences = useMemo(
    () => events.flatMap((event) => occurrencesTouching(event, first, last)),
    [events, first, last],
  );
  const allDay = occurrences.filter((o) => o.event.time === null || o.start !== o.end);
  const lanes = allDayLanes(allDay, days);
  const timed = (day: Day) =>
    layoutDay(
      occurrences
        .filter((o) => o.event.time !== null && o.start === o.end && o.start === day)
        .map((o) => {
          const start = minutesOf(o.event.time ?? "00:00");
          return { key: o.event.id, start, end: Math.min(DAY_MINUTES, start + o.event.duration) };
        }),
    );

  const columnWidth = () => (columns.current?.clientWidth ?? 1) / days.length;

  const beginDrag = (
    pointer: ReactPointerEvent,
    event: CalendarEvent,
    day: Day,
    mode: Drag["mode"],
  ) => {
    if (pointer.button !== 0) return;
    pointer.stopPropagation();
    (pointer.currentTarget as HTMLElement).setPointerCapture(pointer.pointerId);
    setDrag({
      key: event.id,
      event,
      day,
      mode,
      startX: pointer.clientX,
      startY: pointer.clientY,
      dx: 0,
      dy: 0,
      moved: false,
    });
  };

  const snapMinutes = (dy: number) => Math.round((dy / hourHeight) * (60 / SNAP)) * SNAP;
  const dayShift = (dx: number) => (days.length > 1 ? Math.round(dx / columnWidth()) : 0);

  const onPointerMove = (pointer: ReactPointerEvent) => {
    if (!drag) return;
    const dx = pointer.clientX - drag.startX;
    const dy = pointer.clientY - drag.startY;
    setDrag({ ...drag, dx, dy, moved: drag.moved || Math.abs(dx) > 4 || Math.abs(dy) > 4 });
  };

  const onPointerUp = () => {
    if (!drag) return;
    setDrag(null);
    if (!drag.moved) {
      onOpen(drag.event, drag.day);
      return;
    }
    const store = getCalendarStore();
    const start = minutesOf(drag.event.time ?? "00:00");
    if (drag.mode === "resize") {
      const duration = Math.max(SNAP, drag.event.duration + snapMinutes(drag.dy));
      store.move(drag.event.id, drag.event.date, drag.event.time, duration);
      return;
    }
    const time = timeOf(start + snapMinutes(drag.dy));
    // A repeating event keeps its days; only its time follows the drag.
    const repeats = drag.event.repeat !== "never";
    const date = repeats ? drag.event.date : addDaysTo(drag.event.date, dayShift(drag.dx));
    store.move(drag.event.id, date, time);
  };

  const createAt = (pointer: React.MouseEvent<HTMLDivElement>, day: Day) => {
    const rect = pointer.currentTarget.getBoundingClientRect();
    const minutes = Math.floor(((pointer.clientY - rect.top) / hourHeight) * (60 / 30)) * 30;
    onCreate(day, timeOf(minutes));
  };

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const gridColumns = { gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` };

  return (
    <div className="flex min-h-0 grow flex-col">
      {/* Day names and dates, then the all-day row, both above the hours. */}
      <div className="flex border-b border-separator/70 ps-14">
        <div className="grid grow" style={gridColumns}>
          {days.map((day) => {
            const isToday = day === today;
            return (
              <button
                key={day}
                type="button"
                onClick={() => onDayTitle(day)}
                className="flex items-baseline justify-center gap-1.5 py-2 text-[13px] text-label-secondary"
              >
                <span>{headerFormat().format(new Date(`${day}T00:00:00Z`))}</span>
                <span
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full text-[16px] font-semibold tabular-nums",
                    isToday ? "bg-accent text-on-accent" : "text-label",
                  )}
                >
                  {Number(day.slice(8))}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      {lanes.rows > 0 && (
        <div className="flex border-b border-separator/70 py-1 ps-14">
          <span className="absolute -ms-14 w-12 pe-2 pt-1 text-end text-[11px] text-label-tertiary">
            {t("calendar.allDayShort")}
          </span>
          <div
            className="grid grow gap-y-0.5"
            style={{ ...gridColumns, gridTemplateRows: `repeat(${lanes.rows}, 22px)` }}
          >
            {lanes.placed.map(({ occurrence, from, to, lane }) => (
              <button
                key={`${occurrence.event.id}:${occurrence.start}`}
                type="button"
                onClick={() => onOpen(occurrence.event, occurrence.start)}
                style={{
                  gridColumn: `${from + 1} / ${to + 2}`,
                  gridRow: lane + 1,
                  background: `color-mix(in oklab, ${occurrence.event.color} 18%, transparent)`,
                  color: occurrence.event.color,
                }}
                className={cn(
                  "mx-0.5 flex min-w-0 items-center gap-1 rounded-[6px] px-1.5 text-start text-[12px] font-semibold",
                  selectedId === occurrence.event.id && "ring-2 ring-current",
                )}
              >
                <span className="shrink-0">{kindIcons[occurrence.event.kind]}</span>
                <span className="truncate">{eventTitle(occurrence.event, occurrence.start)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div ref={scroller} className="relative min-h-0 grow overflow-y-auto">
        <div className="relative flex" style={{ height: 24 * hourHeight }}>
          <div className="w-14 shrink-0">
            {Array.from({ length: 24 }, (_, hour) => (
              <span
                key={hour}
                className="absolute w-12 pe-2 text-end text-[11px] text-label-tertiary tabular-nums"
                style={{ top: hour * hourHeight - 7 }}
              >
                {hour === 0 ? "" : hourLabel(hour)}
              </span>
            ))}
          </div>
          <div
            ref={columns}
            className="relative grid grow"
            style={gridColumns}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={() => setDrag(null)}
          >
            {Array.from({ length: 24 }, (_, hour) => (
              <span
                key={hour}
                className="pointer-events-none absolute inset-x-0 border-t border-separator/60"
                style={{ top: hour * hourHeight }}
              />
            ))}
            {days.map((day) => (
              // biome-ignore lint/a11y/noStaticElementInteractions: empty time is clicked to add; the + button and keyboard paths also add.
              <div
                key={day}
                role="presentation"
                className={cn(
                  "relative border-s border-separator/50",
                  day === today && "bg-accent/[0.03]",
                )}
                onDoubleClick={(pointer) => createAt(pointer, day)}
                onClick={(pointer) => {
                  if (pointer.detail === 1 && days.length === 1) createAt(pointer, day);
                }}
              >
                {timed(day).map((block) => {
                  const occurrence = occurrences.find(
                    (o) => o.event.id === block.key && o.start === day,
                  );
                  if (!occurrence) return null;
                  const { event } = occurrence;
                  const dragging = drag?.key === event.id && drag.day === day ? drag : null;
                  const move = dragging?.mode === "move" ? snapMinutes(dragging.dy) : 0;
                  const grow = dragging?.mode === "resize" ? snapMinutes(dragging.dy) : 0;
                  const shift =
                    dragging?.mode === "move" && event.repeat === "never"
                      ? dayShift(dragging.dx)
                      : 0;
                  const top = ((block.start + move) / 60) * hourHeight;
                  const height = Math.max(
                    20,
                    (Math.max(SNAP, block.end - block.start + grow) / 60) * hourHeight - 2,
                  );
                  const done = event.kind === "reminder" && isDone(event, day);
                  return (
                    // biome-ignore lint/a11y/useSemanticElements: it holds its own resize handle, which a button can't.
                    <div
                      key={event.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`${eventTitle(event, day)}, ${formatClock(event.time ?? "00:00")}`}
                      onPointerDown={(pointer) => beginDrag(pointer, event, day, "move")}
                      onClick={(pointer) => pointer.stopPropagation()}
                      onDoubleClick={(pointer) => pointer.stopPropagation()}
                      onKeyDown={(key) => {
                        if (key.key === "Enter" || key.key === " ") {
                          key.preventDefault();
                          onOpen(event, day);
                        }
                      }}
                      style={{
                        top,
                        height,
                        left: `calc(${(block.column / block.columns) * 100}% + 2px)`,
                        width: `calc(${100 / block.columns}% - 4px)`,
                        transform: shift ? `translateX(${shift * 100}%)` : undefined,
                        background: `color-mix(in oklab, ${event.color} 16%, var(--color-background))`,
                        borderInlineStartColor: event.color,
                      }}
                      className={cn(
                        "group absolute z-10 flex cursor-grab touch-none flex-col overflow-hidden rounded-[7px] border-s-[3px] px-1.5 py-0.5 text-[12px] leading-tight select-none",
                        dragging && "z-20 cursor-grabbing shadow-lg",
                        selectedId === event.id && "ring-2 ring-accent",
                        done && "opacity-55",
                      )}
                    >
                      <span
                        className={cn("truncate font-semibold", done && "line-through")}
                        style={{
                          color: `color-mix(in oklab, ${event.color} 75%, var(--color-label))`,
                        }}
                      >
                        {event.kind === "reminder" && done && (
                          <CheckIcon size={11} strokeWidth={3} className="me-0.5 inline" />
                        )}
                        {eventTitle(event, day)}
                      </span>
                      {height > 34 && (
                        <span className="truncate text-label-secondary tabular-nums">
                          {formatClock(timeOf(block.start + move))}
                          {event.location ? ` · ${event.location}` : ""}
                        </span>
                      )}
                      <span
                        aria-hidden="true"
                        onPointerDown={(pointer) => beginDrag(pointer, event, day, "resize")}
                        className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize opacity-0 group-hover:opacity-100"
                      >
                        <span className="mx-auto mt-0.5 block h-1 w-6 rounded-full bg-label/30" />
                      </span>
                    </div>
                  );
                })}
                {day === today && (
                  <span
                    className="pointer-events-none absolute inset-x-0 z-30 flex items-center"
                    style={{ top: (nowMinutes / 60) * hourHeight }}
                  >
                    <span className="-ms-1 size-2 rounded-full bg-danger" />
                    <span className="h-[1.5px] grow bg-danger" />
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * All-day things as bars across the days they cover, each in the first
 * lane where it fits, so a trip and a birthday don't sit on each other.
 */
function allDayLanes(occurrences: Occurrence[], days: Day[]) {
  const first = days[0] ?? "";
  const last = days.at(-1) ?? "";
  const index = (day: Day) => days.indexOf(day);
  const placed: { occurrence: Occurrence; from: number; to: number; lane: number }[] = [];
  const lanes: number[] = [];
  const sorted = [...occurrences].sort(
    (a, b) => a.start.localeCompare(b.start) || b.end.localeCompare(a.end),
  );
  for (const occurrence of sorted) {
    const from = index(occurrence.start < first ? first : occurrence.start);
    const to = index(occurrence.end > last ? last : occurrence.end);
    if (from < 0 || to < 0) continue;
    let lane = lanes.findIndex((end) => end < from);
    if (lane < 0) lane = lanes.length;
    lanes[lane] = to;
    placed.push({ occurrence, from, to, lane });
  }
  return { placed, rows: lanes.length };
}
