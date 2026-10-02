import { addDaysTo, alertsBetween, type DueAlert, localDay } from "@notables/core";
import { toast } from "@notables/ui";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { t } from "../../../i18n/i18n";
import { alertFeedback } from "../lib/alert-feedback";
import { describeAlert } from "../lib/describe-alert";
import { notifyNow, scheduleNatively, schedulesNatively } from "../lib/system-notifications";
import { getCalendarStore, useCalendarEvents } from "../store/calendar-store";

const CHECKED_KEY = "notables:reminders-checked";
const CHECK_EVERY = 15_000;
/** Alerts missed while the app was closed are caught up for this long. */
const CATCH_UP = 24 * 60 * 60 * 1000;
/** How far ahead phones are handed alerts to deliver on their own. */
const SCHEDULE_AHEAD_DAYS = 14;
const SCHEDULE_LIMIT = 48;

function lastChecked(now: number): Date {
  const stored = Number(localStorage.getItem(CHECKED_KEY));
  return new Date(Number.isFinite(stored) && stored > now - CATCH_UP ? stored : now - CATCH_UP);
}

/**
 * Sounds reminders while the app is open: a system notification, a chime,
 * a buzz and a toast. Phones also get the coming alerts scheduled with the
 * system so they arrive when the app is closed.
 */
export function ReminderRunner() {
  const events = useCalendarEvents();
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  useEffect(() => {
    const open = (alert: DueAlert) =>
      void navigateRef.current({ to: "/calendar", search: { day: alert.day } });

    const check = () => {
      const now = Date.now();
      const since = lastChecked(now);
      localStorage.setItem(CHECKED_KEY, String(now));
      const due = alertsBetween(getCalendarStore().getSnapshot(), since, new Date(now));
      if (due.length === 0) return;
      const missed = due.filter((alert) => now - alert.at.getTime() > 2 * CHECK_EVERY);
      const fresh = due.filter((alert) => !missed.includes(alert));
      for (const alert of fresh) {
        const { title, body } = describeAlert(alert);
        toast(title, {
          description: body,
          duration: 12_000,
          action: { label: t("common.open"), onClick: () => open(alert) },
        });
        // Phones already show their own scheduled notification.
        if (!schedulesNatively()) void notifyNow(alert, () => open(alert));
      }
      if (fresh.length > 0) alertFeedback();
      const first = missed[0];
      if (first) {
        toast(
          missed.length === 1
            ? describeAlert(first).title
            : t("reminders.missed", { count: missed.length }),
          {
            description: missed.length === 1 ? t("reminders.whileClosed") : undefined,
            duration: 12_000,
            action: { label: t("common.open"), onClick: () => open(first) },
          },
        );
      }
    };

    check();
    const timer = window.setInterval(check, CHECK_EVERY);
    const onVisible = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  // Keep the phone's own schedule in step with the calendar.
  useEffect(() => {
    if (!schedulesNatively()) return;
    const now = new Date();
    const until = new Date(`${addDaysTo(localDay(now), SCHEDULE_AHEAD_DAYS)}T23:59:59`);
    void scheduleNatively(alertsBetween(events, now, until).slice(0, SCHEDULE_LIMIT));
  }, [events]);

  return null;
}
