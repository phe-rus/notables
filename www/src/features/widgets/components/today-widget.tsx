import { cn, PinIcon } from "@notables/ui";
import { useEffect, useMemo, useState } from "react";
import { AppMark } from "../../../components/brand/app-mark";
import { locale, t } from "../../../i18n/i18n";
import { markAppReady } from "../../../platform/app-ready";
import { useCalendarEvents } from "../../calendar/store/calendar-store";
import { useLibrary, useLibraryReady } from "../../library/store/library-store";
import { openFromWidget } from "../lib/widget-bridge";
import { buildWidgetSnapshot } from "../lib/widget-snapshot";

/**
 * The desktop widget: today's plans and pinned notes at a glance, in a
 * small window that floats above other apps. Tap anything to open it.
 */
export function TodayWidget() {
  const ready = useLibraryReady();
  const notes = useLibrary();
  const events = useCalendarEvents();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => markAppReady(), []);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: rebuilt when notes or plans change.
  const snapshot = useMemo(() => buildWidgetSnapshot(now), [notes, events, now]);
  const date = new Intl.DateTimeFormat(locale(), {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(now);
  const path = (link: string) => link.replace(/^notables:\/\//, "/");

  return (
    <main
      data-tauri-drag-region
      className="flex h-dvh flex-col gap-4 overflow-hidden bg-paper px-4 pt-4 pb-3 text-label select-none"
    >
      <header data-tauri-drag-region className="flex items-start justify-between gap-2">
        <div data-tauri-drag-region className="flex flex-col">
          <span className="text-[12px] font-semibold tracking-wide text-accent-text uppercase">
            {t("widgets.today")}
          </span>
          <span className="text-[19px] leading-tight font-bold tracking-tight">{date}</span>
        </div>
        <button
          type="button"
          aria-label={t("widgets.open")}
          onClick={() => void openFromWidget("/")}
          className="shrink-0 rounded-[10px] transition-transform active:scale-95"
        >
          <AppMark size={30} />
        </button>
      </header>

      <section className="flex min-h-0 flex-col gap-1.5" aria-label={snapshot.labels.upNext}>
        <h2 className="text-[12px] font-semibold text-label-tertiary">{snapshot.labels.upNext}</h2>
        {ready && snapshot.agenda.length === 0 && (
          <p className="text-[14px] text-label-secondary">{snapshot.labels.nothingPlanned}</p>
        )}
        <ul className="flex flex-col gap-1">
          {snapshot.agenda.slice(0, 4).map((item) => (
            <li key={`${item.title}-${item.day}-${item.when}`}>
              <button
                type="button"
                onClick={() => void openFromWidget(`/calendar?day=${item.day}`)}
                className="flex w-full items-stretch gap-2.5 rounded-[12px] px-2 py-1.5 text-left transition-colors hover:bg-fill/60"
              >
                <span className="w-1 shrink-0 rounded-full" style={{ background: item.color }} />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-[14px] font-medium">{item.title}</span>
                  <span className="truncate text-[12px] text-label-secondary">{item.when}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {(snapshot.pinned.length > 0 || snapshot.recent.length > 0) && (
        <section className="flex min-h-0 flex-col gap-1.5" aria-label={snapshot.labels.pinned}>
          <h2 className="text-[12px] font-semibold text-label-tertiary">
            {snapshot.pinned.length > 0 ? snapshot.labels.pinned : snapshot.labels.recent}
          </h2>
          <ul className="flex flex-col gap-0.5 overflow-hidden">
            {(snapshot.pinned.length > 0 ? snapshot.pinned : snapshot.recent)
              .slice(0, 4)
              .map((note) => (
                <li key={note.link}>
                  <button
                    type="button"
                    onClick={() => void openFromWidget(path(note.link))}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-[10px] px-2 py-1.5 text-left text-[14px] transition-colors hover:bg-fill/60",
                    )}
                  >
                    {snapshot.pinned.length > 0 && (
                      <PinIcon size={13} className="shrink-0 text-accent-text" />
                    )}
                    <span className="truncate">{note.title}</span>
                  </button>
                </li>
              ))}
          </ul>
        </section>
      )}
    </main>
  );
}
