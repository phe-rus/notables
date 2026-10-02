import {
  addDaysTo,
  ageOn,
  type CalendarEvent,
  type CalendarEventKind,
  type Day,
  occurrencesBetween,
  repeatLabels,
} from "@notables/core";
import {
  AlarmIcon,
  BellIcon,
  BirthdayIcon,
  CalendarIcon,
  RepeatIcon,
  toast,
  useContextMenu,
} from "@notables/ui";
import type { ReactNode } from "react";
import { describeDay, formatClock } from "../lib/describe-alert";
import { getCalendarStore } from "../store/calendar-store";

const longDate = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const kindIcons: Record<CalendarEventKind, ReactNode> = {
  plan: <CalendarIcon size={14} />,
  birthday: <BirthdayIcon size={14} />,
  reminder: <AlarmIcon size={14} />,
};

const UPCOMING_DAYS = 30;
const UPCOMING_LIMIT = 12;

/** By start: all-day first, then by time. */
export function byStart(a: CalendarEvent, b: CalendarEvent): number {
  return (a.time ?? "").localeCompare(b.time ?? "");
}

/** What's on the chosen day, then what's coming up after it. */
export function DayAgenda({
  day,
  today,
  events,
  dayEvents,
  onOpen,
  onAdd,
}: {
  day: Day;
  today: Day;
  events: CalendarEvent[];
  dayEvents: CalendarEvent[];
  onOpen: (event: CalendarEvent, day: Day) => void;
  onAdd: (kind: CalendarEventKind) => void;
}) {
  const from = addDaysTo(day, 1);
  const upcoming = events
    .flatMap((event) =>
      occurrencesBetween(event, from, addDaysTo(day, UPCOMING_DAYS)).map((on) => ({ event, on })),
    )
    .sort((a, b) => a.on.localeCompare(b.on) || byStart(a.event, b.event))
    .slice(0, UPCOMING_LIMIT);

  return (
    <div className="flex flex-col gap-6 px-4 pt-4 pb-32 md:px-5 md:pb-8">
      <section aria-label="Selected day" className="flex flex-col gap-2">
        <div className="flex flex-col">
          <h2 className="text-[17px] font-semibold tracking-tight">
            {describeDay(day, new Date(`${today}T12:00:00`))}
          </h2>
          <p className="text-[13px] text-label-secondary">
            {longDate.format(new Date(`${day}T00:00:00Z`))}
          </p>
        </div>
        {dayEvents.length === 0 ? (
          <div className="flex flex-col gap-3 rounded-[16px] bg-fill/40 px-4 py-4">
            <p className="text-[14px] text-label-secondary">Nothing planned.</p>
            <div className="flex flex-wrap gap-1.5">
              <QuickAdd icon={kindIcons.plan} onClick={() => onAdd("plan")}>
                Plan
              </QuickAdd>
              <QuickAdd icon={kindIcons.reminder} onClick={() => onAdd("reminder")}>
                Reminder
              </QuickAdd>
              <QuickAdd icon={kindIcons.birthday} onClick={() => onAdd("birthday")}>
                Birthday
              </QuickAdd>
            </div>
          </div>
        ) : (
          <ul className="flex flex-col gap-1">
            {dayEvents.map((event) => (
              <li key={event.id}>
                <EventRow event={event} day={day} onOpen={() => onOpen(event, day)} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {upcoming.length > 0 && (
        <section aria-label="Coming up" className="flex flex-col gap-2">
          <h2 className="text-[13px] font-semibold text-label-secondary">Coming up</h2>
          <ul className="flex flex-col gap-1">
            {upcoming.map(({ event, on }) => (
              <li key={`${event.id}:${on}`}>
                <EventRow event={event} day={on} showDay onOpen={() => onOpen(event, on)} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function QuickAdd({
  icon,
  onClick,
  children,
}: {
  icon: ReactNode;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-full bg-elevated px-3 py-1.5 text-[13px] font-medium shadow-[inset_0_0_0_1px_var(--color-separator)] transition-colors hover:bg-fill/60"
    >
      {icon}
      {children}
    </button>
  );
}

function EventRow({
  event,
  day,
  showDay,
  onOpen,
}: {
  event: CalendarEvent;
  day: Day;
  showDay?: boolean;
  onOpen: () => void;
}) {
  const store = getCalendarStore();
  const age = ageOn(event, day);
  const menu = useContextMenu(() => [
    { label: "Edit", onSelect: onOpen },
    ...(event.repeat !== "never"
      ? [{ label: "Skip this day", onSelect: () => store.skip(event.id, day) }]
      : []),
    "divider" as const,
    {
      label: event.repeat !== "never" ? "Delete every time" : "Delete",
      destructive: true,
      onSelect: () => {
        const removed = store.remove(event.id);
        if (removed) {
          toast("Deleted", {
            description: removed.title || undefined,
            action: { label: "Undo", onClick: () => store.save(removed) },
          });
        }
      },
    },
  ]);
  const when = [showDay ? describeDay(day) : null, event.time ? formatClock(event.time) : "All day"]
    .filter(Boolean)
    .join(" · ");

  return (
    <button
      type="button"
      onClick={onOpen}
      {...menu}
      className="flex w-full items-stretch gap-3 rounded-[14px] px-3 py-2.5 text-left transition-colors hover:bg-fill/50"
    >
      <span className="w-1 shrink-0 rounded-full" style={{ background: event.color }} />
      <span className="flex min-w-0 grow flex-col gap-0.5">
        <span className="truncate text-[15px] font-medium">
          {event.kind === "birthday"
            ? `${event.title || "Someone"}’s birthday`
            : event.title || "Untitled"}
        </span>
        <span className="flex items-center gap-1.5 text-[12.5px] text-label-secondary">
          <span className="text-label-tertiary">{kindIcons[event.kind]}</span>
          {when}
          {age && <span>· turning {age}</span>}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-1 self-center text-label-tertiary">
        {event.repeat !== "never" && event.kind !== "birthday" && (
          <span data-tooltip={repeatLabels[event.repeat]}>
            <RepeatIcon size={14} />
          </span>
        )}
        {event.alert !== null && <BellIcon size={14} />}
      </span>
    </button>
  );
}
