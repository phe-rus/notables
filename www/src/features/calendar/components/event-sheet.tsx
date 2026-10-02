import {
  type CalendarEvent,
  type CalendarEventKind,
  calendarKindLabels,
  type Repeat,
  repeatLabels,
} from "@notables/core";
import {
  Button,
  CloseIcon,
  IconButton,
  openContextMenu,
  SegmentedControl,
  Sheet,
  Switch,
  toast,
} from "@notables/ui";
import { useState } from "react";
import { Field, SelectInput, TextArea, TextInput } from "../../../components/form/form-fields";
import { t } from "../../../i18n/i18n";
import { permissionState, requestPermission } from "../../../platform/permissions";
import { alertLabel, allDayAlerts, timedAlerts } from "../lib/alert-choices";
import { describeDay } from "../lib/describe-alert";
import { eventColors, getCalendarStore } from "../store/calendar-store";

export interface EventSheetTarget {
  event: CalendarEvent;
  /** The day it was opened from, for removing one day of a repeating event. */
  day: string;
  isNew: boolean;
}

/** Add or change a plan, birthday or reminder. */
export function EventSheet({
  target,
  onClose,
}: {
  target: EventSheetTarget | null;
  onClose: () => void;
}) {
  return (
    <Sheet
      open={target !== null}
      onClose={onClose}
      label={target?.isNew ? t("calendar.newEventTitle") : t("calendar.editEvent")}
      className="max-w-[480px]"
    >
      {target && <EventForm key={target.event.id} target={target} onClose={onClose} />}
    </Sheet>
  );
}

function EventForm({ target, onClose }: { target: EventSheetTarget; onClose: () => void }) {
  const store = getCalendarStore();
  const [event, setEvent] = useState(target.event);
  const set = (change: Partial<CalendarEvent>) => setEvent((e) => ({ ...e, ...change }));
  const birthday = event.kind === "birthday";
  const allDay = event.time === null;
  const alerts = allDay ? allDayAlerts() : timedAlerts();

  const changeKind = (kind: CalendarEventKind) => {
    const fresh = store.draft(kind, event.date);
    set({
      kind,
      color: eventColors[kind],
      repeat: kind === "birthday" ? "yearly" : event.kind === "birthday" ? "never" : event.repeat,
      time: kind === "birthday" ? null : (event.time ?? fresh.time),
      alert: fresh.alert,
    });
  };

  const save = async () => {
    const title = event.title.trim();
    store.save({ ...event, title });
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
    const rect = anchor.getBoundingClientRect();
    openContextMenu(rect.left, rect.top - 96, [
      { label: t("calendar.deleteDay"), onSelect: removeDay },
      { label: t("calendar.deleteEvery"), destructive: true, onSelect: removeAll },
    ]);
  };

  return (
    <>
      <header className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
        <SegmentedControl<CalendarEventKind>
          label={t("calendar.kindLabel")}
          value={event.kind}
          onChange={changeKind}
          options={(["plan", "birthday", "reminder"] as const).map((kind) => ({
            value: kind,
            label: t(`calendar.kind.${kind}`),
          }))}
        />
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
        id="event-form"
      >
        <TextInput
          autoFocus={target.isNew}
          aria-label={t("notes.title")}
          value={event.title}
          placeholder={t(`calendar.placeholder.${event.kind}`)}
          onChange={(e) => set({ title: e.target.value })}
          className="py-2.5 text-[17px] font-semibold"
        />

        <div className="grid grid-cols-2 gap-2.5">
          <Field label={birthday ? t("calendar.bornOn") : t("calendar.date")}>
            <TextInput
              type="date"
              value={event.date}
              onChange={(e) => e.target.value && set({ date: e.target.value })}
            />
          </Field>
          {!birthday && (
            <Field label={t("calendar.time")}>
              <TextInput
                type="time"
                value={event.time ?? ""}
                disabled={allDay}
                onChange={(e) => e.target.value && set({ time: e.target.value })}
              />
            </Field>
          )}
        </div>

        {!birthday && (
          <div className="flex items-center justify-between rounded-[12px] bg-fill/50 px-3.5 py-2.5">
            <span className="text-[14px]">{t("calendar.allDay")}</span>
            <Switch
              label={t("calendar.allDay")}
              checked={allDay}
              onChange={(on) =>
                set({
                  time: on ? null : (store.draft(event.kind).time ?? "09:00"),
                  alert: on ? (event.alert === null ? null : 0) : event.alert,
                })
              }
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-2.5">
          {!birthday && (
            <Field label={t("calendar.repeatLabel")}>
              <SelectInput<Repeat>
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
          <Field label={t("calendar.alert")} className={birthday ? "col-span-2" : undefined}>
            <SelectInput
              label={t("calendar.alert")}
              value={event.alert === null ? "none" : String(event.alert)}
              onChange={(value) => set({ alert: value === "none" ? null : Number(value) })}
              options={[
                ...alerts,
                // Keep a value chosen with the other kind of timing.
                ...(alerts.some((choice) => choice.value === event.alert)
                  ? []
                  : [{ value: event.alert, label: alertLabel(event.alert, allDay) }]),
              ].map((choice) => ({
                value: choice.value === null ? "none" : String(choice.value),
                label: choice.label,
              }))}
            />
          </Field>
        </div>

        {!birthday && event.repeat !== "never" && (
          <Field label={t("calendar.ends")}>
            <TextInput
              type="date"
              value={event.until ?? ""}
              min={event.date}
              onChange={(e) => set({ until: e.target.value || null })}
            />
          </Field>
        )}

        <Field label={t("calendar.notes")}>
          <TextArea
            rows={3}
            value={event.notes}
            placeholder={
              birthday ? t("calendar.birthdayNotesPlaceholder") : t("calendar.notesPlaceholder")
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
            className="text-[14px] font-medium text-danger"
          >
            {t("common.delete")}
          </button>
        )}
        <span className="grow" />
        <Button variant="secondary" onClick={onClose}>
          {t("common.cancel")}
        </Button>
        <Button variant="primary" type="submit" form="event-form">
          {target.isNew ? t("common.add") : t("common.save")}
        </Button>
      </footer>
    </>
  );
}
