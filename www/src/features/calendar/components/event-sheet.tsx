import { Sheet } from "@ultrapeach/ui";
import { t } from "../../../i18n/i18n";
import { EventForm, type EventTarget } from "./event-form";

/** The event editor as a sheet, on phones and narrow windows. */
export function EventSheet({
  target,
  onClose,
}: {
  target: EventTarget | null;
  onClose: () => void;
}) {
  return (
    <Sheet
      open={target !== null}
      onClose={onClose}
      label={target?.isNew ? t("calendar.newEventTitle") : t("calendar.editEvent")}
      className="max-w-[480px]"
    >
      {target && <EventForm key={target.event.id} target={target} onClose={onClose} />}
    </Sheet>
  );
}
