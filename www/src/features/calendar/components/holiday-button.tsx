import { GlobeIcon, Popover, Toggle, useDismiss } from "@phe-rus/hino";
import { IconButton } from "@phe-rus/hino/icon-button";
import { useCallback, useEffect, useRef, useState } from "react";
import { Field, PickerInput } from "@/components/form/form-fields";
import {
  holidayCountries,
  setHolidaySettings,
  useHolidaySettings,
} from "@/features/calendar/lib/holidays";
import { t } from "@/i18n/i18n";

export function HolidayButton() {
  const settings = useHolidaySettings();
  const [open, setOpen] = useState(false);
  const [countries, setCountries] = useState<{ value: string; label: string }[]>([]);
  const root = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(root, open, close);
  useEffect(() => {
    if (open && countries.length === 0) {
      void holidayCountries(document.documentElement.lang || "en").then(setCountries);
    }
  }, [open, countries.length]);
  return (
    <div ref={root} className="relative">
      <IconButton
        size="icon-sm"
        label={t("calendar.holidays")}
        variant={settings.country ? "link" : "ghost"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <GlobeIcon size={18} />
      </IconButton>
      <Popover
        open={open}
        role="dialog"
        aria-label={t("calendar.holidays")}
        origin="top-right"
        className="top-[calc(100%+8px)] end-0 flex w-[300px] max-w-[calc(100vw-32px)] flex-col gap-3 p-4"
      >
        <Field label={t("calendar.holidayCountry")}>
          <PickerInput
            label={t("calendar.holidayCountry")}
            value={settings.country ?? "none"}
            searchable
            onChange={(country) =>
              setHolidaySettings({ country: country === "none" ? null : country })
            }
            options={[
              { value: "none", label: t("calendar.noHolidays") },
              ...(countries.length > 0
                ? countries
                : settings.country
                  ? [{ value: settings.country, label: settings.country }]
                  : []),
            ]}
          />
        </Field>
        <div className="flex items-center justify-between gap-3">
          <span className="text-subheadline">{t("calendar.observances")}</span>
          <Toggle
            label={t("calendar.observances")}
            checked={settings.observances}
            onChange={(observances) => setHolidaySettings({ observances })}
          />
        </div>
      </Popover>
    </div>
  );
}
