import type { ReactNode } from "react";
import { cn } from "../../lib/class-names";

export function SidebarSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="px-2.5 pb-1.5 text-[12px] font-semibold text-label-tertiary">{title}</span>
      {children}
    </div>
  );
}

/** Classes for a sidebar row; apply to the app's router link. */
export function sidebarItemClass(active?: boolean): string {
  return cn(
    "group flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[14px] text-label no-underline transition-colors duration-fast",
    active ? "bg-accent font-medium text-on-accent" : "hover:bg-fill",
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
      <span className={cn("flex", active ? "text-on-accent" : "text-accent-text")}>{icon}</span>
      <span className="grow truncate">{children}</span>
      {count !== undefined && (
        <span className={cn("text-[13px]", active ? "text-on-accent" : "text-label-tertiary")}>
          {count}
        </span>
      )}
    </>
  );
}
