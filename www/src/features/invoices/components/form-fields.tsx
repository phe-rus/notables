import { cn } from "@notables/ui";
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

export const fieldClass =
  "w-full min-w-0 rounded-[10px] bg-fill px-3 py-2 text-[14px] text-label outline-none transition-shadow placeholder:text-label-tertiary focus:ring-2 focus:ring-accent/60";

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
