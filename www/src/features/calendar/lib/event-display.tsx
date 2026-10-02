import { ageOn, type CalendarEvent, type CalendarEventKind, type Day } from "@notables/core";
import {
  AlarmIcon,
  BirthdayIcon,
  CalendarIcon,
  HeartIcon,
  LocationIcon,
  WarningIcon,
} from "@notables/ui";
import type { ReactNode } from "react";
import { t } from "../../../i18n/i18n";

export const kindIcons: Record<CalendarEventKind, ReactNode> = {
  plan: <CalendarIcon size={14} />,
  reminder: <AlarmIcon size={14} />,
  birthday: <BirthdayIcon size={14} />,
  anniversary: <HeartIcon size={14} />,
  deadline: <WarningIcon size={14} />,
  trip: <LocationIcon size={14} />,
};

/** What an occurrence is called: "Ana’s birthday", "Ana & Sam · 10 years", or its title. */
export function eventTitle(event: CalendarEvent, day?: Day): string {
  const name = event.title.trim();
  if (event.kind === "birthday") {
    return t("calendar.birthdayOf", { name: name || t("calendar.someone") });
  }
  if (event.kind === "anniversary" && day) {
    const years = ageOn({ ...event, kind: "birthday" }, day);
    const title = name || t("calendar.kind.anniversary");
    return years ? `${title} · ${t("calendar.years", { count: years })}` : title;
  }
  return name || t("common.untitled");
}

/** Minutes from midnight for "HH:MM". */
export const minutesOf = (time: string): number => {
  const [hours = 0, minutes = 0] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

/** "HH:MM" for minutes from midnight, kept within the day. */
export const timeOf = (minutes: number): string => {
  const clamped = Math.max(0, Math.min(23 * 60 + 45, Math.round(minutes)));
  return `${String(Math.floor(clamped / 60)).padStart(2, "0")}:${String(clamped % 60).padStart(2, "0")}`;
};
