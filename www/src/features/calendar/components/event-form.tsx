import {
  addDaysTo,
  type CalendarEvent,
  type CalendarEventKind,
  calendarKinds,
  dayInMonth,
  daysInMonth,
  isYearlyKind,
  LAST_YEAR,
  type Repeat,
  repeatLabels,
} from "@notables/core";
import { Button, CloseIcon, IconButton, openMenu, Toggle, toast } from "@ultrapeach/ui";
import { useState } from "react";
import { Field, PickerInput, TextArea, TextInput } from "../../../components/form/form-fields";
import { locale, t } from "../../../i18n/i18n";
import { permissionState, requestPermission } from "../../../platform/permissions";
import { alertLabel, allDayAlerts, timedAlerts } from "../lib/alert-choices";
import { describeDay } from "../lib/describe-alert";
import { kindIcons, minutesOf, timeOf } from "../lib/event-display";
import { eventColors, getCalendarStore, paletteColors } from "../store/calendar-store";

export interface EventTarget {
  event: CalendarEvent;
  /** The day it was opened from, for removing or ticking off one day of a repeating event. */
  day: string;
  isNew: boolean;
}

const monthName = (month: number) =>
  new Intl.DateTimeFormat(locale(), { month: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(2000, month, 1)),
  );

/**
 * Add or change anything on the calendar. Each kind asks only what it
 * needs: a birthday asks for a day and month, and a year only if known; a
 * trip for its first and last day; a plan for when it starts and ends.
 */
export function EventForm({
  target,
  onClose,
  layout = "sheet",
}: {
  target: EventTarget;
  onClose: () => void;
  /** A sheet on phones; a panel beside the calendar on larger screens. */
  layout?: "sheet" | "panel";
}) {
  const store = getCalendarStore();
  const [event, setEvent] = useState(target.event);
  const set = (change: Partial<CalendarEvent>) => setEvent((e) => ({ ...e, ...change }));
  const yearly = isYearlyKind(event.kind);
  const allDay = event.time === null;
  const alerts = allDay ? allDayAlerts() : timedAlerts();
  const formId = `event-form-${event.id}`;

  const changeKind = (kind: CalendarEventKind) => {
    const fresh = store.draft(kind, event.date);
    const wasYearly = isYearlyKind(event.kind);
    set({
      kind,
      color: event.color === eventColors[event.kind] ? eventColors[kind] : event.color,
      repeat: isYearlyKind(kind) ? "yearly" : wasYearly ? "never" : event.repeat,
      time: fresh.time === null ? null : (event.time ?? fresh.time),
      alert: fresh.alert,
      endDate: kind === "trip" ? (event.endDate ?? addDaysTo(event.date, 2)) : event.endDate,
    });
  };

  const save = async () => {
    const title = event.title.trim();
    const endDate = event.endDate && event.endDate > event.date ? event.endDate : null;
    store.save({ ...event, title, location: event.location?.trim() || undefined, endDate });
    onClose();
    toast.success(target.isNew ? t(`calendar.addedOf.${event.kind}`) : t("calendar.saved"), {
      description: `${title || t("common.untitled")} · ${describeDay(event.date)}`,
    });
    // Ask for notifications the first time they would be useful.
    if (event.alert !== null && (await permissionState("notifications")) === "prompt") {
      await requestPermission("notifications");
    }
  };

  const removeDay = () => {
    store.skip(event.id, target.day);
    onClose();
    toast(t("calendar.removedDay"), {
      action: {
        label: t("common.undo"),
        onClick: () => {
          const current = store.events.get(event.id);
          if (current) {
            store.save({ ...current, skipped: current.skipped.filter((d) => d !== target.day) });
          }
        },
      },
    });
  };

  const removeAll = () => {
    const removed = store.remove(event.id);
    onClose();
    toast(t("common.deleted"), {
      description: removed?.title || undefined,
      action: removed ? { label: t("common.undo"), onClick: () => store.save(removed) } : undefined,
    });
  };

  const remove = (anchor: HTMLElement) => {
    // A repeating event can lose one day or all of them.
    if (target.event.repeat === "never") return removeAll();
    openMenu(
      anchor,
      [
        { label: t("calendar.deleteDay"), onSelect: removeDay },
        { label: t("calendar.deleteEvery"), destructive: true, onSelect: removeAll },
      ],
      { above: true },
    );
  };

  const endMinutes = minutesOf(event.time ?? "09:00") + event.duration;

  return (
    <>
      <header className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
        <div className="min-w-0 grow">
          <PickerInput<CalendarEventKind>
            label={t("calendar.kindLabel")}
            value={event.kind}
            onChange={changeKind}
            className="w-auto max-w-full font-semibold"
            options={calendarKinds.map((kind) => ({
              value: kind,
              label: t(`calendar.kind.${kind}`),
            }))}
          />
        </div>
        <IconButton label={t("common.close")} onClick={onClose}>
          <CloseIcon size={18} />
        </IconButton>
      </header>

      <form
        className="flex grow flex-col gap-4 overflow-y-auto px-5 pt-1 pb-5"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        id={formId}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-full"
            style={{
              color: event.color,
              background: `color-mix(in oklab, ${event.color} 16%, transparent)`,
            }}
          >
            {kindIcons[event.kind]}
          </span>
          <TextInput
            autoFocus={target.isNew && layout === "sheet"}
            aria-label={t("notes.title")}
            value={event.title}
            placeholder={t(`calendar.placeholder.${event.kind}`)}
            onChange={(e) => set({ title: e.target.value })}
            className="py-2.5 text-body font-semibold"
          />
        </div>

        {event.kind === "reminder" && !target.isNew && (
          <div className="flex items-center justify-between rounded-xl bg-fill/50 px-3.5 py-2.5">
            <span className="text-subheadline">{t("calendar.done")}</span>
            <Toggle
              label={t("calendar.done")}
              checked={event.done?.includes(target.day) ?? false}
              onChange={(on) =>
                set({
                  done: on
                    ? [...new Set([...(event.done ?? []), target.day])]
                    : (event.done ?? []).filter((d) => d !== target.day),
                })
              }
            />
          </div>
        )}

        {yearly ? (
          <BirthDate event={event} onChange={set} />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              <Field label={t("calendar.date")}>
                <TextInput
                  type="date"
                  min="0001-01-01"
                  max={`${LAST_YEAR}-12-31`}
                  value={event.date}
                  onChange={(e) => e.target.value && set({ date: e.target.value })}
                />
              </Field>
              {event.kind === "trip" || allDay ? (
                <Field label={t("calendar.endsOn")}>
                  <TextInput
                    type="date"
                    min={event.date}
                    value={event.endDate ?? ""}
                    onChange={(e) => set({ endDate: e.target.value || null })}
                  />
                </Field>
              ) : (
                <Field label={t("calendar.time")}>
                  <TextInput
                    type="time"
                    value={event.time ?? ""}
                    onChange={(e) => e.target.value && set({ time: e.target.value })}
                  />
                </Field>
              )}
            </div>
            {!allDay && event.kind !== "reminder" && event.kind !== "deadline" && (
              <Field label={t("calendar.endTime")}>
                <TextInput
                  type="time"
                  value={timeOf(endMinutes)}
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const end = minutesOf(e.target.value);
                    const start = minutesOf(event.time ?? "09:00");
                    set({ duration: Math.max(5, end > start ? end - start : end + 1440 - start) });
                  }}
                />
              </Field>
            )}
            <div className="flex items-center justify-between rounded-xl bg-fill/50 px-3.5 py-2.5">
              <span className="text-subheadline">{t("calendar.allDay")}</span>
              <Toggle
                label={t("calendar.allDay")}
                checked={allDay}
                onChange={(on) =>
                  set({
                    time: on ? null : (store.draft("plan").time ?? "09:00"),
                    alert: on ? (event.alert === null ? null : 0) : event.alert,
                  })
                }
              />
            </div>
          </>
        )}

        {(event.kind === "plan" || event.kind === "trip") && (
          <Field label={t("calendar.location")}>
            <TextInput
              value={event.location ?? ""}
              placeholder={t("calendar.locationPlaceholder")}
              onChange={(e) => set({ location: e.target.value })}
            />
          </Field>
        )}

        <div className="grid grid-cols-2 gap-2.5">
          {!yearly && (
            <Field label={t("calendar.repeatLabel")}>
              <PickerInput<Repeat>
                label={t("calendar.repeatLabel")}
                value={event.repeat}
                onChange={(repeat) => set({ repeat })}
                options={(Object.keys(repeatLabels) as Repeat[]).map((repeat) => ({
                  value: repeat,
                  label: t(`calendar.repeat.${repeat}`),
                }))}
              />
            </Field>
          )}
          <AlertField
            label={t("calendar.alert")}
            value={event.alert}
            choices={alerts}
            allDay={allDay}
            onChange={(alert) => set({ alert })}
          />
          {(yearly || event.secondAlert != null) && (
            <AlertField
              label={t("calendar.secondAlert")}
              value={event.secondAlert ?? null}
              choices={alerts}
              allDay={allDay}
              onChange={(secondAlert) => set({ secondAlert })}
            />
          )}
        </div>

        {!yearly && event.repeat !== "never" && (
          <Field label={t("calendar.ends")}>
            <TextInput
              type="date"
              value={event.until ?? ""}
              min={event.date}
              onChange={(e) => set({ until: e.target.value || null })}
            />
          </Field>
        )}

        <fieldset className="flex flex-col gap-1.5">
          <legend className="pb-1.5 text-caption font-medium text-label-secondary">
            {t("calendar.color")}
          </legend>
          <div className="flex flex-wrap gap-2">
            {[...new Set([eventColors[event.kind], ...paletteColors])].map((color) => (
              <button
                key={color}
                type="button"
                aria-label={color}
                aria-pressed={event.color === color}
                onClick={() => set({ color })}
                className="size-7 rounded-full ring-offset-2 ring-offset-elevated transition-shadow aria-pressed:ring-2 aria-pressed:ring-label/60"
                style={{ background: color }}
              />
            ))}
          </div>
        </fieldset>

        <Field label={t("calendar.notes")}>
          <TextArea
            rows={3}
            value={event.notes}
            placeholder={
              yearly ? t("calendar.birthdayNotesPlaceholder") : t("calendar.notesPlaceholder")
            }
            onChange={(e) => set({ notes: e.target.value })}
          />
        </Field>
      </form>

      <footer className="flex items-center gap-2 border-t border-separator/60 px-5 py-4 pb-[max(16px,env(safe-area-inset-bottom))]">
        {!target.isNew && (
          <button
            type="button"
            onClick={(e) => remove(e.currentTarget)}
            className="text-subheadline font-medium text-danger"
          >
            {t("common.delete")}
          </button>
        )}
        <span className="grow" />
        <Button variant="secondary" onClick={onClose}>
          {t("common.cancel")}
        </Button>
        <Button variant="primary" type="submit" form={formId}>
          {target.isNew ? t("common.add") : t("common.save")}
        </Button>
      </footer>
    </>
  );
}

function AlertField({
  label,
  value,
  choices,
  allDay,
  onChange,
}: {
  label: string;
  value: number | null;
  choices: Array<{ value: number | null; label: string }>;
  allDay: boolean;
  onChange: (value: number | null) => void;
}) {
  return (
    <Field label={label}>
      <PickerInput
        label={label}
        value={value === null ? "none" : String(value)}
        onChange={(next) => onChange(next === "none" ? null : Number(next))}
        options={[
          ...choices,
          // Keep a value chosen with the other kind of timing.
          ...(choices.some((choice) => choice.value === value)
            ? []
            : [{ value, label: alertLabel(value, allDay) }]),
        ].map((choice) => ({
          value: choice.value === null ? "none" : String(choice.value),
          label: choice.label,
        }))}
      />
    </Field>
  );
}

/**
 * Stands in when only the day and month are known: so early that every
 * year shows it, and a leap year, so 29 February is kept.
 */
const UNKNOWN_YEAR = 4;

/**
 * A birthday's or anniversary's date: the day and month always, the year
 * when it's known. Without a year no age is shown, rather than a wrong one.
 */
function BirthDate({
  event,
  onChange,
}: {
  event: CalendarEvent;
  onChange: (change: Partial<CalendarEvent>) => void;
}) {
  const year = Number(event.date.slice(0, 4));
  const month = Number(event.date.slice(5, 7)) - 1;
  const day = Number(event.date.slice(8, 10));
  const known = event.yearKnown !== false;
  const write = (y: number, m: number, d: number) => onChange({ date: dayInMonth(y, m, d) });
  const [yearText, setYearText] = useState(known ? String(year) : "");

  return (
    <div className="flex flex-col gap-2.5">
      <div className="grid grid-cols-[1.4fr_1fr_1fr] gap-2.5">
        <Field label={t("calendar.birthMonth")}>
          <PickerInput
            label={t("calendar.birthMonth")}
            value={String(month)}
            onChange={(next) => write(year, Number(next), day)}
            options={Array.from({ length: 12 }, (_, m) => ({
              value: String(m),
              label: monthName(m),
            }))}
          />
        </Field>
        <Field label={t("calendar.birthDay")}>
          <PickerInput
            label={t("calendar.birthDay")}
            value={String(day)}
            onChange={(next) => write(year, month, Number(next))}
            options={Array.from(
              { length: daysInMonth(known ? year : UNKNOWN_YEAR, month) },
              (_, d) => ({
                value: String(d + 1),
                label: String(d + 1),
              }),
            )}
          />
        </Field>
        <Field label={t("calendar.birthYear")}>
          <TextInput
            inputMode="numeric"
            disabled={!known}
            value={known ? yearText : ""}
            placeholder={known ? "" : "-"}
            onChange={(e) => {
              const text = e.target.value.replace(/\D/g, "").slice(0, 4);
              setYearText(text);
              const next = Number(text);
              if (text.length === 4 && next >= 1 && next <= LAST_YEAR) write(next, month, day);
            }}
          />
        </Field>
      </div>
      <div className="flex items-center justify-between rounded-xl bg-fill/50 px-3.5 py-2.5">
        <span className="text-subheadline">{t("calendar.yearUnknown")}</span>
        <Toggle
          label={t("calendar.yearUnknown")}
          checked={!known}
          onChange={(unknown) => {
            onChange({
              yearKnown: !unknown,
              date: dayInMonth(unknown ? UNKNOWN_YEAR : year, month, day),
            });
            if (!unknown) setYearText(String(year));
          }}
        />
      </div>
    </div>
  );
}
