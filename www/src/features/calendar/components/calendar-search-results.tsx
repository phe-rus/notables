import { Button } from "@phe-rus/hino/button";
import { t } from "@/i18n/i18n";
import { describeDay } from "../lib/describe-alert";
import { kindIcons } from "../lib/event-display";
import type { CalendarSearchResultsProps } from "../model/types";

export function CalendarSearchResults({ events, onOpenEvent }: CalendarSearchResultsProps) {
  return (
    <div className="scroll-surface min-h-0 grow px-4">
      {events.length ? (
        <div className="overflow-hidden rounded-3xl bg-paper">
          {events.map((event) => (
            <Button
              key={event.id}
              variant="ghost"
              className="h-auto w-full rounded-none border-b border-separator/30 px-4 py-3 text-start last:border-0 [&>span]:min-w-0 [&>span]:w-full [&>span]:justify-start"
              onClick={() => onOpenEvent(event)}
            >
              <span className="text-accent-text">{kindIcons[event.kind]}</span>
              <span className="min-w-0 grow">
                <span className="block truncate text-subheadline">
                  {event.title || t("common.untitled")}
                </span>
                <span className="block text-caption text-label-secondary">
                  {describeDay(event.date)}
                </span>
              </span>
            </Button>
          ))}
        </div>
      ) : (
        <p className="px-4 py-8 text-center text-subheadline text-label-secondary">
          {t("notes.noMatches")}
        </p>
      )}
    </div>
  );
}
