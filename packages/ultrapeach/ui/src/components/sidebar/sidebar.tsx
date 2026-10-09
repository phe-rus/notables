import type { ReactNode } from "react";
import { cn } from "../../lib/class-names";

export function SidebarSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="px-2.5 pb-1.5 text-caption font-semibold text-label-tertiary">{title}</span>
      {children}
    </div>
  );
}

/** Classes for a sidebar row; apply to the app's router link. */
export function sidebarItemClass(active?: boolean): string {
  return cn(
    "group flex items-center gap-2.5 rounded-2xl px-2.5 py-[7px] text-subheadline text-label no-underline transition-colors duration-fast",
    active ? "bg-accent-soft font-medium text-label" : "hover:bg-fill/70",
  );
}

export function SidebarItemContent({
  icon,
  count,
  active,
  children,
}: {
  icon: ReactNode;
  count?: number;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <>
      <span
        className={cn(
          "flex transition-colors",
          active ? "text-accent-text" : "text-label-secondary",
        )}
      >
        {icon}
      </span>
      <span className="grow truncate">{children}</span>
      {count !== undefined && (
        <span
          className={cn(
            "text-footnote tabular-nums",
            active ? "text-accent-text" : "text-label-tertiary",
          )}
        >
          {count}
        </span>
      )}
    </>
  );
}
