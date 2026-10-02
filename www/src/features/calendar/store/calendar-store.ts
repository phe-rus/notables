import { type CalendarEvent, type CalendarEventKind, createId, localDay } from "@notables/core";
import { useSyncExternalStore } from "react";
import type * as Y from "yjs";
import { getLibrary } from "../../library/store/library-store";

export const eventColors: Record<CalendarEventKind, string> = {
  plan: "#2C6193",
  birthday: "#B4405A",
  reminder: "#E39A2E",
};

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

  /** A new, unsaved event with sensible defaults for its kind. */
  draft(kind: CalendarEventKind, date = localDay()): CalendarEvent {
    const now = Date.now();
    return {
      id: createId(now),
      kind,
      title: "",
      date,
      time: kind === "birthday" ? null : nextHalfHour(),
      duration: 60,
      repeat: kind === "birthday" ? "yearly" : "never",
      until: null,
      alert: kind === "birthday" ? 0 : kind === "reminder" ? 0 : 15,
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
