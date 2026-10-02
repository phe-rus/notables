import { cn } from "@notables/ui";
import type { ReactNode } from "react";

/** A titled, inset card of settings rows. */
export function SettingsGroup({
  title,
  footer,
  children,
}: {
  title: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="px-4 text-[13px] font-medium text-label-tertiary">{title}</h2>
      <div className="flex flex-col divide-y divide-separator/60 overflow-hidden rounded-[16px] border border-separator/60 bg-elevated">
        {children}
      </div>
      {footer && <p className="px-4 text-[12px] leading-snug text-label-tertiary">{footer}</p>}
    </section>
  );
}

export function SettingsRow({
  label,
  description,
  children,
  stacked,
}: {
  label: string;
  description?: string;
  children: ReactNode;
  /** Put the control under the label, for wide controls. */
  stacked?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex gap-4 px-4 py-3",
        stacked ? "flex-col items-stretch" : "items-center justify-between",
      )}
    >
      <div className="flex min-w-0 flex-col">
        <span className="text-[15px] text-label">{label}</span>
        {description && (
          <span className="text-[13px] leading-snug text-label-secondary">{description}</span>
        )}
      </div>
      <div className={cn("flex shrink-0", stacked && "w-full")}>{children}</div>
    </div>
  );
}
