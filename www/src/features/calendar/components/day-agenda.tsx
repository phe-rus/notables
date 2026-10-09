import {
  addDaysTo,
  ageOn,
  type CalendarEvent,
  type CalendarEventKind,
  type Day,
  daysBetween,
  isDone,
  isYearlyKind,
  occurrencesBetween,
} from "@notables/core";
import { BellIcon, CheckIcon, cn, RepeatIcon, toast, useContextMenu } from "@ultrapeach/ui";
import type { ReactNode } from "react";
import { locale, t } from "../../../i18n/i18n";
import { describeDay, formatClock } from "../lib/describe-alert";
import { eventTitle, kindIcons } from "../lib/event-display";
import type { Holiday } from "../lib/holidays";
import { getCalendarStore } from "../store/calendar-store";

const longDate = () =>
  new Intl.DateTimeFormat(locale(), {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

const relative = () => new Intl.RelativeTimeFormat(locale(), { numeric: "auto" });

const UPCOMING_DAYS = 30;
const UPCOMING_LIMIT = 12;
const OVERDUE_DAYS = 30;
const BIRTHDAYS_AHEAD = 60;

/** By start: all-day first, then by time. */
export function byStart(a: CalendarEvent, b: CalendarEvent): number {
  return (a.time ?? "").localeCompare(b.time ?? "");
}

/**
 * The side of the calendar: what's on the chosen day, reminders still to
 * do, birthdays coming up and what follows after the day.
 */
export function DayAgenda({
  day,
  today,
  events,
  dayEvents,
  holidays,
  onOpen,
  onAdd,
}: {
  day: Day;
  today: Day;
  events: CalendarEvent[];
  dayEvents: CalendarEvent[];
  holidays: Holiday[];
  onOpen: (event: CalendarEvent, day: Day) => void;
  onAdd: (kind: CalendarEventKind) => void;
}) {
  const after = addDaysTo(day, 1);
  const upcoming = events
    .filter((event) => !isYearlyKind(event.kind))
    .flatMap((event) =>
      occurrencesBetween(event, after, addDaysTo(day, UPCOMING_DAYS)).map((on) => ({ event, on })),
    )
    .sort((a, b) => a.on.localeCompare(b.on) || byStart(a.event, b.event))
    .slice(0, UPCOMING_LIMIT);

  const reminders = events.filter((event) => event.kind === "reminder");
  const overdue = reminders
    .flatMap((event) =>
      occurrencesBetween(event, addDaysTo(today, -OVERDUE_DAYS), addDaysTo(today, -1))
        .filter((on) => !isDone(event, on))
        .map((on) => ({ event, on })),
    )
    .sort((a, b) => a.on.localeCompare(b.on));

  const birthdays = events
    .filter((event) => isYearlyKind(event.kind))
    .flatMap((event) =>
      occurrencesBetween(event, today, addDaysTo(today, BIRTHDAYS_AHEAD)).map((on) => ({
        event,
        on,
      })),
    )
    .sort((a, b) => a.on.localeCompare(b.on))
    .slice(0, 8);

  return (
    <div className="flex flex-col gap-6 px-4 pt-4 pb-32 md:px-5 md:pb-8">
      <section aria-label={t("calendar.day")} className="flex flex-col gap-2">
        <div className="flex flex-col">
          <h2 className="text-body font-semibold tracking-tight">
            {describeDay(day, new Date(`${today}T12:00:00`))}
          </h2>
          <p className="text-footnote text-label-secondary">
            {longDate().format(new Date(`${day}T00:00:00Z`))}
          </p>
        </div>
        {holidays.map((holiday) => (
          <p
            key={holiday.name}
            className="flex items-center gap-2 rounded-xl bg-danger/8 px-3 py-2 text-subheadline font-medium text-danger"
          >
            <span className="grow">{holiday.name}</span>
            <span className="text-caption2 font-semibold uppercase opacity-70">
              {holiday.closed ? t("calendar.holiday") : t("calendar.observance")}
            </span>
          </p>
        ))}
        {dayEvents.length === 0 ? (
          <div className="flex flex-col gap-3 rounded-3xl bg-fill/40 px-4 py-4">
            <p className="text-subheadline text-label-secondary">{t("calendar.nothingPlanned")}</p>
            <div className="flex flex-wrap gap-1.5">
              {(["plan", "reminder", "birthday", "trip"] as const).map((kind) => (
                <QuickKind key={kind} icon={kindIcons[kind]} onClick={() => onAdd(kind)}>
                  {t(`calendar.kind.${kind}`)}
                </QuickKind>
              ))}
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

      {overdue.length > 0 && (
        <AgendaSection title={t("calendar.overdue")}>
          {overdue.map(({ event, on }) => (
            <li key={`${event.id}:${on}`}>
              <EventRow event={event} day={on} showDay onOpen={() => onOpen(event, on)} />
            </li>
          ))}
        </AgendaSection>
      )}

      {birthdays.length > 0 && (
        <AgendaSection title={t("calendar.birthdaysSoon")}>
          {birthdays.map(({ event, on }) => {
            const age = ageOn(event, on);
            const inDays = daysBetween(today, on);
            return (
              <li key={`${event.id}:${on}`}>
                <button
                  type="button"
                  onClick={() => onOpen(event, on)}
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-start transition-colors hover:bg-fill/50"
                >
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-full"
                    style={{
                      color: event.color,
                      background: `color-mix(in oklab, ${event.color} 15%, transparent)`,
                    }}
                  >
                    {kindIcons[event.kind]}
                  </span>
                  <span className="flex min-w-0 grow flex-col">
                    <span className="truncate text-subheadline font-medium">
                      {event.title || t("calendar.someone")}
                    </span>
                    <span className="truncate text-caption text-label-secondary">
                      {describeDay(on)}
                      {age
                        ? ` · ${event.kind === "birthday" ? t("calendar.turning", { age }) : t("calendar.years", { count: age })}`
                        : ""}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "shrink-0 text-caption font-semibold tabular-nums",
                      inDays === 0 ? "text-accent-text" : "text-label-tertiary",
                    )}
                  >
                    {relative().format(inDays, "day")}
                  </span>
                </button>
              </li>
            );
          })}
        </AgendaSection>
      )}

      {upcoming.length > 0 && (
        <AgendaSection title={t("calendar.comingUp")}>
          {upcoming.map(({ event, on }) => (
            <li key={`${event.id}:${on}`}>
              <EventRow event={event} day={on} showDay onOpen={() => onOpen(event, on)} />
            </li>
          ))}
        </AgendaSection>
      )}
    </div>
  );
}

function AgendaSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-2">
      <h2 className="text-footnote font-semibold text-label-secondary">{title}</h2>
      <ul className="flex flex-col gap-1">{children}</ul>
    </section>
  );
}

function QuickKind({
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
      className="flex items-center gap-1.5 rounded-full bg-elevated px-3 py-1.5 text-footnote font-medium shadow-[inset_0_0_0_1px_var(--color-separator)] transition-colors hover:bg-fill/60"
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
  const age = event.kind === "birthday" ? ageOn(event, day) : null;
  const reminder = event.kind === "reminder";
  const done = reminder && isDone(event, day);
  const menu = useContextMenu(() => [
    { label: t("common.edit"), onSelect: onOpen },
    ...(reminder
      ? [
          {
            label: done ? t("calendar.markUndone") : t("calendar.markDone"),
            onSelect: () => store.toggleDone(event.id, day),
          },
        ]
      : []),
    ...(event.repeat !== "never"
      ? [{ label: t("calendar.skipDay"), onSelect: () => store.skip(event.id, day) }]
      : []),
    "divider" as const,
    {
      label: event.repeat !== "never" ? t("calendar.deleteEvery") : t("common.delete"),
      destructive: true,
      onSelect: () => {
        const removed = store.remove(event.id);
        if (removed) {
          toast(t("common.deleted"), {
            description: removed.title || undefined,
            action: { label: t("common.undo"), onClick: () => store.save(removed) },
          });
        }
      },
    },
  ]);
  const when = [
    showDay ? describeDay(day) : null,
    event.time ? formatClock(event.time) : t("calendar.allDay"),
    event.location || null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      {...menu}
      className="flex w-full items-stretch gap-2 rounded-2xl px-2 transition-colors hover:bg-fill/50"
    >
      {reminder ? (
        // biome-ignore lint/a11y/useSemanticElements: a round check like Reminders, not a form checkbox.
        <button
          type="button"
          role="checkbox"
          aria-checked={done}
          aria-label={done ? t("calendar.markUndone") : t("calendar.markDone")}
          onClick={() => store.toggleDone(event.id, day)}
          className="flex shrink-0 items-center px-1"
        >
          <span
            className={cn(
              "flex size-[22px] items-center justify-center rounded-full border-2 transition-colors",
              done ? "border-transparent" : "border-label-tertiary/60",
            )}
            style={done ? { background: event.color } : { borderColor: event.color }}
          >
            {done && <CheckIcon size={13} strokeWidth={3} className="text-white" />}
          </span>
        </button>
      ) : (
        <span
          className="my-2.5 ms-1 w-1 shrink-0 rounded-full"
          style={{ background: event.color }}
        />
      )}
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 grow items-center gap-2 py-2.5 pe-1 text-start"
      >
        <span className="flex min-w-0 grow flex-col gap-0.5">
          <span
            className={cn(
              "truncate text-subheadline font-medium",
              done && "line-through opacity-55",
            )}
          >
            {eventTitle(event, day)}
          </span>
          <span className="flex items-center gap-1.5 text-caption text-label-secondary">
            <span className="text-label-tertiary">{kindIcons[event.kind]}</span>
            <span className="truncate">{when}</span>
            {age && <span className="shrink-0">· {t("calendar.turning", { age })}</span>}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1 text-label-tertiary">
          {event.repeat !== "never" && !isYearlyKind(event.kind) && (
            <span data-tooltip={t(`calendar.repeat.${event.repeat}`)}>
              <RepeatIcon size={14} />
            </span>
          )}
          {event.alert !== null && <BellIcon size={14} />}
        </span>
      </button>
    </div>
  );
}
