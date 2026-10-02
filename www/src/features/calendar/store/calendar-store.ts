import {
  addDaysTo,
  type CalendarEvent,
  type CalendarEventKind,
  createId,
  daysBetween,
  isYearlyKind,
  localDay,
} from "@notables/core";
import { useSyncExternalStore } from "react";
import type * as Y from "yjs";
import { getLibrary } from "../../library/store/library-store";

export const eventColors: Record<CalendarEventKind, string> = {
  plan: "#2C6193",
  reminder: "#E39A2E",
  birthday: "#B4405A",
  anniversary: "#8A4FB0",
  deadline: "#C2412D",
  trip: "#2E8A6E",
};

/** Colours anyone can give an event, beside its kind's own. */
export const paletteColors = [
  "#2C6193",
  "#2E8A6E",
  "#E39A2E",
  "#C2412D",
  "#B4405A",
  "#8A4FB0",
  "#5B6470",
];

/**
 * Plans, birthdays and reminders live in the library document beside
 * notes, books and invoices, so they sync and back up together.
 */
class CalendarStore {
  readonly events: Y.Map<CalendarEvent>;
  #snapshot: CalendarEvent[] = [];
  #listeners = new Set<() => void>();

  constructor(doc: Y.Doc) {
    this.events = doc.getMap<CalendarEvent>("calendar");
    this.events.observe(() => this.#refresh());
    this.#refresh();
  }

  #refresh() {
    this.#snapshot = [...this.events.values()].sort((a, b) =>
      `${a.date}${a.time ?? ""}`.localeCompare(`${b.date}${b.time ?? ""}`),
    );
    for (const listener of this.#listeners) listener();
  }

  subscribe = (listener: () => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };

  getSnapshot = () => this.#snapshot;

  /** A new, unsaved event with sensible defaults for its kind, optionally at a time. */
  draft(kind: CalendarEventKind, date = localDay(), time?: string | null): CalendarEvent {
    const now = Date.now();
    const yearly = isYearlyKind(kind);
    const allDay = yearly || kind === "trip";
    return {
      id: createId(now),
      kind,
      title: "",
      date,
      time: allDay ? null : time === undefined ? nextHalfHour() : time,
      duration: 60,
      repeat: yearly ? "yearly" : "never",
      until: null,
      alert:
        yearly || kind === "reminder"
          ? 0
          : kind === "trip"
            ? null
            : kind === "deadline"
              ? 1440
              : 15,
      notes: "",
      color: eventColors[kind],
      skipped: [],
      createdAt: now,
      updatedAt: now,
    };
  }

  save(event: CalendarEvent) {
    this.events.set(event.id, { ...event, updatedAt: Date.now() });
  }

  /** Removes one day of a repeating event, keeping the rest. */
  skip(id: string, day: string) {
    const event = this.events.get(id);
    if (!event) return;
    this.save({ ...event, skipped: [...new Set([...event.skipped, day])] });
  }

  /** Ticks a reminder's occurrence on a day off, or back on. */
  toggleDone(id: string, day: string) {
    const event = this.events.get(id);
    if (!event) return;
    const done = event.done ?? [];
    this.save({
      ...event,
      done: done.includes(day) ? done.filter((d) => d !== day) : [...done, day],
    });
  }

  /** Moves one occurrence's start; the whole event moves, as in Apple's calendar for one-offs. */
  move(id: string, date: string, time: string | null, duration?: number) {
    const event = this.events.get(id);
    if (!event) return;
    const shift = event.endDate ? daysBetween(event.date, date) : 0;
    this.save({
      ...event,
      date,
      time: event.time === null ? null : time,
      ...(duration ? { duration } : {}),
      ...(event.endDate ? { endDate: addDaysTo(event.endDate, shift) } : {}),
    });
  }

  remove(id: string): CalendarEvent | undefined {
    const event = this.events.get(id);
    this.events.delete(id);
    return event;
  }
}

function nextHalfHour(): string {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const next = Math.min(Math.ceil((minutes + 1) / 30) * 30, 23 * 60 + 30);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(Math.floor(next / 60))}:${pad(next % 60)}`;
}

let instance: CalendarStore | undefined;

export function getCalendarStore(): CalendarStore {
  instance ??= new CalendarStore(getLibrary().doc);
  return instance;
}

const EMPTY: CalendarEvent[] = [];

export function useCalendarEvents(): CalendarEvent[] {
  const store = getCalendarStore();
  return useSyncExternalStore(store.subscribe, store.getSnapshot, () => EMPTY);
}
