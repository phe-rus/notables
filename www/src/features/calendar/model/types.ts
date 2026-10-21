import type { Day } from "@notables/core";
export type CalendarView = "day" | "week" | "month" | "year" | "years";
export type CalendarScreenProps = { day?: Day; view?: CalendarView; onOpenSidebar: () => void };
export type CalendarZoomTitleProps = {
  title: string;
  back?: boolean;
  year: number;
  zoomOut: (() => void) | null;
  onYear: (year: number) => void;
};
export type CalendarYearsProps = {
  first: number;
  last: number;
  current: number;
  today: Day;
  weekStart: number;
  selected: number;
  onYear: (year: number, anchor: HTMLElement) => void;
};

export type CalendarYearPreviewProps = { year: number; today: Day; weekStart: number };
