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
import { permissionState, requestPermission } from "../../../platform/permissions";
import { allDayAlerts, timedAlerts } from "../lib/alert-choices";
import { describeDay } from "../lib/describe-alert";
import { eventColors, getCalendarStore } from "../store/calendar-store";

const titlePlaceholders: Record<CalendarEventKind, string> = {
  plan: "What’s happening?",
  birthday: "Whose birthday?",
  reminder: "Remind me to…",
};

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
      label={target?.isNew ? "New event" : "Edit event"}
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
  const alerts = allDay ? allDayAlerts : timedAlerts;

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
    toast.success(target.isNew ? `${calendarKindLabels[event.kind]} added` : "Saved", {
      description: `${title || "Untitled"} · ${describeDay(event.date)}`,
    });
    // Ask for notifications the first time they would be useful.
    if (event.alert !== null && (await permissionState("notifications")) === "prompt") {
      await requestPermission("notifications");
    }
  };

  const removeDay = () => {
    store.skip(event.id, target.day);
    onClose();
    toast("Removed from this day", {
      action: {
        label: "Undo",
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
    toast("Deleted", {
      description: removed?.title || undefined,
      action: removed ? { label: "Undo", onClick: () => store.save(removed) } : undefined,
    });
  };

  const remove = (anchor: HTMLElement) => {
    // A repeating event can lose one day or all of them.
    if (target.event.repeat === "never") return removeAll();
    const rect = anchor.getBoundingClientRect();
    openContextMenu(rect.left, rect.top - 96, [
      { label: "Delete this day only", onSelect: removeDay },
      { label: "Delete every time", destructive: true, onSelect: removeAll },
    ]);
  };

  return (
    <>
      <header className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
        <SegmentedControl<CalendarEventKind>
          label="Kind"
          value={event.kind}
          onChange={changeKind}
          options={(["plan", "birthday", "reminder"] as const).map((kind) => ({
            value: kind,
            label: calendarKindLabels[kind],
          }))}
        />
        <IconButton label="Close" onClick={onClose}>
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
          aria-label="Title"
          value={event.title}
          placeholder={titlePlaceholders[event.kind]}
          onChange={(e) => set({ title: e.target.value })}
          className="py-2.5 text-[17px] font-semibold"
        />

        <div className="grid grid-cols-2 gap-2.5">
          <Field label={birthday ? "Born on" : "Date"}>
            <TextInput
              type="date"
              value={event.date}
              onChange={(e) => e.target.value && set({ date: e.target.value })}
            />
          </Field>
          {!birthday && (
            <Field label="Time">
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
            <span className="text-[14px]">All day</span>
            <Switch
              label="All day"
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
            <Field label="Repeat">
              <SelectInput
                aria-label="Repeat"
                value={event.repeat}
                onChange={(e) => set({ repeat: e.target.value as Repeat })}
              >
                {(Object.keys(repeatLabels) as Repeat[]).map((repeat) => (
                  <option key={repeat} value={repeat}>
                    {repeatLabels[repeat]}
                  </option>
                ))}
              </SelectInput>
            </Field>
          )}
          <Field label="Alert" className={birthday ? "col-span-2" : undefined}>
            <SelectInput
              aria-label="Alert"
              value={event.alert === null ? "none" : String(event.alert)}
              onChange={(e) =>
                set({ alert: e.target.value === "none" ? null : Number(e.target.value) })
              }
            >
              {[
                ...alerts,
                // Keep a value chosen with the other kind of timing.
                ...(alerts.some((choice) => choice.value === event.alert)
                  ? []
                  : [{ value: event.alert, label: `${event.alert} minutes before` }]),
              ].map((choice) => (
                <option
                  key={String(choice.value)}
                  value={choice.value === null ? "none" : choice.value}
                >
                  {choice.label}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>

        {!birthday && event.repeat !== "never" && (
          <Field label="Ends">
            <TextInput
              type="date"
              value={event.until ?? ""}
              min={event.date}
              onChange={(e) => set({ until: e.target.value || null })}
            />
          </Field>
        )}

        <Field label="Notes">
          <TextArea
            rows={3}
            value={event.notes}
            placeholder={birthday ? "Gift ideas, how to reach them" : "Where, who, what to bring"}
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
            Delete
          </button>
        )}
        <span className="grow" />
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" form="event-form">
          {target.isNew ? "Add" : "Save"}
        </Button>
      </footer>
    </>
  );
}
