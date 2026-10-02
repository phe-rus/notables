import { useEffect } from "react";
import { useCalendarEvents } from "../../calendar/store/calendar-store";
import { useLibrary } from "../../library/store/library-store";
import {
  desktopWidgetWanted,
  publishWidgetSnapshot,
  setDesktopWidget,
  supportsDesktopWidget,
} from "../lib/widget-bridge";

const SETTLE_MS = 2000;
/** "Today" and "Tomorrow" go stale; refresh the words now and then. */
const REFRESH_MS = 15 * 60 * 1000;

/**
 * Keeps widgets current: saves a fresh snapshot shortly after notes or
 * plans change, and brings back the desktop widget if it was showing.
 */
export function WidgetPublisher() {
  const notes = useLibrary();
  const events = useCalendarEvents();

  useEffect(() => {
    const timer = window.setTimeout(() => void publishWidgetSnapshot().catch(() => {}), SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [notes, events]);

  useEffect(() => {
    const timer = window.setInterval(
      () => void publishWidgetSnapshot().catch(() => {}),
      REFRESH_MS,
    );
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (supportsDesktopWidget() && desktopWidgetWanted())
      void setDesktopWidget(true).catch(() => {});
  }, []);

  return null;
}
