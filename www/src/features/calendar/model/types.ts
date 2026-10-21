import type { CalendarEvent, Day } from "@notables/core";
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
  layout?: "gallery" | "list";
  first: number;
  last: number;
  current: number;
  today: Day;
  weekStart: number;
  selected: number;
  onYear: (year: number, anchor: HTMLElement) => void;
};

export type CalendarYearPreviewProps = { year: number; today: Day; weekStart: number };

export type CalendarSourcesSheetProps = {
  open: boolean;
  onClose: () => void;
  events: CalendarEvent[];
  onOpenEvent: (event: CalendarEvent) => void;
};

export type CalendarSearchResultsProps = Pick<CalendarSourcesSheetProps, "events" | "onOpenEvent">;
