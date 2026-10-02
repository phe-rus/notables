import { cn, Select } from "@notables/ui";
import type { ComponentProps, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { t } from "../../i18n/i18n";

export const fieldClass =
  "w-full min-w-0 rounded-[10px] control-field px-3 py-2 text-[14px] text-label placeholder:text-label-tertiary";

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
      <span className="text-[12px] font-medium text-label-secondary">{label}</span>
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
        <h2 className="text-[13px] font-semibold text-label">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** The shared pop-up button, with its search field and empty state in the app's language. */
export function SelectInput<T extends string>(props: ComponentProps<typeof Select<T>>) {
  return (
    <Select<T>
      searchPlaceholder={t("common.search")}
      emptyLabel={t("common.noMatches")}
      {...props}
    />
  );
}
