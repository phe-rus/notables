import {
  addDaysTo,
  type CalendarEventKind,
  type Day,
  dayInMonth,
  type Repeat,
  weekday,
} from "@notables/core";

/** What a typed line like "Lunch with Ana Friday 1pm" asks for. */
export interface QuickEvent {
  title: string;
  kind: CalendarEventKind;
  date: Day;
  /** HH:MM, or null for all day. */
  time: string | null;
  /** Minutes. */
  duration: number;
  repeat: Repeat;
  /** Last day, for something that runs over several days. */
  endDate: Day | null;
}

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];
const weekdayPattern = "(sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)(?:day|nesday|rsday|urday)?";
const monthPattern =
  "(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)(?:uary|ruary|ch|il|e|y|ust|tember|ober|ember)?";

const pad = (value: number) => String(value).padStart(2, "0");
const weekdayIndex = (word: string) =>
  WEEKDAYS.findIndex((day) => day.startsWith(word.slice(0, 3)));
const monthIndex = (word: string) =>
  MONTHS.findIndex((month) => month.startsWith(word.slice(0, 3)));

/** The next given weekday from today, today included unless skipping this week's. */
function upcoming(today: Day, target: number, skipThisWeek = false): Day {
  let ahead = (target - weekday(today) + 7) % 7;
  if (skipThisWeek) ahead += 7;
  return addDaysTo(today, ahead);
}

/** "5" means 5 PM and "9" means 9 AM, as people say them. */
function guessHour(hour: number, meridiem: string | undefined): number {
  if (meridiem === "pm" && hour < 12) return hour + 12;
  if (meridiem === "am" && hour === 12) return 0;
  if (meridiem) return hour;
  return hour >= 1 && hour <= 6 ? hour + 12 : hour;
}

/** That month and day this year, or next year once it has passed. */
function nextDate(today: Day, month: number, date: number): Day {
  const year = Number(today.slice(0, 4));
  const thisYear = dayInMonth(year, month, date);
  return thisYear >= today ? thisYear : dayInMonth(year + 1, month, date);
}

/**
 * Reads an event out of one line of English: a day ("tomorrow", "Friday",
 * "next Tue", "Oct 12", "in 3 days"), a time ("1pm", "at 9:30", "noon"),
 * how long ("for 2h", "for 3 days"), a repeat ("every week") and a kind
 * ("remind me to…", "Ana's birthday"). Whatever is left is the title.
 */
export function parseQuickEvent(input: string, today: Day): QuickEvent {
  let text = ` ${input.trim().replace(/\s+/g, " ")} `;
  const take = (pattern: RegExp): RegExpMatchArray | null => {
    const match = text.match(pattern);
    if (match) text = text.replace(match[0], " ");
    return match;
  };

  let kind: CalendarEventKind = "plan";
  if (take(/ remind me(?: to)? /i)) kind = "reminder";
  else if (/\bbirthday\b/i.test(text)) kind = "birthday";
  else if (/\banniversary\b/i.test(text)) kind = "anniversary";
  else if (/\b(deadline|due)\b/i.test(text)) kind = "deadline";
  else if (/\b(trip|flight|holiday|vacation)\b/i.test(text)) kind = "trip";

  let repeat: Repeat = kind === "birthday" || kind === "anniversary" ? "yearly" : "never";
  let date: Day | null = null;
  const every = take(new RegExp(` every ${weekdayPattern}\\b`, "i"));
  if (every?.[1]) {
    repeat = "weekly";
    date = upcoming(today, weekdayIndex(every[1].toLowerCase()));
  } else if (take(/ (every weekday|weekdays|on weekdays) /i)) repeat = "weekdays";
  else if (take(/ (every (2|two|other) weeks?|fortnightly|biweekly) /i)) repeat = "fortnightly";
  else if (take(/ (every day|daily) /i)) repeat = "daily";
  else if (take(/ (every week|weekly) /i)) repeat = "weekly";
  else if (take(/ (every month|monthly) /i)) repeat = "monthly";
  else if (take(/ (every year|yearly|annually) /i)) repeat = "yearly";

  let time: string | null = null;
  let duration = 60;
  /** Days it runs over, from "for 3 days". */
  let span = 0;

  // A range first: "9-11am", "from 2pm to 4pm".
  const range = take(
    / (?:from )?(\d{1,2})(?::(\d{2}))? ?(am|pm)? ?(?:-|to|until) ?(\d{1,2})(?::(\d{2}))? ?(am|pm)\b/i,
  );
  if (range) {
    const endMeridiem = range[6]?.toLowerCase();
    const end = guessHour(Number(range[4]), endMeridiem) * 60 + Number(range[5] ?? 0);
    let startHour = guessHour(Number(range[1]), range[3]?.toLowerCase() ?? endMeridiem);
    if (startHour * 60 > end) startHour -= 12;
    const start = startHour * 60 + Number(range[2] ?? 0);
    time = `${pad(Math.floor(start / 60))}:${pad(start % 60)}`;
    duration = Math.max(15, end - start);
  } else {
    const named = take(/ (?:at )?(noon|midday|midnight) /i);
    const clock = named
      ? null
      : (take(/ (?:at )?(\d{1,2})(?::(\d{2}))? ?(am|pm)\b/i) ??
        take(/ (?:at )?(\d{1,2}):(\d{2}) /i) ??
        take(/ at (\d{1,2}) /i));
    if (named?.[1]) time = named[1].toLowerCase() === "midnight" ? "00:00" : "12:00";
    else if (clock?.[1]) {
      const hour = Number(clock[1]);
      const minutes = Number(clock[2] ?? 0);
      const twentyFour = clock[2] !== undefined && !clock[3] && hour > 12;
      const h = twentyFour || hour === 0 ? hour : guessHour(hour, clock[3]?.toLowerCase());
      if (h < 24 && minutes < 60) time = `${pad(h)}:${pad(minutes)}`;
    } else if (take(/ tonight /i)) {
      date = today;
      time = "20:00";
    }
  }

  const length = take(/ for (\d+(?:\.\d+)?) ?(h|hrs?|hours?|m|mins?|minutes?|d|days?|w|weeks?)\b/i);
  if (length?.[1] && length[2]) {
    const amount = Number(length[1]);
    const unit = length[2].toLowerCase();
    if (unit.startsWith("h")) duration = Math.round(amount * 60);
    else if (unit.startsWith("m")) duration = Math.round(amount);
    else span = Math.round(amount * (unit.startsWith("w") ? 7 : 1));
  }

  if (!date) {
    const iso = take(/ (\d{4})-(\d{2})-(\d{2}) /);
    const inDays = take(/ in (\d+) (days?|weeks?) /i);
    const monthFirst = take(
      new RegExp(` (?:on )?${monthPattern}\\.? (\\d{1,2})(?:st|nd|rd|th)?\\b`, "i"),
    );
    const dayFirst = monthFirst
      ? null
      : take(
          new RegExp(
            ` (?:on )?(?:the )?(\\d{1,2})(?:st|nd|rd|th)? (?:of )?${monthPattern}\\b`,
            "i",
          ),
        );
    const next = take(new RegExp(` next ${weekdayPattern}\\b`, "i"));
    const plain = next ? null : take(new RegExp(` (?:on |this )?${weekdayPattern}\\b`, "i"));
    if (iso) date = `${iso[1]}-${iso[2]}-${iso[3]}`;
    else if (take(/ (the )?day after tomorrow /i)) date = addDaysTo(today, 2);
    else if (take(/ (tomorrow|tmrw|tmr) /i)) date = addDaysTo(today, 1);
    else if (take(/ today /i)) date = today;
    else if (inDays?.[1] && inDays[2])
      date = addDaysTo(today, Number(inDays[1]) * (inDays[2].startsWith("w") ? 7 : 1));
    else if (monthFirst?.[1] && monthFirst[2])
      date = nextDate(today, monthIndex(monthFirst[1].toLowerCase()), Number(monthFirst[2]));
    else if (dayFirst?.[1] && dayFirst[2])
      date = nextDate(today, monthIndex(dayFirst[2].toLowerCase()), Number(dayFirst[1]));
    else if (next?.[1]) {
      const target = weekdayIndex(next[1].toLowerCase());
      // "Next Friday" skips this week's, unless this week's has already passed.
      date = upcoming(today, target, target >= weekday(today));
    } else if (plain?.[1]) date = upcoming(today, weekdayIndex(plain[1].toLowerCase()));
  }
  const start = date ?? today;

  // Words that only joined the parts read: "Lunch on" loses "on".
  const title = text
    .replace(/ (on|at|for|from|to|the|in|this)(?= *$)/gi, " ")
    .replace(/^ *(on|at) /i, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[,.;-]+$/, "")
    .trim();

  return {
    title: kind === "birthday" ? title.replace(/(['’]s)? birthday/i, "").trim() : title,
    kind,
    date: start,
    time: kind === "birthday" || kind === "anniversary" || span > 0 ? null : time,
    duration,
    repeat,
    endDate: span > 1 ? addDaysTo(start, span - 1) : null,
  };
}
