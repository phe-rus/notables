import type { Day } from "@notables/core";
import type HolidaysClass from "date-holidays";
import { useEffect, useState, useSyncExternalStore } from "react";
import { currentLanguage } from "../../../i18n/i18n";
import { syncedSetting } from "../../../platform/settings/synced-settings";

/** A public holiday or observance on one day, named in the app's language. */
export interface Holiday {
  day: Day;
  name: string;
  /** Public and bank holidays close things; observances are only marked. */
  closed: boolean;
}

const stored = syncedSetting("notables:holidays");

export interface HolidaySettings {
  /** ISO country code, or null to show none. */
  country: string | null;
  /** Also show observances such as Mother's Day. */
  observances: boolean;
}

/** The region the device is set to: "UG" from "en-UG", or the language's likely one. */
function regionOfDevice(): string | null {
  try {
    const tag = new Intl.Locale(navigator.language);
    return tag.region ?? tag.maximize().region ?? null;
  } catch {
    return null;
  }
}

let settings: HolidaySettings | undefined;
let settingsFrom: unknown;

function readSettings(): HolidaySettings {
  const raw = stored.get() as HolidaySettings | undefined;
  if (settings && raw === settingsFrom) return settings;
  settingsFrom = raw;
  settings = raw ?? { country: regionOfDevice(), observances: false };
  return settings;
}

export function setHolidaySettings(change: Partial<HolidaySettings>) {
  stored.set({ ...readSettings(), ...change });
}

/** Which country's holidays the calendar shows; follows the person to their other devices. */
export function useHolidaySettings(): HolidaySettings {
  return useSyncExternalStore(stored.subscribe, readSettings, () => SERVER_SETTINGS);
}

const SERVER_SETTINGS: HolidaySettings = { country: null, observances: false };

// The rules for every country are large, so they load the first time they're needed.
let library: Promise<typeof HolidaysClass> | undefined;
const load = () => {
  library ??= import("date-holidays").then((module) => module.default);
  return library;
};

const cache = new Map<string, Holiday[]>();

/** A country's holidays in one year: worked out on the device, for any year. */
export async function holidaysIn(country: string, year: number, language: string) {
  const key = `${country}:${year}:${language}`;
  const known = cache.get(key);
  if (known) return known;
  const Holidays = await load();
  const rules = new Holidays(country, { languages: [language, "en"] });
  const found = (rules.getHolidays(year) || []).map((holiday) => ({
    day: holiday.date.slice(0, 10),
    name: holiday.name,
    closed: holiday.type === "public" || holiday.type === "bank",
  }));
  cache.set(key, found);
  return found;
}

/** Every country with holiday rules, named in the app's language, by name. */
export async function holidayCountries(language: string) {
  const Holidays = await load();
  const countries = new Holidays().getCountries(language) ?? {};
  return Object.entries(countries)
    .map(([code, name]) => ({ value: code, label: name }))
    .sort((a, b) => a.label.localeCompare(b.label, language));
}

/** Holidays from `from` to `to` for the chosen country, by day. */
export function useHolidays(from: Day, to: Day): Map<Day, Holiday[]> {
  const { country, observances } = useHolidaySettings();
  const language = currentLanguage();
  const [byDay, setByDay] = useState<Map<Day, Holiday[]>>(EMPTY);

  useEffect(() => {
    if (!country) {
      setByDay(EMPTY);
      return;
    }
    let cancelled = false;
    const first = Number(from.slice(0, 4));
    const last = Number(to.slice(0, 4));
    const years = Array.from({ length: Math.min(12, last - first + 1) }, (_, i) => first + i);
    Promise.all(years.map((year) => holidaysIn(country, year, language)))
      .then((all) => {
        if (cancelled) return;
        const next = new Map<Day, Holiday[]>();
        for (const holiday of all.flat()) {
          if (holiday.day < from || holiday.day > to) continue;
          if (!holiday.closed && !observances) continue;
          next.set(holiday.day, [...(next.get(holiday.day) ?? []), holiday]);
        }
        setByDay(next);
      })
      .catch(() => !cancelled && setByDay(EMPTY));
    return () => {
      cancelled = true;
    };
  }, [country, observances, language, from, to]);

  return byDay;
}

const EMPTY = new Map<Day, Holiday[]>();
