import { cn, Picker } from "@phe-rus/hino";
import { CompactDatePicker } from "@phe-rus/hino/compact-date-picker";
import { CompactTimePicker } from "@phe-rus/hino/compact-time-picker";
import type { ComponentProps, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { locale, t } from "../../i18n/i18n";

export const fieldClass =
  "w-full min-w-0 rounded-lg control-field px-3 py-2 text-subheadline text-label placeholder:text-label-tertiary";

export function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: the control is passed in as children.
    <label className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <span className="text-caption font-medium text-label-secondary">{label}</span>
      {children}
    </label>
  );
}

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(fieldClass, className)} />;
}

export function TextArea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={2} {...props} className={cn(fieldClass, "resize-none", className)} />;
}

/** A titled group in the editor. */
export function FormSection({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-footnote font-semibold text-label">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** The shared pop-up button, with its search field and empty state in the app's language. */
export function PickerInput<T extends string>(props: ComponentProps<typeof Picker<T>>) {
  return (
    <Picker<T>
      searchPlaceholder={t("common.search")}
      emptyLabel={t("common.noMatches")}
      {...props}
    />
  );
}

const appLocale = () => locale() ?? (typeof navigator === "undefined" ? "en" : navigator.language);

/**
 * A date picked from a month calendar, never the system's date dialog.
 * `value` is `YYYY-MM-DD`; optional dates get a way to remove them.
 */
export function DateField({
  label,
  value,
  onChange,
  min,
  max,
  optional = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  optional?: boolean;
}) {
  return (
    <CompactDatePicker
      label={label}
      value={value}
      onChange={onChange}
      min={min}
      max={max}
      locale={appLocale()}
      placeholder={optional ? t("common.noDate") : undefined}
      labels={{
        previousMonth: t("common.previousMonth"),
        nextMonth: t("common.nextMonth"),
        clear: optional ? t("common.removeDate") : undefined,
      }}
    />
  );
}

/** A time of day (`HH:MM`) from columns of hours and minutes, never the system's dialog. */
export function TimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <CompactTimePicker
      label={label}
      value={value}
      onChange={onChange}
      locale={appLocale()}
      labels={{ hour: t("common.hour"), minute: t("common.minute"), period: t("common.amPm") }}
    />
  );
}
