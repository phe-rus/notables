import { addDaysTo, localDay, occurrencesBetween } from "@notables/core";
import { t } from "../../../i18n/i18n";
import { describeWhen } from "../../calendar/lib/describe-alert";
import { getCalendarStore } from "../../calendar/store/calendar-store";
import { getLibrary, isListedNote } from "../../library/store/library-store";

/**
 * What home-screen and desktop widgets show, in a small, stable shape the
 * native widget code reads from a file. Words are already in the app's
 * language, so widgets need no translations of their own.
 */
export interface WidgetSnapshot {
  version: 1;
  updatedAt: number;
  language: string;
  labels: { today: string; upNext: string; nothingPlanned: string; pinned: string; recent: string };
  agenda: Array<{ title: string; when: string; color: string; day: string; link: string }>;
  pinned: Array<{ title: string; link: string }>;
  recent: Array<{ title: string; excerpt: string; link: string }>;
}

const AGENDA_DAYS = 7;
const LIMIT = 6;

export function buildWidgetSnapshot(now = new Date()): WidgetSnapshot {
  const today = localDay(now);
  const until = addDaysTo(today, AGENDA_DAYS - 1);
  const agenda = getCalendarStore()
    .getSnapshot()
    .flatMap((event) =>
      occurrencesBetween(event, today, until).map((day) => ({
        event,
        day,
        sort: `${day} ${event.time ?? "00:00"}`,
      })),
    )
    .sort((a, b) => a.sort.localeCompare(b.sort))
    .slice(0, LIMIT)
    .map(({ event, day }) => ({
      title:
        event.kind === "birthday"
          ? t("calendar.birthdayOf", { name: event.title || t("calendar.someone") })
          : event.title || t("common.untitled"),
      when: describeWhen(day, event.time, now),
      color: event.color,
      day,
      link: `notables://calendar?day=${day}`,
    }));

  const notes = getLibrary().getSnapshot().filter(isListedNote);
  const titleOf = (title: string) => title || t("notes.newNote");
  return {
    version: 1,
    updatedAt: now.getTime(),
    language: document.documentElement.lang || "en",
    labels: {
      today: t("dates.today"),
      upNext: t("calendar.comingUp"),
      nothingPlanned: t("calendar.nothingPlanned"),
      pinned: t("nav.pinned"),
      recent: t("widgets.recent"),
    },
    agenda,
    pinned: notes
      .filter((note) => note.pinned)
      .slice(0, LIMIT)
      .map((note) => ({ title: titleOf(note.title), link: `notables://notes/${note.id}` })),
    recent: [...notes]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, LIMIT)
      .map((note) => ({
        title: titleOf(note.title),
        excerpt: note.excerpt,
        link: `notables://notes/${note.id}`,
      })),
  };
}
